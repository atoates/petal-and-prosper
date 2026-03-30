import { Pool } from "pg";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const COMPANY_ID = randomUUID();
const ADMIN_USER_ID = randomUUID();

async function createEnums(client: any) {
  // Create enums
  const enums = [
    {
      name: "user_role",
      values: ["admin", "manager", "staff"],
    },
    {
      name: "enquiry_progress",
      values: ["New", "TBD", "Live", "Done", "Placed", "Order"],
    },
    {
      name: "order_status",
      values: ["draft", "quote", "confirmed", "cancelled", "completed"],
    },
    {
      name: "proposal_status",
      values: ["draft", "sent", "accepted", "rejected"],
    },
    {
      name: "invoice_status",
      values: ["draft", "sent", "paid", "overdue"],
    },
    {
      name: "subscription_plan",
      values: ["essential", "growth", "enterprise"],
    },
    {
      name: "subscription_status",
      values: ["active", "cancelled", "expired"],
    },
    {
      name: "address_type",
      values: ["billing", "delivery", "studio"],
    },
    {
      name: "wholesale_status",
      values: ["pending", "confirmed", "dispatched", "received", "cancelled"],
    },
    {
      name: "production_status",
      values: ["not_started", "in_progress", "completed"],
    },
    {
      name: "delivery_status",
      values: ["pending", "ready", "dispatched", "delivered"],
    },
    {
      name: "product_category",
      values: ["flower", "foliage", "sundry", "container", "ribbon", "accessory"],
    },
  ];

  for (const enumType of enums) {
    await client.query(`DROP TYPE IF EXISTS ${enumType.name} CASCADE`);
    const valueStr = enumType.values.map((v) => `'${v}'`).join(",");
    await client.query(`CREATE TYPE ${enumType.name} AS ENUM (${valueStr})`);
  }
}

async function createTables(client: any) {
  // Drop tables in reverse dependency order
  const tables = [
    "product",
    "delivery_schedules",
    "production_schedules",
    "wholesale_orders",
    "invoices",
    "proposals",
    "order_items",
    "orders",
    "enquiries",
    "invoice_settings",
    "proposal_settings",
    "price_settings",
    "subscriptions",
    "addresses",
    "users",
    "companies",
  ];

  for (const table of tables) {
    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Create tables
  await client.query(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      registration_no VARCHAR(100),
      contact_no VARCHAR(20),
      email VARCHAR(255),
      currency VARCHAR(3) DEFAULT 'GBP',
      logo_url TEXT,
      website TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role user_role DEFAULT 'staff',
      company_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE addresses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      type address_type NOT NULL,
      building_name VARCHAR(255),
      street VARCHAR(255) NOT NULL,
      town VARCHAR(100),
      city VARCHAR(100) NOT NULL,
      postcode VARCHAR(20) NOT NULL,
      country VARCHAR(100) DEFAULT 'United Kingdom',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE enquiries (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_email VARCHAR(255) NOT NULL,
      client_phone VARCHAR(20),
      event_type VARCHAR(100),
      event_date TIMESTAMP,
      venue_a VARCHAR(255),
      venue_b VARCHAR(255),
      progress enquiry_progress DEFAULT 'New',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      archived_at TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      enquiry_id TEXT,
      company_id TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      status order_status DEFAULT 'draft',
      total_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (enquiry_id) REFERENCES enquiries(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100),
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  await client.query(`
    CREATE TABLE proposals (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      status proposal_status DEFAULT 'draft',
      sent_at TIMESTAMP,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE invoices (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      status invoice_status DEFAULT 'draft',
      total_amount DECIMAL(10,2) NOT NULL,
      due_date TIMESTAMP,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE wholesale_orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      supplier VARCHAR(255) NOT NULL,
      items TEXT,
      status wholesale_status DEFAULT 'pending',
      order_date TIMESTAMP DEFAULT NOW(),
      received_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE production_schedules (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      event_date TIMESTAMP,
      items TEXT,
      notes TEXT,
      status production_status DEFAULT 'not_started',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE delivery_schedules (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      event_date TIMESTAMP,
      delivery_address TEXT,
      items TEXT,
      notes TEXT,
      status delivery_status DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE price_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      multiple DECIMAL(5,2) DEFAULT 2.5,
      flower_buffer DECIMAL(5,2) DEFAULT 1.15,
      fuel_cost_per_litre DECIMAL(5,2) DEFAULT 1.80,
      miles_per_gallon INTEGER DEFAULT 45,
      staff_cost_per_hour DECIMAL(5,2) DEFAULT 15,
      staff_margin DECIMAL(5,2) DEFAULT 1.5,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE proposal_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      header_text TEXT,
      footer_text TEXT,
      terms_and_conditions TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE invoice_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      payment_terms TEXT,
      bank_details TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE subscriptions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      plan subscription_plan DEFAULT 'essential',
      status subscription_status DEFAULT 'active',
      start_date TIMESTAMP DEFAULT NOW(),
      end_date TIMESTAMP,
      monthly_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  await client.query(`
    CREATE TABLE product (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      category product_category NOT NULL,
      subcategory VARCHAR(100),
      wholesale_price DECIMAL(10,2),
      retail_price DECIMAL(10,2),
      unit VARCHAR(50) DEFAULT 'stem',
      stem_count INTEGER,
      colour VARCHAR(100),
      season VARCHAR(100),
      supplier VARCHAR(255),
      notes TEXT,
      is_active VARCHAR(5) DEFAULT 'true',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);
}

async function seedData(client: any) {
  // Seed company
  await client.query(
    `INSERT INTO companies (id, name, currency, contact_no, email, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [COMPANY_ID, "Petal & Prosper Demo", "GBP", "020 7946 0958", "hello@petalandprosper.com"]
  );

  // Seed address
  const addressId = randomUUID();
  await client.query(
    `INSERT INTO addresses (id, company_id, type, street, city, postcode, country, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
    [
      addressId,
      COMPANY_ID,
      "studio",
      "Unit 1, 123 Flower Lane",
      "London",
      "SW1A 1AA",
      "United Kingdom",
    ]
  );

  // Seed admin user with hashed password
  const hashedPassword = await hash("Demo@2026", 10);
  await client.query(
    `INSERT INTO users (id, email, password, first_name, last_name, role, company_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
    [
      ADMIN_USER_ID,
      "demo@petalandprosper.com",
      hashedPassword,
      "Demo",
      "User",
      "admin",
      COMPANY_ID,
    ]
  );

  // Seed price settings
  const priceSettingsId = randomUUID();
  await client.query(
    `INSERT INTO price_settings (id, company_id, multiple, flower_buffer, fuel_cost_per_litre, miles_per_gallon, staff_cost_per_hour, staff_margin, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [priceSettingsId, COMPANY_ID, "2.50", "1.15", "1.80", 45, "15.00", "1.50"]
  );

  // Seed proposal settings
  const proposalSettingsId = randomUUID();
  await client.query(
    `INSERT INTO proposal_settings (id, company_id, header_text, footer_text, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [
      proposalSettingsId,
      COMPANY_ID,
      "Petal & Prosper",
      "Thank you for your inquiry. We look forward to creating beautiful arrangements for your event.",
    ]
  );

  // Seed invoice settings
  const invoiceSettingsId = randomUUID();
  await client.query(
    `INSERT INTO invoice_settings (id, company_id, payment_terms, bank_details, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [
      invoiceSettingsId,
      COMPANY_ID,
      "Payment due within 30 days",
      "Petal & Prosper Ltd, Sort Code: 20-30-40, Account: 1234567890",
    ]
  );

  // Seed subscription
  const subscriptionId = randomUUID();
  await client.query(
    `INSERT INTO subscriptions (id, company_id, plan, status, start_date, monthly_price, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), $5, NOW(), NOW())`,
    [subscriptionId, COMPANY_ID, "growth", "active", "29.99"]
  );

  // Seed products
  const flowerData = [
    // Garden Roses
    { name: "David Austin - Juliet", cat: "flower", subcat: "Garden Rose", price: 4.50, colour: "Apricot Blend", season: "All Year", supplier: "Delbard" },
    { name: "David Austin - Patience", cat: "flower", subcat: "Garden Rose", price: 4.25, colour: "Pink", season: "All Year", supplier: "Delbard" },
    { name: "David Austin - Keira", cat: "flower", subcat: "Garden Rose", price: 4.00, colour: "Red", season: "All Year", supplier: "Delbard" },
    { name: "David Austin - Lady of Shalott", cat: "flower", subcat: "Garden Rose", price: 4.75, colour: "Orange Red", season: "All Year", supplier: "Delbard" },
    { name: "David Austin - Constance", cat: "flower", subcat: "Garden Rose", price: 4.50, colour: "Mauve", season: "All Year", supplier: "Delbard" },

    // Standard Roses
    { name: "Avalanche", cat: "flower", subcat: "Standard Rose", price: 2.00, colour: "White", season: "All Year", supplier: "Hilversum" },
    { name: "Avalanche Pink", cat: "flower", subcat: "Standard Rose", price: 2.00, colour: "Pink", season: "All Year", supplier: "Hilversum" },
    { name: "Sweet Avalanche", cat: "flower", subcat: "Standard Rose", price: 2.25, colour: "Cream", season: "All Year", supplier: "Hilversum" },
    { name: "Quicksand", cat: "flower", subcat: "Standard Rose", price: 1.80, colour: "Champagne", season: "All Year", supplier: "Hilversum" },
    { name: "Bombastic", cat: "flower", subcat: "Standard Rose", price: 2.50, colour: "Red", season: "All Year", supplier: "Hilversum" },

    // Spray Roses
    { name: "Bombastic Spray", cat: "flower", subcat: "Spray Rose", price: 1.50, colour: "Red", season: "All Year", supplier: "Hilversum", unit: "bunch", stemCount: 5 },
    { name: "Lovely Jewel Spray", cat: "flower", subcat: "Spray Rose", price: 1.75, colour: "Red", season: "All Year", supplier: "Hilversum", unit: "bunch", stemCount: 5 },
    { name: "Cappuccino Spray", cat: "flower", subcat: "Spray Rose", price: 1.60, colour: "Cappuccino", season: "All Year", supplier: "Hilversum", unit: "bunch", stemCount: 5 },

    // Peonies
    { name: "Sarah Bernhardt", cat: "flower", subcat: "Peony", price: 5.50, colour: "Pink", season: "Spring", supplier: "Leykaart", unit: "each" },
    { name: "Coral Charm", cat: "flower", subcat: "Peony", price: 6.00, colour: "Coral", season: "Spring", supplier: "Leykaart", unit: "each" },
    { name: "Duchesse de Nemours", cat: "flower", subcat: "Peony", price: 5.25, colour: "White", season: "Spring", supplier: "Leykaart", unit: "each" },
    { name: "Festiva Maxima", cat: "flower", subcat: "Peony", price: 5.00, colour: "White", season: "Spring", supplier: "Leykaart", unit: "each" },
    { name: "Pink Peony Mix", cat: "flower", subcat: "Peony", price: 5.75, colour: "Pink Mix", season: "Spring", supplier: "Leykaart", unit: "each" },

    // Ranunculus
    { name: "Ranunculus White", cat: "flower", subcat: "Ranunculus", price: 1.20, colour: "White", season: "Spring", supplier: "Leykaart" },
    { name: "Ranunculus Pink", cat: "flower", subcat: "Ranunculus", price: 1.20, colour: "Pink", season: "Spring", supplier: "Leykaart" },
    { name: "Ranunculus Peach", cat: "flower", subcat: "Ranunculus", price: 1.20, colour: "Peach", season: "Spring", supplier: "Leykaart" },
    { name: "Ranunculus Yellow", cat: "flower", subcat: "Ranunculus", price: 1.20, colour: "Yellow", season: "Spring", supplier: "Leykaart" },
    { name: "Ranunculus Red", cat: "flower", subcat: "Ranunculus", price: 1.20, colour: "Red", season: "Spring", supplier: "Leykaart" },

    // Hydrangeas
    { name: "Hydrangea White", cat: "flower", subcat: "Hydrangea", price: 1.80, colour: "White", season: "All Year", supplier: "Leykaart" },
    { name: "Hydrangea Pink", cat: "flower", subcat: "Hydrangea", price: 1.80, colour: "Pink", season: "All Year", supplier: "Leykaart" },
    { name: "Hydrangea Blue", cat: "flower", subcat: "Hydrangea", price: 1.80, colour: "Blue", season: "All Year", supplier: "Leykaart" },
    { name: "Hydrangea Green", cat: "flower", subcat: "Hydrangea", price: 1.80, colour: "Green", season: "All Year", supplier: "Leykaart" },
    { name: "Hydrangea Purple", cat: "flower", subcat: "Hydrangea", price: 2.00, colour: "Purple", season: "All Year", supplier: "Leykaart" },

    // Tulips
    { name: "Tulip White", cat: "flower", subcat: "Tulip", price: 0.95, colour: "White", season: "Winter", supplier: "Leykaart" },
    { name: "Tulip Pink", cat: "flower", subcat: "Tulip", price: 0.95, colour: "Pink", season: "Winter", supplier: "Leykaart" },
    { name: "Tulip Red", cat: "flower", subcat: "Tulip", price: 0.95, colour: "Red", season: "Winter", supplier: "Leykaart" },
    { name: "Tulip Yellow", cat: "flower", subcat: "Tulip", price: 0.95, colour: "Yellow", season: "Winter", supplier: "Leykaart" },
    { name: "Parrot Tulip", cat: "flower", subcat: "Tulip", price: 1.25, colour: "Mixed", season: "Winter", supplier: "Leykaart" },

    // Lisianthus
    { name: "Lisianthus White", cat: "flower", subcat: "Lisianthus", price: 1.50, colour: "White", season: "Spring", supplier: "Leykaart" },
    { name: "Lisianthus Pink", cat: "flower", subcat: "Lisianthus", price: 1.50, colour: "Pink", season: "Spring", supplier: "Leykaart" },
    { name: "Lisianthus Blueberry", cat: "flower", subcat: "Lisianthus", price: 1.75, colour: "Dark Purple", season: "Spring", supplier: "Leykaart" },

    // Sweet Peas
    { name: "Sweet Pea Mix", cat: "flower", subcat: "Sweet Pea", price: 2.50, colour: "Mixed", season: "Spring", supplier: "Leykaart" },
    { name: "Sweet Pea Pink", cat: "flower", subcat: "Sweet Pea", price: 2.50, colour: "Pink", season: "Spring", supplier: "Leykaart" },

    // Dahlias
    { name: "Cafe au Lait", cat: "flower", subcat: "Dahlia", price: 3.50, colour: "Cappuccino", season: "Summer", supplier: "Leykaart", unit: "each" },
    { name: "Dahlia Red", cat: "flower", subcat: "Dahlia", price: 2.75, colour: "Red", season: "Summer", supplier: "Leykaart", unit: "each" },
    { name: "Dahlia Pink", cat: "flower", subcat: "Dahlia", price: 2.75, colour: "Pink", season: "Summer", supplier: "Leykaart", unit: "each" },
    { name: "Dahlia White", cat: "flower", subcat: "Dahlia", price: 2.75, colour: "White", season: "Summer", supplier: "Leykaart", unit: "each" },

    // Anemones
    { name: "Anemone White", cat: "flower", subcat: "Anemone", price: 1.10, colour: "White", season: "Winter", supplier: "Leykaart" },
    { name: "Anemone Pink", cat: "flower", subcat: "Anemone", price: 1.10, colour: "Pink", season: "Winter", supplier: "Leykaart" },
    { name: "Anemone Purple", cat: "flower", subcat: "Anemone", price: 1.10, colour: "Purple", season: "Winter", supplier: "Leykaart" },

    // Stocks
    { name: "Stock White", cat: "flower", subcat: "Stock", price: 1.30, colour: "White", season: "Spring", supplier: "Leykaart" },
    { name: "Stock Pink", cat: "flower", subcat: "Stock", price: 1.30, colour: "Pink", season: "Spring", supplier: "Leykaart" },
    { name: "Stock Purple", cat: "flower", subcat: "Stock", price: 1.30, colour: "Purple", season: "Spring", supplier: "Leykaart" },

    // Freesia
    { name: "Freesia White", cat: "flower", subcat: "Freesia", price: 1.40, colour: "White", season: "Winter", supplier: "Leykaart" },
    { name: "Freesia Yellow", cat: "flower", subcat: "Freesia", price: 1.40, colour: "Yellow", season: "Winter", supplier: "Leykaart" },
    { name: "Freesia Pink", cat: "flower", subcat: "Freesia", price: 1.40, colour: "Pink", season: "Winter", supplier: "Leykaart" },

    // Gypsophila
    { name: "Gypsophila White", cat: "flower", subcat: "Gypsophila", price: 0.60, colour: "White", season: "All Year", supplier: "Leykaart" },
    { name: "Gypsophila Pink", cat: "flower", subcat: "Gypsophila", price: 0.80, colour: "Pink", season: "All Year", supplier: "Leykaart" },

    // Waxflower
    { name: "Waxflower Red", cat: "flower", subcat: "Waxflower", price: 1.20, colour: "Red", season: "All Year", supplier: "Leykaart", unit: "bunch", stemCount: 10 },
    { name: "Waxflower Pink", cat: "flower", subcat: "Waxflower", price: 1.20, colour: "Pink", season: "All Year", supplier: "Leykaart", unit: "bunch", stemCount: 10 },
    { name: "Waxflower White", cat: "flower", subcat: "Waxflower", price: 1.20, colour: "White", season: "All Year", supplier: "Leykaart", unit: "bunch", stemCount: 10 },

    // Foliage
    { name: "Eucalyptus Seeded", cat: "foliage", subcat: "Eucalyptus", price: 0.75, colour: "Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Eucalyptus Silver Dollar", cat: "foliage", subcat: "Eucalyptus", price: 0.85, colour: "Silver Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Eucalyptus Parvifolia", cat: "foliage", subcat: "Eucalyptus", price: 0.80, colour: "Light Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Ruscus Italian", cat: "foliage", subcat: "Ruscus", price: 0.50, colour: "Dark Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Ruscus Israeli", cat: "foliage", subcat: "Ruscus", price: 0.55, colour: "Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Pittosporum", cat: "foliage", subcat: "Pittosporum", price: 0.70, colour: "Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Asparagus Fern", cat: "foliage", subcat: "Asparagus Fern", price: 0.65, colour: "Lime Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Ivy Trails", cat: "foliage", subcat: "Ivy", price: 0.60, colour: "Dark Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Olive Branches", cat: "foliage", subcat: "Olive", price: 1.20, colour: "Silvery Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Rosemary", cat: "foliage", subcat: "Rosemary", price: 0.55, colour: "Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Salal", cat: "foliage", subcat: "Salal", price: 0.70, colour: "Deep Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Dusty Miller", cat: "foliage", subcat: "Dusty Miller", price: 0.65, colour: "Silver Green", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Protea Foliage", cat: "foliage", subcat: "Protea Foliage", price: 0.90, colour: "Green Red", season: "All Year", supplier: "Greenery Ltd" },
    { name: "Viburnum Berries", cat: "foliage", subcat: "Viburnum", price: 1.10, colour: "Red Berry", season: "Autumn", supplier: "Greenery Ltd" },
    { name: "Hypericum Berries", cat: "foliage", subcat: "Hypericum", price: 1.00, colour: "Red Berry", season: "All Year", supplier: "Greenery Ltd" },

    // Sundries
    { name: "Oasis Brick", cat: "sundry", subcat: "Oasis", price: 0.75, colour: "Green", season: "All Year", supplier: "Smithers Oasis", unit: "each" },
    { name: "Oasis Sec", cat: "sundry", subcat: "Oasis", price: 1.20, colour: "Brown", season: "All Year", supplier: "Smithers Oasis", unit: "each" },
    { name: "Wire 20 Gauge", cat: "sundry", subcat: "Wire", price: 0.50, colour: "Green", season: "All Year", supplier: "Florist Supplies", unit: "pack" },
    { name: "Wire 22 Gauge", cat: "sundry", subcat: "Wire", price: 0.55, colour: "Green", season: "All Year", supplier: "Florist Supplies", unit: "pack" },
    { name: "Stem Tape", cat: "sundry", subcat: "Tape", price: 1.50, colour: "Green", season: "All Year", supplier: "Florist Supplies", unit: "roll" },
    { name: "Pot Tape", cat: "sundry", subcat: "Tape", price: 2.00, colour: "Brown", season: "All Year", supplier: "Florist Supplies", unit: "roll" },
    { name: "Cable Ties", cat: "sundry", subcat: "Ties", price: 1.25, colour: "Black", season: "All Year", supplier: "Florist Supplies", unit: "pack" },
    { name: "Pearl Pins", cat: "sundry", subcat: "Pins", price: 3.50, colour: "White", season: "All Year", supplier: "Florist Supplies", unit: "pack" },
    { name: "Cellophane Roll", cat: "sundry", subcat: "Cellophane", price: 5.00, colour: "Clear", season: "All Year", supplier: "Florist Supplies", unit: "each" },
    { name: "Tissue Paper", cat: "sundry", subcat: "Paper", price: 2.25, colour: "Mixed", season: "All Year", supplier: "Florist Supplies", unit: "pack" },

    // Containers
    { name: "Fish Bowl Vase Small", cat: "container", subcat: "Fish Bowl", price: 2.50, colour: "Clear", season: "All Year", supplier: "Glassware Co", unit: "each" },
    { name: "Fish Bowl Vase Medium", cat: "container", subcat: "Fish Bowl", price: 3.50, colour: "Clear", season: "All Year", supplier: "Glassware Co", unit: "each" },
    { name: "Fish Bowl Vase Large", cat: "container", subcat: "Fish Bowl", price: 4.50, colour: "Clear", season: "All Year", supplier: "Glassware Co", unit: "each" },
    { name: "Cylinder Vase Small", cat: "container", subcat: "Cylinder", price: 2.00, colour: "Clear", season: "All Year", supplier: "Glassware Co", unit: "each" },
    { name: "Cylinder Vase Large", cat: "container", subcat: "Cylinder", price: 3.00, colour: "Clear", season: "All Year", supplier: "Glassware Co", unit: "each" },
    { name: "Bud Vase", cat: "container", subcat: "Bud Vase", price: 1.50, colour: "Clear", season: "All Year", supplier: "Glassware Co", unit: "each" },
    { name: "Urn Vase", cat: "container", subcat: "Urn", price: 6.00, colour: "White Ceramic", season: "All Year", supplier: "Ceramics Ltd", unit: "each" },
    { name: "Wooden Crate", cat: "container", subcat: "Wooden", price: 3.75, colour: "Natural Wood", season: "All Year", supplier: "Boxes Ltd", unit: "each" },

    // Ribbons
    { name: "Satin Ribbon 25mm", cat: "ribbon", subcat: "Satin", price: 0.80, colour: "White", season: "All Year", supplier: "Ribbon Co", unit: "metre" },
    { name: "Satin Ribbon 38mm", cat: "ribbon", subcat: "Satin", price: 1.20, colour: "White", season: "All Year", supplier: "Ribbon Co", unit: "metre" },
    { name: "Organza Ribbon", cat: "ribbon", subcat: "Organza", price: 1.00, colour: "White", season: "All Year", supplier: "Ribbon Co", unit: "metre" },
    { name: "Hessian Ribbon", cat: "ribbon", subcat: "Hessian", price: 1.50, colour: "Natural", season: "All Year", supplier: "Ribbon Co", unit: "metre" },
    { name: "Velvet Ribbon", cat: "ribbon", subcat: "Velvet", price: 2.50, colour: "Gold", season: "All Year", supplier: "Ribbon Co", unit: "metre" },
  ];

  for (const flower of flowerData) {
    const id = randomUUID();
    const retailPrice = (parseFloat(String(flower.price)) * 2.5).toFixed(2);
    await client.query(
      `INSERT INTO product (id, company_id, name, category, subcategory, wholesale_price, retail_price, unit, stem_count, colour, season, supplier, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'true', NOW(), NOW())`,
      [
        id,
        COMPANY_ID,
        flower.name,
        flower.cat,
        flower.subcat,
        flower.price.toFixed(2),
        retailPrice,
        flower.unit || "stem",
        flower.stemCount || null,
        flower.colour,
        flower.season,
        flower.supplier,
      ]
    );
  }

  // Seed enquiries
  const enquiriesList = [
    {
      clientName: "Sarah Johnson",
      clientEmail: "sarah.j@email.com",
      clientPhone: "020 7946 0958",
      eventType: "Wedding",
      eventDate: new Date("2026-06-15"),
      venueA: "Chelsea Town Hall",
      progress: "Live",
      notes: "Garden rose bride bouquet, white and blush theme",
    },
    {
      clientName: "Michael Brown",
      clientEmail: "m.brown@corporate.com",
      clientPhone: "020 3456 7890",
      eventType: "Corporate",
      eventDate: new Date("2026-04-10"),
      venueA: "Canary Wharf Conference Centre",
      progress: "TBD",
      notes: "50 table centrepieces, modern minimalist style",
    },
    {
      clientName: "Elizabeth Wilson",
      clientEmail: "liz.wilson@yahoo.com",
      clientPhone: "020 8123 4567",
      eventType: "Sympathy",
      eventDate: new Date("2026-04-05"),
      venueA: "St Mary Church",
      progress: "Done",
      notes: "Funeral wreaths and tributes, white and cream flowers",
    },
    {
      clientName: "James & Emma Cooper",
      clientEmail: "emma.cooper@hotmail.com",
      clientPhone: "020 7234 5678",
      eventType: "Wedding",
      eventDate: new Date("2026-07-20"),
      venueA: "Richmond Park",
      progress: "New",
      notes: "Summer wedding, colourful wildflower theme",
    },
    {
      clientName: "Alexandra Chen",
      clientEmail: "a.chen@design.com",
      clientPhone: "020 7987 6543",
      eventType: "Birthday",
      eventDate: new Date("2026-05-22"),
      venueA: "Private Residence, Knightsbridge",
      progress: "Live",
      notes: "60th birthday celebration, sophisticated arrangement",
    },
  ];

  const enquiryIds = [];
  for (const enq of enquiriesList) {
    const enquiryId = randomUUID();
    enquiryIds.push(enquiryId);
    await client.query(
      `INSERT INTO enquiries (id, company_id, client_name, client_email, client_phone, event_type, event_date, venue_a, progress, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        enquiryId,
        COMPANY_ID,
        enq.clientName,
        enq.clientEmail,
        enq.clientPhone,
        enq.eventType,
        enq.eventDate,
        enq.venueA,
        enq.progress,
        enq.notes,
      ]
    );
  }

  // Seed orders and order items for some enquiries
  for (let i = 0; i < 3; i++) {
    const orderId = randomUUID();
    await client.query(
      `INSERT INTO orders (id, enquiry_id, company_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [orderId, enquiryIds[i], COMPANY_ID, i === 0 ? "confirmed" : "quote"]
    );

    // Add order items
    const items = [
      {
        description: "Bride Bouquet - Garden Roses",
        quantity: 1,
        unitPrice: "150.00",
        category: "Bouquet",
      },
      {
        description: "Bridesmaids Bouquets (x4)",
        quantity: 4,
        unitPrice: "75.00",
        category: "Bouquet",
      },
      {
        description: "Table Centrepieces (x20)",
        quantity: 20,
        unitPrice: "45.00",
        category: "Centrepiece",
      },
    ];

    for (const item of items.slice(0, 2)) {
      const orderItemId = randomUUID();
      const totalPrice = (parseFloat(item.unitPrice) * item.quantity).toFixed(2);
      await client.query(
        `INSERT INTO order_items (id, order_id, description, category, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          orderItemId,
          orderId,
          item.description,
          item.category,
          item.quantity,
          item.unitPrice,
          totalPrice,
        ]
      );
    }
  }
}

async function main() {
  const client = await pool.connect();

  try {
    console.log("Creating enums...");
    await createEnums(client);

    console.log("Creating tables...");
    await createTables(client);

    console.log("Seeding data...");
    await seedData(client);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
