/**
 * Server-side Anthropic utility module
 * Provides PDF scanning and delivery schedule suggestion functions
 */

import Anthropic from "@anthropic-ai/sdk";

// Hard ceilings so an upstream stall can't hang a route handler.
// PDF scans are the slow path; 60s covers a multi-page invoice with
// comfortable headroom while still short enough to fail a user
// request rather than pile up connections. Retry once on network
// blips -- the SDK already backs off exponentially between attempts.
const ANTHROPIC_TIMEOUT_MS = 60_000;
const ANTHROPIC_MAX_RETRIES = 1;

const getClient = () => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({
    apiKey: key,
    timeout: ANTHROPIC_TIMEOUT_MS,
    maxRetries: ANTHROPIC_MAX_RETRIES,
  });
};

export interface ExtractedLineItem {
  description: string;
  category?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ExtractedInvoice {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  items: ExtractedLineItem[];
  rawText?: string;
}

/**
 * Extracts structured invoice data from a PDF using Claude's vision capabilities
 * @param pdfBase64 - Base64-encoded PDF content
 * @returns Structured invoice data
 */
export async function extractInvoiceFromPdf(pdfBase64: string): Promise<ExtractedInvoice> {
  const client = getClient();

  const extractionPrompt = `You are an invoice processing assistant. Extract all relevant information from this PDF invoice and return it as a valid JSON object.

Extract the following information:
- supplierName: Company name of the supplier/vendor
- invoiceNumber: Invoice reference number
- invoiceDate: Invoice date (ISO format if possible)
- dueDate: Payment due date (ISO format if possible)
- subtotal: Subtotal amount (numeric)
- vat: VAT/Tax amount (numeric)
- total: Total invoice amount (numeric)
- items: Array of line items, each with:
  - description: Item description
  - category: Category if available (e.g., "Flowers", "Supplies")
  - quantity: Quantity ordered
  - unitPrice: Price per unit (numeric)
  - totalPrice: Line item total (numeric)

Return ONLY valid JSON, no markdown formatting, no explanations.
If any field is not found, omit it from the JSON.
The items array should always be present, even if empty.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[Anthropic] Could not extract JSON from invoice response");
      return {
        items: [],
        rawText: responseText,
      };
    }

    const extractedData = JSON.parse(jsonMatch[0]) as Partial<ExtractedInvoice>;

    // Ensure items array exists
    return {
      supplierName: extractedData.supplierName,
      invoiceNumber: extractedData.invoiceNumber,
      invoiceDate: extractedData.invoiceDate,
      dueDate: extractedData.dueDate,
      subtotal: extractedData.subtotal,
      vat: extractedData.vat,
      total: extractedData.total,
      items: extractedData.items || [],
      rawText: responseText,
    };
  } catch (error) {
    console.error("[Anthropic] extractInvoiceFromPdf error:", error);
    throw error;
  }
}

/**
 * Suggests an optimal delivery schedule based on addresses and time windows
 * @param deliveries - Array of delivery locations with optional time windows
 * @returns Text suggestion for optimal delivery order
 */
export async function suggestDeliverySchedule(
  deliveries: Array<{
    address: string;
    clientName: string;
    timeWindow?: string;
  }>
): Promise<string> {
  const client = getClient();

  const deliveryList = deliveries
    .map(
      (d, i) =>
        `${i + 1}. ${d.clientName} - ${d.address}${d.timeWindow ? ` (${d.timeWindow})` : ""}`
    )
    .join("\n");

  const prompt = `You are a delivery route optimisation assistant for a floral business.

Based on the following delivery locations and any time constraints, suggest an optimal delivery order. Consider:
- Geographic proximity to minimise travel distance
- Time windows that must be met
- Logical routing that reduces backtracking
- Any special notes about client preferences

Delivery Locations:
${deliveryList}

Provide your suggestion as a clear, numbered list showing the recommended delivery order with brief reasoning for the sequence. Be concise and practical.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    return responseText;
  } catch (error) {
    console.error("[Anthropic] suggestDeliverySchedule error:", error);
    throw error;
  }
}
