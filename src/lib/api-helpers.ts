import { auth } from "@/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";

export async function getCompanyId(): Promise<string> {
  // Try to get from session first
  try {
    const session = await auth();
    if (session?.user && (session.user as any).companyId) {
      return (session.user as any).companyId;
    }
  } catch {
    // Session check failed, fall through to DB lookup
  }

  // Fallback: get first company from database
  const [company] = await db.select({ id: companies.id }).from(companies).limit(1);
  if (!company) {
    throw new Error("No company found in database");
  }
  return company.id;
}
