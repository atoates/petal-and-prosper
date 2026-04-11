import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import {
  users,
  companies,
  priceSettings,
  proposalSettings,
  invoiceSettings,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// We validate with a server-side schema rather than reusing the
// signup form schema: the form schema has confirmPassword, which we
// never want on the API contract.
const signupBodySchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long"),
  companyName: z.string().trim().min(1, "Company name is required").max(200),
});

export async function POST(request: NextRequest) {
  // Per-IP rate limit: 5 signup attempts per 10 minutes. This is the
  // cheap first line of defence before we add email verification.
  const ipLimit = rateLimit(request, "signup", {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  const ipDenied = rateLimitResponse(ipLimit);
  if (ipDenied) return ipDenied;

  try {
    const raw = await request.json().catch(() => null);
    const parsed = signupBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid signup details",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const { firstName, lastName, email, password, companyName } = parsed.data;

    // Extra per-email limit so the same address can't be hammered from
    // rotating IPs. Same window, tighter limit.
    const emailLimit = rateLimit(request, "signup:email", {
      limit: 3,
      windowMs: 10 * 60 * 1000,
      key: `email:${email}`,
    });
    const emailDenied = rateLimitResponse(emailLimit);
    if (emailDenied) return emailDenied;

    // Case-insensitive lookup: emails are unique regardless of casing.
    const existingUser = await db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${email}`,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const [company] = await db
      .insert(companies)
      .values({
        id: randomUUID(),
        name: companyName,
      })
      .returning();

    // Seed the per-company settings rows so the wizard's PUT calls
    // and the settings page have something to UPDATE. Without these,
    // the first-run user would get 404s trying to configure pricing,
    // proposals or invoices. Defaults mirror the schema defaults.
    await db.insert(priceSettings).values({
      id: randomUUID(),
      companyId: company.id,
    });
    await db.insert(proposalSettings).values({
      id: randomUUID(),
      companyId: company.id,
    });
    await db.insert(invoiceSettings).values({
      id: randomUUID(),
      companyId: company.id,
    });

    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        firstName,
        lastName,
        email,
        password: hashedPassword,
        companyId: company.id,
        role: "admin",
      })
      .returning();

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Log the message only -- full error objects can include SQL and
    // parameter values.
    console.error(
      "Signup error:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
