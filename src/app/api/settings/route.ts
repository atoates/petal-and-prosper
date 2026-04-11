import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  companies,
  priceSettings,
  proposalSettings,
  invoiceSettings,
  addresses,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  requirePermissionApi,
  requireSessionApi,
} from "@/lib/auth/permissions-api";
import { roleCan } from "@/lib/auth/permissions";
import {
  parseJsonBody,
  settingsBulkUpdateSchema,
} from "@/lib/validators/api";

export async function GET(_request: NextRequest) {
  // Settings read covers company profile, pricing, templates. All roles can
  // read all three, so requiring any one (company:read) is sufficient.
  const gate = await requirePermissionApi("company:read");
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  try {
    const companyData = await db.query.companies.findFirst({
      where: eq(companies.id, ctx.companyId),
    });

    const priceSettingsData = await db.query.priceSettings.findFirst({
      where: eq(priceSettings.companyId, ctx.companyId),
    });

    const proposalSettingsData = await db.query.proposalSettings.findFirst({
      where: eq(proposalSettings.companyId, ctx.companyId),
    });

    const invoiceSettingsData = await db.query.invoiceSettings.findFirst({
      where: eq(invoiceSettings.companyId, ctx.companyId),
    });

    const addressesData = await db.query.addresses.findMany({
      where: eq(addresses.companyId, ctx.companyId),
    });

    const result = {
      company: companyData,
      priceSettings: priceSettingsData,
      proposalSettings: proposalSettingsData,
      invoiceSettings: invoiceSettingsData,
      addresses: addressesData,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching settings:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // This endpoint can touch company profile (admin-only) AND pricing /
  // templates (admin+manager), so the outer gate is "must be signed in"
  // and each sub-section is checked individually.
  const gate = await requireSessionApi();
  if ("response" in gate) return gate.response;
  const { ctx } = gate;

  const parsed = await parseJsonBody(request, settingsBulkUpdateSchema);
  if (!parsed.success) return parsed.response;
  const {
    company,
    priceSettings: priceSettingsData,
    proposalSettings: proposalSettingsData,
    invoiceSettings: invoiceSettingsData,
  } = parsed.data;

  try {
    if (company && !roleCan(ctx.role, "company:update")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    if (priceSettingsData && !roleCan(ctx.role, "pricing:update")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    if (
      (proposalSettingsData || invoiceSettingsData) &&
      !roleCan(ctx.role, "templates:update")
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (company) {
      await db
        .update(companies)
        .set({
          name: company.name ?? undefined,
          registrationNo: company.registrationNo ?? undefined,
          contactNo: company.contactNo ?? undefined,
          email: company.email ?? undefined,
          currency: company.currency ?? undefined,
          logoUrl: company.logoUrl ?? undefined,
          website: company.website ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, ctx.companyId));
    }

    if (priceSettingsData) {
      await db
        .update(priceSettings)
        .set({
          multiple: priceSettingsData.multiple ?? undefined,
          flowerBuffer: priceSettingsData.flowerBuffer ?? undefined,
          fuelCostPerLitre:
            priceSettingsData.fuelCostPerLitre ?? undefined,
          milesPerGallon:
            priceSettingsData.milesPerGallon ?? undefined,
          staffCostPerHour:
            priceSettingsData.staffCostPerHour ?? undefined,
          staffMargin: priceSettingsData.staffMargin ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(priceSettings.companyId, ctx.companyId));
    }

    if (proposalSettingsData) {
      await db
        .update(proposalSettings)
        .set({
          headerText: proposalSettingsData.headerText ?? undefined,
          footerText: proposalSettingsData.footerText ?? undefined,
          termsAndConditions:
            proposalSettingsData.termsAndConditions ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(proposalSettings.companyId, ctx.companyId));
    }

    if (invoiceSettingsData) {
      await db
        .update(invoiceSettings)
        .set({
          paymentTerms: invoiceSettingsData.paymentTerms ?? undefined,
          bankDetails: invoiceSettingsData.bankDetails ?? undefined,
          notes: invoiceSettingsData.notes ?? undefined,
          defaultVatRate:
            invoiceSettingsData.defaultVatRate ?? undefined,
          vatNumber: invoiceSettingsData.vatNumber ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(invoiceSettings.companyId, ctx.companyId));
    }

    const result = {
      company: company
        ? await db.query.companies.findFirst({
            where: eq(companies.id, ctx.companyId),
          })
        : undefined,
      priceSettings: priceSettingsData
        ? await db.query.priceSettings.findFirst({
            where: eq(priceSettings.companyId, ctx.companyId),
          })
        : undefined,
      proposalSettings: proposalSettingsData
        ? await db.query.proposalSettings.findFirst({
            where: eq(proposalSettings.companyId, ctx.companyId),
          })
        : undefined,
      invoiceSettings: invoiceSettingsData
        ? await db.query.invoiceSettings.findFirst({
            where: eq(invoiceSettings.companyId, ctx.companyId),
          })
        : undefined,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error updating settings:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
