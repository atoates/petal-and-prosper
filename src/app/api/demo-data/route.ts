import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  enquiries,
  orders,
  orderItems,
  proposals,
  invoices,
  wholesaleOrders,
  productionSchedules,
  deliverySchedules,
  products,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const COMPANY_ID = "1";

// GET: Check demo data status (count records)
export async function GET(_request: NextRequest) {
  try {
    const [enqCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(enquiries)
      .where(eq(enquiries.companyId, COMPANY_ID));
    const [ordCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.companyId, COMPANY_ID));
    const [invCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.companyId, COMPANY_ID));
    const [propCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(proposals)
      .where(eq(proposals.companyId, COMPANY_ID));
    const [wsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(wholesaleOrders)
      .where(eq(wholesaleOrders.companyId, COMPANY_ID));
    const [prodCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productionSchedules)
      .where(eq(productionSchedules.companyId, COMPANY_ID));
    const [delCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deliverySchedules)
      .where(eq(deliverySchedules.companyId, COMPANY_ID));
    const [prodLibCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.companyId, COMPANY_ID));

    return NextResponse.json({
      enquiries: Number(enqCount.count),
      orders: Number(ordCount.count),
      invoices: Number(invCount.count),
      proposals: Number(propCount.count),
      wholesaleOrders: Number(wsCount.count),
      productionSchedules: Number(prodCount.count),
      deliverySchedules: Number(delCount.count),
      products: Number(prodLibCount.count),
      hasData:
        Number(enqCount.count) > 0 ||
        Number(ordCount.count) > 0 ||
        Number(prodLibCount.count) > 0,
    });
  } catch (error) {
    console.error("Error checking demo data:", error);
    return NextResponse.json(
      { error: "Failed to check demo data status" },
      { status: 500 }
    );
  }
}

// POST: Seed demo data or clear data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "clear") {
      return await clearDemoData();
    } else if (action === "seed") {
      return await seedDemoData();
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'seed' or 'clear'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error managing demo data:", error);
    return NextResponse.json(
      { error: "Failed to manage demo data" },
      { status: 500 }
    );
  }
}

async function clearDemoData() {
  // Delete in dependency order (children first)
  await db.delete(deliverySchedules).where(eq(deliverySchedules.companyId, COMPANY_ID));
  await db.delete(productionSchedules).where(eq(productionSchedules.companyId, COMPANY_ID));
  await db.delete(wholesaleOrders).where(eq(wholesaleOrders.companyId, COMPANY_ID));
  await db.delete(invoices).where(eq(invoices.companyId, COMPANY_ID));
  await db.delete(proposals).where(eq(proposals.companyId, COMPANY_ID));

  // Get all order IDs for this company first
  const companyOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.companyId, COMPANY_ID));

  for (const order of companyOrders) {
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  }

  await db.delete(orders).where(eq(orders.companyId, COMPANY_ID));
  await db.delete(enquiries).where(eq(enquiries.companyId, COMPANY_ID));
  await db.delete(products).where(eq(products.companyId, COMPANY_ID));

  return NextResponse.json({
    success: true,
    message: "All demo data has been cleared. Settings and account remain intact.",
  });
}

async function seedDemoData() {
  // First clear existing transactional data
  await clearDemoData();

  // --- PRODUCTS (67 items) ---
  const productData = [
    // Flowers
    { name: "Garden Roses - White", category: "flower" as const, subcategory: "Rose", wholesalePrice: "2.80", retailPrice: "7.00", unit: "stem", colour: "White", season: "Spring/Summer", supplier: "Dutch Flower Group" },
    { name: "Garden Roses - Blush", category: "flower" as const, subcategory: "Rose", wholesalePrice: "3.00", retailPrice: "7.50", unit: "stem", colour: "Blush Pink", season: "Spring/Summer", supplier: "Dutch Flower Group" },
    { name: "Garden Roses - Red", category: "flower" as const, subcategory: "Rose", wholesalePrice: "2.80", retailPrice: "7.00", unit: "stem", colour: "Red", season: "All Year", supplier: "Dutch Flower Group" },
    { name: "Standard Roses - Avalanche", category: "flower" as const, subcategory: "Rose", wholesalePrice: "1.50", retailPrice: "3.75", unit: "stem", colour: "White", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Standard Roses - Sweet Avalanche", category: "flower" as const, subcategory: "Rose", wholesalePrice: "1.60", retailPrice: "4.00", unit: "stem", colour: "Blush Pink", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Spray Roses - White", category: "flower" as const, subcategory: "Rose", wholesalePrice: "2.20", retailPrice: "5.50", unit: "stem", colour: "White", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Spray Roses - Peach", category: "flower" as const, subcategory: "Rose", wholesalePrice: "2.40", retailPrice: "6.00", unit: "stem", colour: "Peach", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Peonies - Sarah Bernhardt", category: "flower" as const, subcategory: "Peony", wholesalePrice: "4.50", retailPrice: "11.25", unit: "stem", colour: "Pink", season: "May-June", supplier: "Dutch Flower Group" },
    { name: "Peonies - Duchesse de Nemours", category: "flower" as const, subcategory: "Peony", wholesalePrice: "4.80", retailPrice: "12.00", unit: "stem", colour: "White", season: "May-June", supplier: "Dutch Flower Group" },
    { name: "Peonies - Coral Charm", category: "flower" as const, subcategory: "Peony", wholesalePrice: "5.20", retailPrice: "13.00", unit: "stem", colour: "Coral", season: "May-June", supplier: "Dutch Flower Group" },
    { name: "Ranunculus - White", category: "flower" as const, subcategory: "Ranunculus", wholesalePrice: "2.00", retailPrice: "5.00", unit: "stem", colour: "White", season: "Spring", supplier: "Zest Flowers" },
    { name: "Ranunculus - Pink", category: "flower" as const, subcategory: "Ranunculus", wholesalePrice: "2.00", retailPrice: "5.00", unit: "stem", colour: "Pink", season: "Spring", supplier: "Zest Flowers" },
    { name: "Hydrangea - White", category: "flower" as const, subcategory: "Hydrangea", wholesalePrice: "4.00", retailPrice: "10.00", unit: "stem", colour: "White", season: "Summer/Autumn", supplier: "Dutch Flower Group" },
    { name: "Hydrangea - Blue", category: "flower" as const, subcategory: "Hydrangea", wholesalePrice: "4.20", retailPrice: "10.50", unit: "stem", colour: "Blue", season: "Summer/Autumn", supplier: "Dutch Flower Group" },
    { name: "Hydrangea - Antique Green", category: "flower" as const, subcategory: "Hydrangea", wholesalePrice: "4.50", retailPrice: "11.25", unit: "stem", colour: "Green", season: "Autumn", supplier: "Dutch Flower Group" },
    { name: "Tulips - White", category: "flower" as const, subcategory: "Tulip", wholesalePrice: "0.80", retailPrice: "2.00", unit: "stem", colour: "White", season: "Spring", supplier: "Triangle Nursery" },
    { name: "Tulips - Parrot", category: "flower" as const, subcategory: "Tulip", wholesalePrice: "1.20", retailPrice: "3.00", unit: "stem", colour: "Mixed", season: "Spring", supplier: "Triangle Nursery" },
    { name: "Lisianthus - White", category: "flower" as const, subcategory: "Lisianthus", wholesalePrice: "2.50", retailPrice: "6.25", unit: "stem", colour: "White", season: "Summer", supplier: "Zest Flowers" },
    { name: "Lisianthus - Champagne", category: "flower" as const, subcategory: "Lisianthus", wholesalePrice: "2.50", retailPrice: "6.25", unit: "stem", colour: "Champagne", season: "Summer", supplier: "Zest Flowers" },
    { name: "Sweet Peas - Mixed Pastel", category: "flower" as const, subcategory: "Sweet Pea", wholesalePrice: "3.50", retailPrice: "8.75", unit: "bunch", colour: "Mixed Pastel", season: "Spring/Summer", supplier: "Zest Flowers" },
    { name: "Sweet Peas - White", category: "flower" as const, subcategory: "Sweet Pea", wholesalePrice: "3.50", retailPrice: "8.75", unit: "bunch", colour: "White", season: "Spring/Summer", supplier: "Zest Flowers" },
    { name: "Dahlias - Cafe au Lait", category: "flower" as const, subcategory: "Dahlia", wholesalePrice: "3.00", retailPrice: "7.50", unit: "stem", colour: "Blush/Cream", season: "Summer/Autumn", supplier: "Dutch Flower Group" },
    { name: "Dahlias - Burgundy", category: "flower" as const, subcategory: "Dahlia", wholesalePrice: "2.80", retailPrice: "7.00", unit: "stem", colour: "Burgundy", season: "Summer/Autumn", supplier: "Dutch Flower Group" },
    { name: "Anemones - White", category: "flower" as const, subcategory: "Anemone", wholesalePrice: "1.80", retailPrice: "4.50", unit: "stem", colour: "White", season: "Winter/Spring", supplier: "Triangle Nursery" },
    { name: "Anemones - Bordeaux", category: "flower" as const, subcategory: "Anemone", wholesalePrice: "1.80", retailPrice: "4.50", unit: "stem", colour: "Bordeaux", season: "Winter/Spring", supplier: "Triangle Nursery" },
    { name: "Stocks - White", category: "flower" as const, subcategory: "Stock", wholesalePrice: "1.80", retailPrice: "4.50", unit: "stem", colour: "White", season: "Spring/Summer", supplier: "Triangle Nursery" },
    { name: "Stocks - Champagne", category: "flower" as const, subcategory: "Stock", wholesalePrice: "1.80", retailPrice: "4.50", unit: "stem", colour: "Champagne", season: "Spring/Summer", supplier: "Triangle Nursery" },
    { name: "Freesia - White", category: "flower" as const, subcategory: "Freesia", wholesalePrice: "1.20", retailPrice: "3.00", unit: "bunch", colour: "White", season: "Spring", supplier: "Zest Flowers" },
    { name: "Freesia - Yellow", category: "flower" as const, subcategory: "Freesia", wholesalePrice: "1.20", retailPrice: "3.00", unit: "bunch", colour: "Yellow", season: "Spring", supplier: "Zest Flowers" },
    { name: "Gypsophila", category: "flower" as const, subcategory: "Gypsophila", wholesalePrice: "3.50", retailPrice: "8.75", unit: "bunch", colour: "White", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Waxflower - White", category: "flower" as const, subcategory: "Waxflower", wholesalePrice: "2.80", retailPrice: "7.00", unit: "bunch", colour: "White", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Astilbe - Blush", category: "flower" as const, subcategory: "Astilbe", wholesalePrice: "2.50", retailPrice: "6.25", unit: "stem", colour: "Blush Pink", season: "Summer", supplier: "Zest Flowers" },
    { name: "Delphinium - Blue", category: "flower" as const, subcategory: "Delphinium", wholesalePrice: "2.80", retailPrice: "7.00", unit: "stem", colour: "Blue", season: "Summer", supplier: "Dutch Flower Group" },
    { name: "Delphinium - White", category: "flower" as const, subcategory: "Delphinium", wholesalePrice: "2.80", retailPrice: "7.00", unit: "stem", colour: "White", season: "Summer", supplier: "Dutch Flower Group" },
    { name: "Orchid - Phalaenopsis White", category: "flower" as const, subcategory: "Orchid", wholesalePrice: "4.50", retailPrice: "11.25", unit: "stem", colour: "White", season: "All Year", supplier: "Dutch Flower Group" },
    { name: "Carnation - White", category: "flower" as const, subcategory: "Carnation", wholesalePrice: "0.60", retailPrice: "1.50", unit: "stem", colour: "White", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Chrysanthemum - Green Kermit", category: "flower" as const, subcategory: "Chrysanthemum", wholesalePrice: "1.00", retailPrice: "2.50", unit: "stem", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Lily - Casa Blanca", category: "flower" as const, subcategory: "Lily", wholesalePrice: "3.50", retailPrice: "8.75", unit: "stem", colour: "White", season: "All Year", supplier: "Dutch Flower Group" },
    { name: "Snapdragon - White", category: "flower" as const, subcategory: "Snapdragon", wholesalePrice: "1.80", retailPrice: "4.50", unit: "stem", colour: "White", season: "Summer", supplier: "Zest Flowers" },
    { name: "Scabiosa - Blush", category: "flower" as const, subcategory: "Scabiosa", wholesalePrice: "2.20", retailPrice: "5.50", unit: "stem", colour: "Blush Pink", season: "Summer", supplier: "Zest Flowers" },
    // Foliage
    { name: "Eucalyptus - Silver Dollar", category: "foliage" as const, subcategory: "Eucalyptus", wholesalePrice: "2.50", retailPrice: "6.25", unit: "bunch", colour: "Green/Silver", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Eucalyptus - Seeded", category: "foliage" as const, subcategory: "Eucalyptus", wholesalePrice: "2.80", retailPrice: "7.00", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Eucalyptus - Parvifolia", category: "foliage" as const, subcategory: "Eucalyptus", wholesalePrice: "2.50", retailPrice: "6.25", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Ruscus - Italian", category: "foliage" as const, subcategory: "Ruscus", wholesalePrice: "1.50", retailPrice: "3.75", unit: "bunch", colour: "Dark Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Ruscus - Soft", category: "foliage" as const, subcategory: "Ruscus", wholesalePrice: "1.80", retailPrice: "4.50", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Pittosporum", category: "foliage" as const, subcategory: "Pittosporum", wholesalePrice: "2.00", retailPrice: "5.00", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Asparagus Fern", category: "foliage" as const, subcategory: "Fern", wholesalePrice: "1.80", retailPrice: "4.50", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Ivy Trails", category: "foliage" as const, subcategory: "Ivy", wholesalePrice: "1.50", retailPrice: "3.75", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Olive Branch", category: "foliage" as const, subcategory: "Olive", wholesalePrice: "3.00", retailPrice: "7.50", unit: "stem", colour: "Grey/Green", season: "All Year", supplier: "Dutch Flower Group" },
    { name: "Rosemary", category: "foliage" as const, subcategory: "Herb", wholesalePrice: "1.20", retailPrice: "3.00", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Salal Tips", category: "foliage" as const, subcategory: "Salal", wholesalePrice: "2.00", retailPrice: "5.00", unit: "bunch", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Dusty Miller", category: "foliage" as const, subcategory: "Dusty Miller", wholesalePrice: "1.80", retailPrice: "4.50", unit: "bunch", colour: "Silver/Grey", season: "Summer", supplier: "Zest Flowers" },
    { name: "Viburnum Berries", category: "foliage" as const, subcategory: "Berry", wholesalePrice: "3.50", retailPrice: "8.75", unit: "stem", colour: "Green/Red", season: "Autumn/Winter", supplier: "Dutch Flower Group" },
    { name: "Hypericum - Green", category: "foliage" as const, subcategory: "Berry", wholesalePrice: "2.00", retailPrice: "5.00", unit: "stem", colour: "Green", season: "All Year", supplier: "Triangle Nursery" },
    { name: "Hypericum - Red", category: "foliage" as const, subcategory: "Berry", wholesalePrice: "2.00", retailPrice: "5.00", unit: "stem", colour: "Red", season: "All Year", supplier: "Triangle Nursery" },
    // Sundries
    { name: "Oasis Floral Foam - Brick", category: "sundry" as const, subcategory: "Oasis", wholesalePrice: "1.50", retailPrice: "3.75", unit: "each", colour: null, season: null, supplier: "Smithers Oasis" },
    { name: "Oasis Floral Foam - Sphere", category: "sundry" as const, subcategory: "Oasis", wholesalePrice: "3.50", retailPrice: "8.75", unit: "each", colour: null, season: null, supplier: "Smithers Oasis" },
    { name: "Floral Wire 0.7mm", category: "sundry" as const, subcategory: "Wire", wholesalePrice: "3.00", retailPrice: "7.50", unit: "pack", colour: null, season: null, supplier: "Smithers Oasis" },
    { name: "Floral Tape - Green", category: "sundry" as const, subcategory: "Tape", wholesalePrice: "1.50", retailPrice: "3.75", unit: "roll", colour: "Green", season: null, supplier: "Smithers Oasis" },
    { name: "Pearl Pins", category: "sundry" as const, subcategory: "Pins", wholesalePrice: "2.50", retailPrice: "6.25", unit: "pack", colour: "White", season: null, supplier: "Smithers Oasis" },
    { name: "Cellophane - Clear", category: "sundry" as const, subcategory: "Wrapping", wholesalePrice: "4.00", retailPrice: "10.00", unit: "roll", colour: "Clear", season: null, supplier: "Smithers Oasis" },
    { name: "Tissue Paper - White", category: "sundry" as const, subcategory: "Wrapping", wholesalePrice: "2.00", retailPrice: "5.00", unit: "pack", colour: "White", season: null, supplier: "Smithers Oasis" },
    // Containers
    { name: "Fish Bowl Vase - Small", category: "container" as const, subcategory: "Vase", wholesalePrice: "4.00", retailPrice: "10.00", unit: "each", colour: "Clear", season: null, supplier: "Smithers Oasis" },
    { name: "Fish Bowl Vase - Large", category: "container" as const, subcategory: "Vase", wholesalePrice: "6.00", retailPrice: "15.00", unit: "each", colour: "Clear", season: null, supplier: "Smithers Oasis" },
    { name: "Cylinder Vase 30cm", category: "container" as const, subcategory: "Vase", wholesalePrice: "5.00", retailPrice: "12.50", unit: "each", colour: "Clear", season: null, supplier: "Smithers Oasis" },
    { name: "Bud Vase", category: "container" as const, subcategory: "Vase", wholesalePrice: "1.50", retailPrice: "3.75", unit: "each", colour: "Clear", season: null, supplier: "Smithers Oasis" },
    { name: "Stone Urn - Large", category: "container" as const, subcategory: "Urn", wholesalePrice: "12.00", retailPrice: "30.00", unit: "each", colour: "Stone", season: null, supplier: "Smithers Oasis" },
    { name: "Wooden Crate - Rustic", category: "container" as const, subcategory: "Crate", wholesalePrice: "5.00", retailPrice: "12.50", unit: "each", colour: "Natural Wood", season: null, supplier: "Smithers Oasis" },
    // Ribbons
    { name: "Satin Ribbon - Ivory 25mm", category: "ribbon" as const, subcategory: "Satin", wholesalePrice: "3.50", retailPrice: "8.75", unit: "roll", colour: "Ivory", season: null, supplier: "Smithers Oasis" },
    { name: "Organza Ribbon - White 38mm", category: "ribbon" as const, subcategory: "Organza", wholesalePrice: "4.00", retailPrice: "10.00", unit: "roll", colour: "White", season: null, supplier: "Smithers Oasis" },
    { name: "Hessian Ribbon - Natural 50mm", category: "ribbon" as const, subcategory: "Hessian", wholesalePrice: "3.00", retailPrice: "7.50", unit: "roll", colour: "Natural", season: null, supplier: "Smithers Oasis" },
    { name: "Velvet Ribbon - Burgundy 25mm", category: "ribbon" as const, subcategory: "Velvet", wholesalePrice: "5.00", retailPrice: "12.50", unit: "roll", colour: "Burgundy", season: null, supplier: "Smithers Oasis" },
    { name: "Satin Ribbon - Blush 15mm", category: "ribbon" as const, subcategory: "Satin", wholesalePrice: "2.50", retailPrice: "6.25", unit: "roll", colour: "Blush Pink", season: null, supplier: "Smithers Oasis" },
  ];

  const productIds: string[] = [];
  for (const p of productData) {
    const [row] = await db
      .insert(products)
      .values({
        id: randomUUID(),
        companyId: COMPANY_ID,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        wholesalePrice: p.wholesalePrice,
        retailPrice: p.retailPrice,
        unit: p.unit,
        colour: p.colour,
        season: p.season,
        supplier: p.supplier,
        isActive: "true",
      })
      .returning({ id: products.id });
    productIds.push(row.id);
  }

  // --- ENQUIRIES (15) ---
  const enquiryData = [
    { clientName: "Sarah & James Henderson", clientEmail: "sarah.henderson@email.co.uk", clientPhone: "07912 345 678", eventType: "Wedding", eventDate: "2026-06-15", venueA: "Chelsea Old Town Hall", venueB: "The Ivy Chelsea Garden", progress: "Live" as const, notes: "Romantic garden-style with blush and ivory palette. Bride wants lots of peonies and garden roses." },
    { clientName: "Michael Brown", clientEmail: "michael.b@corpevent.co.uk", clientPhone: "020 7946 0958", eventType: "Corporate", eventDate: "2026-04-10", venueA: "One Canada Square, Canary Wharf", venueB: null, progress: "TBD" as const, notes: "Annual awards ceremony. Elegant centrepieces for 20 round tables. Company colours: navy and gold." },
    { clientName: "Elizabeth Wilson", clientEmail: "ewilson@email.co.uk", clientPhone: "07834 567 890", eventType: "Sympathy", eventDate: "2026-04-05", venueA: "St Mary Abbots Church, Kensington", venueB: null, progress: "Done" as const, notes: "White lily wreath and standing spray. Family wishes for classic, understated arrangements." },
    { clientName: "James & Emma Cooper", clientEmail: "emma.cooper@gmail.com", clientPhone: "07756 234 567", eventType: "Wedding", eventDate: "2026-07-20", venueA: "Richmond Park, Pembroke Lodge", venueB: null, progress: "New" as const, notes: "Outdoor summer wedding, wildflower-inspired. Budget conscious but wants impact." },
    { clientName: "Alexandra Chen", clientEmail: "alex.chen@email.co.uk", clientPhone: "07891 456 789", eventType: "Birthday", eventDate: "2026-05-22", venueA: "The Berkeley, Knightsbridge", venueB: null, progress: "Live" as const, notes: "40th birthday dinner party for 30 guests. Dramatic, opulent style with deep red dahlias and burgundy tones." },
    { clientName: "David & Sophie Taylor", clientEmail: "sophie.taylor@outlook.com", clientPhone: "07923 678 901", eventType: "Wedding", eventDate: "2026-08-12", venueA: "Hampton Court Palace", venueB: "Hampton Court Palace Orangery", progress: "Placed" as const, notes: "Grand wedding for 180 guests. Formal English garden aesthetic. Budget approx £8,000." },
    { clientName: "Rachel Green", clientEmail: "rachel.green@email.co.uk", clientPhone: "07812 345 901", eventType: "Baby Shower", eventDate: "2026-05-08", venueA: "Claridge's, Mayfair", venueB: null, progress: "Live" as const, notes: "Gender neutral theme. Soft yellows and creams with eucalyptus. Balloon arch with floral garland." },
    { clientName: "Thompson & Partners LLP", clientEmail: "events@thompsonllp.co.uk", clientPhone: "020 7123 4567", eventType: "Corporate", eventDate: "2026-06-03", venueA: "The Shard, Level 31", venueB: null, progress: "Order" as const, notes: "Client entertainment dinner. 5 large statement arrangements for the space. Modern, architectural style." },
    { clientName: "Charlotte & Oliver Marsh", clientEmail: "charlotte.marsh@gmail.com", clientPhone: "07945 890 123", eventType: "Wedding", eventDate: "2026-09-19", venueA: "Kew Gardens Temperate House", venueB: "Kew Gardens Nash Conservatory", progress: "TBD" as const, notes: "Autumn wedding with seasonal foliage, berries, and warm tones. Very keen on dahlias." },
    { clientName: "Margaret Harrington", clientEmail: "m.harrington@email.co.uk", clientPhone: "07867 123 456", eventType: "Anniversary", eventDate: "2026-04-28", venueA: "Savoy Hotel, River Room", venueB: null, progress: "Done" as const, notes: "Golden wedding anniversary. Elegant gold and white arrangements. 50th anniversary cake flowers." },
    { clientName: "Lucy Patel", clientEmail: "lucy.patel@email.co.uk", clientPhone: "07901 234 567", eventType: "Engagement Party", eventDate: "2026-05-15", venueA: "Shoreditch House", venueB: null, progress: "New" as const, notes: "Trendy East London vibe. Dried flowers mixed with fresh, neutral palette. Pampas grass requested." },
    { clientName: "William & Grace Foster", clientEmail: "grace.foster@email.co.uk", clientPhone: "07934 567 890", eventType: "Wedding", eventDate: "2026-10-03", venueA: "St Paul's Cathedral", venueB: "Guildhall, City of London", progress: "New" as const, notes: "Formal city wedding. Grand church arrangements needed. White and green only. 200 guests at reception." },
    { clientName: "Bright Horizons Academy", clientEmail: "admin@brighthorizons.sch.uk", clientPhone: "020 7890 1234", eventType: "Prom", eventDate: "2026-07-04", venueA: "Natural History Museum", venueB: null, progress: "TBD" as const, notes: "Year 11 leavers prom. Table flowers for 25 tables. Budget: £1,500 maximum. Fun, colourful style." },
    { clientName: "Jonathan & Kate Murray", clientEmail: "kate.murray@email.co.uk", clientPhone: "07878 901 234", eventType: "Wedding", eventDate: "2026-12-18", venueA: "Claridge's, Ballroom", venueB: null, progress: "Live" as const, notes: "Winter wedding. Festive touches but elegant. Lots of candles and warm lighting. Red and green palette." },
    { clientName: "Dr Priya Sharma", clientEmail: "p.sharma@email.co.uk", clientPhone: "07845 012 345", eventType: "Birthday", eventDate: "2026-06-30", venueA: "Sketch, Mayfair", venueB: null, progress: "New" as const, notes: "50th birthday celebration. Pink-themed to match venue. Instagram-worthy floral installations." },
  ];

  const enquiryIds: string[] = [];
  for (const e of enquiryData) {
    const [row] = await db
      .insert(enquiries)
      .values({
        id: randomUUID(),
        companyId: COMPANY_ID,
        clientName: e.clientName,
        clientEmail: e.clientEmail,
        clientPhone: e.clientPhone,
        eventType: e.eventType,
        eventDate: new Date(e.eventDate),
        venueA: e.venueA,
        venueB: e.venueB,
        progress: e.progress,
        notes: e.notes,
      })
      .returning({ id: enquiries.id });
    enquiryIds.push(row.id);
  }

  // --- ORDERS (10) ---
  const orderData = [
    { enquiryIdx: 0, version: 1, status: "confirmed" as const, totalPrice: "3850.00" },
    { enquiryIdx: 1, version: 1, status: "quote" as const, totalPrice: "1420.00" },
    { enquiryIdx: 2, version: 1, status: "completed" as const, totalPrice: "620.00" },
    { enquiryIdx: 4, version: 1, status: "confirmed" as const, totalPrice: "1890.00" },
    { enquiryIdx: 5, version: 2, status: "confirmed" as const, totalPrice: "5450.00" },
    { enquiryIdx: 6, version: 1, status: "quote" as const, totalPrice: "780.00" },
    { enquiryIdx: 7, version: 1, status: "confirmed" as const, totalPrice: "2200.00" },
    { enquiryIdx: 9, version: 1, status: "completed" as const, totalPrice: "1150.00" },
    { enquiryIdx: 3, version: 1, status: "draft" as const, totalPrice: "2100.00" },
    { enquiryIdx: 13, version: 1, status: "draft" as const, totalPrice: "4200.00" },
  ];

  const orderIds: string[] = [];
  for (const o of orderData) {
    const [row] = await db
      .insert(orders)
      .values({
        id: randomUUID(),
        enquiryId: enquiryIds[o.enquiryIdx],
        companyId: COMPANY_ID,
        version: o.version,
        status: o.status,
        totalPrice: o.totalPrice,
      })
      .returning({ id: orders.id });
    orderIds.push(row.id);
  }

  // --- ORDER ITEMS ---
  const itemGroups = [
    // Order 0: Sarah Henderson Wedding
    [
      { description: "Bridal Bouquet - Garden roses, peonies, sweet peas", category: "Bouquet", quantity: 1, unitPrice: "240.00", totalPrice: "240.00" },
      { description: "Bridesmaids Bouquets - Blush roses and ranunculus", category: "Bouquet", quantity: 4, unitPrice: "85.00", totalPrice: "340.00" },
      { description: "Groom Buttonhole - Garden rose and eucalyptus", category: "Buttonhole", quantity: 1, unitPrice: "14.00", totalPrice: "14.00" },
      { description: "Groomsmen Buttonholes", category: "Buttonhole", quantity: 5, unitPrice: "12.00", totalPrice: "60.00" },
      { description: "Top Table Arrangement - Long and low", category: "Arrangement", quantity: 1, unitPrice: "145.00", totalPrice: "145.00" },
      { description: "Guest Table Centrepieces - Low bowls", category: "Centrepiece", quantity: 12, unitPrice: "65.00", totalPrice: "780.00" },
      { description: "Church Pedestal Arrangements", category: "Arrangement", quantity: 2, unitPrice: "280.00", totalPrice: "560.00" },
    ],
    // Order 1: Michael Brown Corporate
    [
      { description: "Round Table Centrepieces - Navy and gold", category: "Centrepiece", quantity: 20, unitPrice: "55.00", totalPrice: "1100.00" },
      { description: "Stage Arrangements", category: "Arrangement", quantity: 2, unitPrice: "160.00", totalPrice: "320.00" },
    ],
    // Order 2: Elizabeth Wilson Sympathy
    [
      { description: "White Lily Wreath - 18 inch", category: "Wreath", quantity: 1, unitPrice: "185.00", totalPrice: "185.00" },
      { description: "Standing Spray - White roses and lilies", category: "Spray", quantity: 1, unitPrice: "250.00", totalPrice: "250.00" },
      { description: "Casket Spray - White", category: "Spray", quantity: 1, unitPrice: "185.00", totalPrice: "185.00" },
    ],
    // Order 3: Alexandra Chen Birthday
    [
      { description: "Statement Centrepieces - Tall candelabra", category: "Centrepiece", quantity: 6, unitPrice: "120.00", totalPrice: "720.00" },
      { description: "Bar Area Arrangement", category: "Arrangement", quantity: 1, unitPrice: "280.00", totalPrice: "280.00" },
      { description: "Entrance Arrangement - Large urn", category: "Arrangement", quantity: 2, unitPrice: "195.00", totalPrice: "390.00" },
      { description: "Cake Flowers - Fresh dahlia crown", category: "Cake Flowers", quantity: 1, unitPrice: "85.00", totalPrice: "85.00" },
    ],
    // Order 4: David & Sophie Taylor Wedding
    [
      { description: "Bridal Bouquet - Grand cascade style", category: "Bouquet", quantity: 1, unitPrice: "280.00", totalPrice: "280.00" },
      { description: "Bridesmaids Bouquets", category: "Bouquet", quantity: 6, unitPrice: "95.00", totalPrice: "570.00" },
      { description: "Flower Girl Pomanders", category: "Pomander", quantity: 2, unitPrice: "45.00", totalPrice: "90.00" },
      { description: "Church Pedestal Arrangements - Grand", category: "Arrangement", quantity: 4, unitPrice: "300.00", totalPrice: "1200.00" },
      { description: "Pew End Arrangements", category: "Arrangement", quantity: 10, unitPrice: "35.00", totalPrice: "350.00" },
      { description: "Reception Centrepieces", category: "Centrepiece", quantity: 18, unitPrice: "85.00", totalPrice: "1530.00" },
      { description: "Buttonholes and Corsages", category: "Buttonhole", quantity: 12, unitPrice: "14.00", totalPrice: "168.00" },
    ],
    // Order 5: Rachel Green Baby Shower
    [
      { description: "Balloon Arch Floral Garland - 3m", category: "Garland", quantity: 1, unitPrice: "350.00", totalPrice: "350.00" },
      { description: "Table Posies - Yellow and cream", category: "Posy", quantity: 6, unitPrice: "45.00", totalPrice: "270.00" },
      { description: "Gift Table Arrangement", category: "Arrangement", quantity: 1, unitPrice: "95.00", totalPrice: "95.00" },
    ],
    // Order 6: Thompson & Partners Corporate
    [
      { description: "Large Statement Arrangements", category: "Arrangement", quantity: 5, unitPrice: "350.00", totalPrice: "1750.00" },
      { description: "Reception Desk Flowers", category: "Arrangement", quantity: 1, unitPrice: "150.00", totalPrice: "150.00" },
      { description: "Bathroom Posies", category: "Posy", quantity: 4, unitPrice: "35.00", totalPrice: "140.00" },
    ],
    // Order 7: Margaret Harrington Anniversary
    [
      { description: "Gold and White Top Table Arrangement", category: "Arrangement", quantity: 1, unitPrice: "180.00", totalPrice: "180.00" },
      { description: "Guest Table Centrepieces", category: "Centrepiece", quantity: 8, unitPrice: "75.00", totalPrice: "600.00" },
      { description: "Cake Flowers - Gold spray roses", category: "Cake Flowers", quantity: 1, unitPrice: "65.00", totalPrice: "65.00" },
      { description: "Entrance Arrangement", category: "Arrangement", quantity: 1, unitPrice: "150.00", totalPrice: "150.00" },
    ],
    // Order 8: James & Emma Cooper Wedding (draft)
    [
      { description: "Bridal Bouquet - Wildflower style", category: "Bouquet", quantity: 1, unitPrice: "180.00", totalPrice: "180.00" },
      { description: "Bridesmaids Bouquets", category: "Bouquet", quantity: 3, unitPrice: "75.00", totalPrice: "225.00" },
      { description: "Meadow-style Centrepieces", category: "Centrepiece", quantity: 15, unitPrice: "55.00", totalPrice: "825.00" },
      { description: "Ceremony Arch - Wildflower garland", category: "Arch", quantity: 1, unitPrice: "450.00", totalPrice: "450.00" },
    ],
    // Order 9: Jonathan & Kate Murray Winter Wedding (draft)
    [
      { description: "Bridal Bouquet - Winter roses and berries", category: "Bouquet", quantity: 1, unitPrice: "260.00", totalPrice: "260.00" },
      { description: "Bridesmaids Bouquets - Red and green", category: "Bouquet", quantity: 4, unitPrice: "90.00", totalPrice: "360.00" },
      { description: "Candelabra Centrepieces with Foliage", category: "Centrepiece", quantity: 14, unitPrice: "95.00", totalPrice: "1330.00" },
      { description: "Fireplace Garland - 2.5m", category: "Garland", quantity: 2, unitPrice: "280.00", totalPrice: "560.00" },
      { description: "Church Door Wreaths", category: "Wreath", quantity: 2, unitPrice: "120.00", totalPrice: "240.00" },
    ],
  ];

  for (let i = 0; i < itemGroups.length; i++) {
    for (const item of itemGroups[i]) {
      await db.insert(orderItems).values({
        id: randomUUID(),
        orderId: orderIds[i],
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }
  }

  // --- PROPOSALS (6) ---
  const proposalData = [
    { orderIdx: 0, status: "accepted" as const, sentAt: "2026-03-10", content: "Wedding flower proposal for Sarah & James Henderson" },
    { orderIdx: 1, status: "sent" as const, sentAt: "2026-03-20", content: "Corporate event flowers for annual awards ceremony" },
    { orderIdx: 2, status: "accepted" as const, sentAt: "2026-03-28", content: "Sympathy flowers for the Wilson family" },
    { orderIdx: 3, status: "sent" as const, sentAt: "2026-03-25", content: "Birthday celebration flowers for Alexandra Chen" },
    { orderIdx: 4, status: "accepted" as const, sentAt: "2026-02-15", content: "Wedding flower proposal for David & Sophie Taylor" },
    { orderIdx: 8, status: "draft" as const, sentAt: null, content: "Wildflower wedding proposal for James & Emma Cooper" },
  ];

  for (const p of proposalData) {
    await db.insert(proposals).values({
      id: randomUUID(),
      orderId: orderIds[p.orderIdx],
      companyId: COMPANY_ID,
      status: p.status,
      sentAt: p.sentAt ? new Date(p.sentAt) : null,
      content: p.content,
    });
  }

  // --- INVOICES (5) ---
  const invoiceData = [
    { orderIdx: 0, invoiceNumber: "INV-2026-001", status: "paid" as const, totalAmount: "3850.00", dueDate: "2026-05-15", paidAt: "2026-05-10" },
    { orderIdx: 2, invoiceNumber: "INV-2026-002", status: "paid" as const, totalAmount: "620.00", dueDate: "2026-04-20", paidAt: "2026-04-18" },
    { orderIdx: 4, invoiceNumber: "INV-2026-003", status: "sent" as const, totalAmount: "2725.00", dueDate: "2026-07-12", paidAt: null },
    { orderIdx: 6, invoiceNumber: "INV-2026-004", status: "overdue" as const, totalAmount: "2200.00", dueDate: "2026-03-15", paidAt: null },
    { orderIdx: 7, invoiceNumber: "INV-2026-005", status: "draft" as const, totalAmount: "1150.00", dueDate: "2026-05-01", paidAt: null },
  ];

  for (const inv of invoiceData) {
    await db.insert(invoices).values({
      id: randomUUID(),
      orderId: orderIds[inv.orderIdx],
      companyId: COMPANY_ID,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      totalAmount: inv.totalAmount,
      dueDate: new Date(inv.dueDate),
      paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
    });
  }

  // --- WHOLESALE ORDERS (4) ---
  const wholesaleData = [
    {
      orderIdx: 0, supplier: "Dutch Flower Group", status: "received" as const,
      orderDate: "2026-06-08", receivedDate: "2026-06-12",
      items: JSON.stringify([
        { name: "Garden Roses - Blush", qty: 60, price: 3.00 },
        { name: "Peonies - Sarah Bernhardt", qty: 40, price: 4.50 },
        { name: "Sweet Peas - Mixed Pastel", qty: 20, price: 3.50 },
        { name: "Ranunculus - White", qty: 30, price: 2.00 },
      ]),
    },
    {
      orderIdx: 4, supplier: "Triangle Nursery", status: "confirmed" as const,
      orderDate: "2026-08-01", receivedDate: null,
      items: JSON.stringify([
        { name: "Standard Roses - Avalanche", qty: 100, price: 1.50 },
        { name: "Eucalyptus - Silver Dollar", qty: 30, price: 2.50 },
        { name: "Ruscus - Italian", qty: 40, price: 1.50 },
        { name: "Gypsophila", qty: 25, price: 3.50 },
      ]),
    },
    {
      orderIdx: 6, supplier: "Zest Flowers", status: "dispatched" as const,
      orderDate: "2026-05-28", receivedDate: null,
      items: JSON.stringify([
        { name: "Lisianthus - White", qty: 50, price: 2.50 },
        { name: "Orchid - Phalaenopsis White", qty: 20, price: 4.50 },
        { name: "Delphinium - White", qty: 30, price: 2.80 },
      ]),
    },
    {
      orderIdx: 9, supplier: "Smithers Oasis", status: "pending" as const,
      orderDate: "2026-12-01", receivedDate: null,
      items: JSON.stringify([
        { name: "Oasis Floral Foam - Brick", qty: 30, price: 1.50 },
        { name: "Floral Wire 0.7mm", qty: 10, price: 3.00 },
        { name: "Satin Ribbon - Ivory 25mm", qty: 5, price: 3.50 },
      ]),
    },
  ];

  for (const ws of wholesaleData) {
    await db.insert(wholesaleOrders).values({
      id: randomUUID(),
      orderId: orderIds[ws.orderIdx],
      companyId: COMPANY_ID,
      supplier: ws.supplier,
      items: ws.items,
      status: ws.status,
      orderDate: new Date(ws.orderDate),
      receivedDate: ws.receivedDate ? new Date(ws.receivedDate) : null,
    });
  }

  // --- PRODUCTION SCHEDULES (5) ---
  const prodData = [
    { orderIdx: 0, eventDate: "2026-06-15", status: "completed" as const, notes: "All bouquets and buttonholes prep day before. Church flowers morning of.", items: JSON.stringify(["Bridal bouquet", "4x Bridesmaid bouquets", "6x Buttonholes", "12x Table centrepieces", "2x Church pedestals"]) },
    { orderIdx: 4, eventDate: "2026-08-12", status: "not_started" as const, notes: "Large wedding. Need additional staff. Start conditioning 2 days prior.", items: JSON.stringify(["Bridal bouquet", "6x Bridesmaid bouquets", "2x Pomanders", "4x Church pedestals", "10x Pew ends", "18x Centrepieces"]) },
    { orderIdx: 6, eventDate: "2026-06-03", status: "in_progress" as const, notes: "Architectural style. Source specialty containers from hire company.", items: JSON.stringify(["5x Large statement arrangements", "Reception desk flowers", "4x Bathroom posies"]) },
    { orderIdx: 7, eventDate: "2026-04-28", status: "completed" as const, notes: "Gold spray required for some roses. Order gold leaf in advance.", items: JSON.stringify(["Top table arrangement", "8x Guest table centrepieces", "Cake flowers", "Entrance arrangement"]) },
    { orderIdx: 9, eventDate: "2026-12-18", status: "not_started" as const, notes: "Winter wedding. Source berries and pine. Check availability of red garden roses in December.", items: JSON.stringify(["Bridal bouquet", "4x Bridesmaid bouquets", "14x Candelabra centrepieces", "2x Fireplace garlands", "2x Church door wreaths"]) },
  ];

  for (const ps of prodData) {
    await db.insert(productionSchedules).values({
      id: randomUUID(),
      orderId: orderIds[ps.orderIdx],
      companyId: COMPANY_ID,
      eventDate: new Date(ps.eventDate),
      items: ps.items,
      notes: ps.notes,
      status: ps.status,
    });
  }

  // --- DELIVERY SCHEDULES (5) ---
  const delData = [
    { orderIdx: 0, eventDate: "2026-06-15", deliveryAddress: "Chelsea Old Town Hall, King's Road, London SW3 5EE", status: "delivered" as const, notes: "Deliver ceremony flowers by 10am. Reception flowers by 12pm to The Ivy Chelsea Garden.", items: JSON.stringify(["Church pedestals x2", "12x centrepieces", "Top table"]) },
    { orderIdx: 2, eventDate: "2026-04-05", deliveryAddress: "St Mary Abbots Church, Kensington Church St, London W8 4LA", status: "delivered" as const, notes: "Deliver by 9am. Meet family contact Mrs Wilson at the entrance.", items: JSON.stringify(["Wreath", "Standing spray", "Casket spray"]) },
    { orderIdx: 4, eventDate: "2026-08-12", deliveryAddress: "Hampton Court Palace, East Molesey, Surrey KT8 9AU", status: "pending" as const, notes: "Two delivery runs: ceremony at 8am, Orangery by 11am. Security clearance needed in advance.", items: JSON.stringify(["4x Church pedestals", "10x Pew ends", "18x Centrepieces", "Pomanders"]) },
    { orderIdx: 6, eventDate: "2026-06-03", deliveryAddress: "The Shard, 32 London Bridge St, London SE1 9SG", status: "ready" as const, notes: "Level 31 access via goods lift. Arrive by 2pm for 7pm event. Parking in loading bay.", items: JSON.stringify(["5x Statement arrangements", "Reception desk flowers", "4x Bathroom posies"]) },
    { orderIdx: 9, eventDate: "2026-12-18", deliveryAddress: "Claridge's, Brook St, Mayfair, London W1K 4HR", status: "pending" as const, notes: "Ceremony at 2pm. All flowers to be in place by 12pm. Use staff entrance on Davies St.", items: JSON.stringify(["14x Candelabra centrepieces", "2x Fireplace garlands", "2x Church wreaths"]) },
  ];

  for (const d of delData) {
    await db.insert(deliverySchedules).values({
      id: randomUUID(),
      orderId: orderIds[d.orderIdx],
      companyId: COMPANY_ID,
      eventDate: new Date(d.eventDate),
      deliveryAddress: d.deliveryAddress,
      items: d.items,
      notes: d.notes,
      status: d.status,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Demo data seeded successfully.",
    counts: {
      products: productData.length,
      enquiries: enquiryData.length,
      orders: orderData.length,
      proposals: proposalData.length,
      invoices: invoiceData.length,
      wholesaleOrders: wholesaleData.length,
      productionSchedules: prodData.length,
      deliverySchedules: delData.length,
    },
  });
}
