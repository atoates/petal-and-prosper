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
import { getCompanyId } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const companyData = await db.query.companies.findFirst({
      where: eq(companies.id, COMPANY_ID),
    });

    const priceSettingsData = await db.query.priceSettings.findFirst({
      where: eq(priceSettings.companyId, COMPANY_ID),
    });

    const proposalSettingsData = await db.query.proposalSettings.findFirst({
      where: eq(proposalSettings.companyId, COMPANY_ID),
    });

    const invoiceSettingsData = await db.query.invoiceSettings.findFirst({
      where: eq(invoiceSettings.companyId, COMPANY_ID),
    });

    const addressesData = await db.query.addresses.findMany({
      where: eq(addresses.companyId, COMPANY_ID),
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
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const COMPANY_ID = await getCompanyId();
    const body = await request.json();

    const {
      company,
      priceSettings: priceSettingsData,
      proposalSettings: proposalSettingsData,
      invoiceSettings: invoiceSettingsData,
    } = body;

    if (company) {
      await db
        .update(companies)
        .set({
          name: company.name,
          registrationNo: company.registrationNo,
          contactNo: company.contactNo,
          email: company.email,
          currency: company.currency,
          logoUrl: company.logoUrl,
          website: company.website,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, COMPANY_ID));
    }

    if (priceSettingsData) {
      await db
        .update(priceSettings)
        .set({
          multiple: priceSettingsData.multiple
            ? parseFloat(priceSettingsData.multiple).toString()
            : undefined,
          flowerBuffer: priceSettingsData.flowerBuffer
            ? parseFloat(priceSettingsData.flowerBuffer).toString()
            : undefined,
          fuelCostPerLitre: priceSettingsData.fuelCostPerLitre
            ? parseFloat(priceSettingsData.fuelCostPerLitre).toString()
            : undefined,
          milesPerGallon: priceSettingsData.milesPerGallon
            ? parseInt(priceSettingsData.milesPerGallon)
            : undefined,
          staffCostPerHour: priceSettingsData.staffCostPerHour
            ? parseFloat(priceSettingsData.staffCostPerHour).toString()
            : undefined,
          staffMargin: priceSettingsData.staffMargin
            ? parseFloat(priceSettingsData.staffMargin).toString()
            : undefined,
          updatedAt: new Date(),
        })
        .where(eq(priceSettings.companyId, COMPANY_ID));
    }

    if (proposalSettingsData) {
      await db
        .update(proposalSettings)
        .set({
          headerText: proposalSettingsData.headerText,
          footerText: proposalSettingsData.footerText,
          termsAndConditions:
            proposalSettingsData.termsAndConditions,
          updatedAt: new Date(),
        })
        .where(eq(proposalSettings.companyId, COMPANY_ID));
    }

    if (invoiceSettingsData) {
      await db
        .update(invoiceSettings)
        .set({
          paymentTerms: invoiceSettingsData.paymentTerms,
          bankDetails: invoiceSettingsData.bankDetails,
          notes: invoiceSettingsData.notes,
          updatedAt: new Date(),
        })
        .where(eq(invoiceSettings.companyId, COMPANY_ID));
    }

    const result = {
      company: company
        ? await db.query.companies.findFirst({
            where: eq(companies.id, COMPANY_ID),
          })
        : undefined,
      priceSettings: priceSettingsData
        ? await db.query.priceSettings.findFirst({
            where: eq(priceSettings.companyId, COMPANY_ID),
          })
        : undefined,
      proposalSettings: proposalSettingsData
        ? await db.query.proposalSettings.findFirst({
            where: eq(proposalSettings.companyId, COMPANY_ID),
          })
        : undefined,
      invoiceSettings: invoiceSettingsData
        ? await db.query.invoiceSettings.findFirst({
            where: eq(invoiceSettings.companyId, COMPANY_ID),
          })
        : undefined,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
