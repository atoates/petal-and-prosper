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
    "delivery_schedule_items",
    "production_schedule_items",
    "wholesale_order_items",
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
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
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  await client.query(`
    CREATE TABLE wholesale_orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      supplier VARCHAR(255) NOT NULL,
      status wholesale_status DEFAULT 'pending',
      order_date TIMESTAMP DEFAULT NOW(),
      received_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  await client.query(`
    CREATE TABLE production_schedules (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      production_date TIMESTAMP,
      notes TEXT,
      status production_status DEFAULT 'not_started',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  await client.query(`
    CREATE TABLE delivery_schedules (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      delivery_date TIMESTAMP,
      delivery_address TEXT,
      notes TEXT,
      status delivery_status DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  // Schedule line-item child tables (#16). These replace the old
  // text("items") JSON columns on wholesale_orders, production_schedules,
  // and delivery_schedules with queryable, joinable rows.
  await client.query(`
    CREATE TABLE wholesale_order_items (
      id TEXT PRIMARY KEY,
      wholesale_order_id TEXT NOT NULL,
      product_id TEXT,
      description VARCHAR(500) NOT NULL,
      category VARCHAR(100),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (wholesale_order_id) REFERENCES wholesale_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE SET NULL
    )
  `);

  await client.query(`
    CREATE TABLE production_schedule_items (
      id TEXT PRIMARY KEY,
      production_schedule_id TEXT NOT NULL,
      order_item_id TEXT,
      description VARCHAR(500) NOT NULL,
      category VARCHAR(100),
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (production_schedule_id) REFERENCES production_schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
    )
  `);

  await client.query(`
    CREATE TABLE delivery_schedule_items (
      id TEXT PRIMARY KEY,
      delivery_schedule_id TEXT NOT NULL,
      order_item_id TEXT,
      description VARCHAR(500) NOT NULL,
      category VARCHAR(100),
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (delivery_schedule_id) REFERENCES delivery_schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
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

  // Seed enquiries (expanded to 15)
  const enquiriesList = [
    {
      clientName: "Sarah Johnson",
      clientEmail: "sarah.j@email.com",
      clientPhone: "020 7946 0958",
      eventType: "Wedding",
      eventDate: new Date("2026-06-15"),
      venueA: "Chelsea Town Hall",
      progress: "Live",
      notes: "Garden rose bride bouquet, white and blush theme. Approximately 45 guests. Very traditional style requested.",
    },
    {
      clientName: "Michael Brown",
      clientEmail: "m.brown@corporate.com",
      clientPhone: "020 3456 7890",
      eventType: "Corporate",
      eventDate: new Date("2026-04-10"),
      venueA: "Canary Wharf Conference Centre",
      progress: "TBD",
      notes: "50 table centrepieces, modern minimalist style. Corporate colours: navy and white. Reception area flowers also needed.",
    },
    {
      clientName: "Elizabeth Wilson",
      clientEmail: "liz.wilson@yahoo.com",
      clientPhone: "020 8123 4567",
      eventType: "Funeral/Sympathy",
      eventDate: new Date("2026-04-05"),
      venueA: "St Mary Church, Kensington",
      progress: "Done",
      notes: "Funeral wreaths and tributes, white and cream flowers. Two standing sprays and casket spray. Service time 2 PM.",
    },
    {
      clientName: "James & Emma Cooper",
      clientEmail: "emma.cooper@hotmail.com",
      clientPhone: "020 7234 5678",
      eventType: "Wedding",
      eventDate: new Date("2026-07-20"),
      venueA: "Richmond Park",
      progress: "New",
      notes: "Summer wedding, colourful wildflower theme. Outdoor venue, bride wants loose, garden-style arrangements.",
    },
    {
      clientName: "Alexandra Chen",
      clientEmail: "a.chen@design.com",
      clientPhone: "020 7987 6543",
      eventType: "Birthday",
      eventDate: new Date("2026-05-22"),
      venueA: "Private Residence, Knightsbridge",
      progress: "Live",
      notes: "60th birthday celebration, sophisticated arrangement. Dinner party for 30. Colour scheme: blush and gold.",
    },
    {
      clientName: "Thomas & Rebecca Hayes",
      clientEmail: "rebecca.hayes@email.com",
      clientPhone: "020 7654 3210",
      eventType: "Wedding",
      eventDate: new Date("2026-09-12"),
      venueA: "Tower Bridge Exhibition Hall",
      progress: "Placed",
      notes: "Summer wedding, 120 guests. Bride bouquet, 6 bridesmaids, 30 table centrepieces. Colour: ivory and blush.",
    },
    {
      clientName: "Priya Patel",
      clientEmail: "priya.p@gmail.com",
      clientPhone: "020 8876 5432",
      eventType: "Anniversary",
      eventDate: new Date("2026-08-30"),
      venueA: "The Dorchester, Mayfair",
      progress: "Order",
      notes: "25th wedding anniversary celebration. Romantic arrangement for centrepiece. Red roses and white lilies.",
    },
    {
      clientName: "David & Lucy Nelson",
      clientEmail: "lucy.nelson@yahoo.co.uk",
      clientPhone: "020 7123 4567",
      eventType: "Wedding",
      eventDate: new Date("2026-10-08"),
      venueA: "Hampton Court Palace Gardens",
      progress: "New",
      notes: "Autumn wedding, rustic and romantic style. Dahlias, roses, and foliage. 80 guests.",
    },
    {
      clientName: "Olivia Martinez",
      clientEmail: "o.martinez@corporate.com",
      clientPhone: "020 3210 9876",
      eventType: "Corporate",
      eventDate: new Date("2026-06-25"),
      venueA: "Gherkin Reception Room",
      progress: "Live",
      notes: "Company summer party flowers. Reception desk arrangement, 15 table arrangements. Modern aesthetic.",
    },
    {
      clientName: "Sophie & George Mitchell",
      clientEmail: "george.mitchell@email.com",
      clientPhone: "020 7456 2341",
      eventType: "Baby Shower",
      eventDate: new Date("2026-05-10"),
      venueA: "Private Residence, Belgravia",
      progress: "TBD",
      notes: "Baby shower celebration. Pastel pink and white theme. Tiered arrangement for main table and small posies.",
    },
    {
      clientName: "Christopher Williams",
      clientEmail: "c.williams@design.co.uk",
      clientPhone: "020 7899 0123",
      eventType: "Birthday",
      eventDate: new Date("2026-07-15"),
      venueA: "Shoreditch Private Venue",
      progress: "Live",
      notes: "40th birthday. Colourful modern design arrangement. Mixed garden flowers. Reception and table flowers.",
    },
    {
      clientName: "Margaret & William Thompson",
      clientEmail: "margaret.thompson@hotmail.com",
      clientPhone: "020 8765 4321",
      eventType: "Wedding",
      eventDate: new Date("2026-11-22"),
      venueA: "St Paul's Cathedral",
      progress: "New",
      notes: "Formal winter wedding. White, gold, and ivory theme. 150 guests. Traditional style requested.",
    },
    {
      clientName: "Jessica Carter",
      clientEmail: "j.carter@event.com",
      clientPhone: "020 7321 5678",
      eventType: "Engagement Party",
      eventDate: new Date("2026-08-14"),
      venueA: "Chelsea Flower Show Gardens",
      progress: "TBD",
      notes: "Engagement celebration, 50 guests. Light, romantic arrangement. Peonies and lisianthus preferred.",
    },
    {
      clientName: "Daniel & Victoria West",
      clientEmail: "victoria.west@email.com",
      clientPhone: "020 7432 8901",
      eventType: "Wedding",
      eventDate: new Date("2026-09-28"),
      venueA: "Chiswick House",
      progress: "Done",
      notes: "Autumn wedding completed. Bridal bouquet, 5 bridesmaids, 35 table centrepieces delivered successfully.",
    },
    {
      clientName: "Rachel Morris",
      clientEmail: "r.morris@yahoo.com",
      clientPhone: "020 8234 5678",
      eventType: "Prom",
      eventDate: new Date("2026-07-02"),
      venueA: "Alexandra Palace",
      progress: "Placed",
      notes: "School prom flowers, 200+ guests. Elegant white and blush arrangements for entrance and stage.",
    },
  ];

  // Any enquiry that has a non-cancelled order in the seed MUST be
  // marked with progress "Order" -- the POST /api/orders handler
  // auto-advances the enquiry to that state when an order is
  // created (see audit item #14), so for the seed to reflect the
  // live API invariant we compute the same advance here. Cancelled
  // orders don't trigger the bump, so e.g. the West wedding (index
  // 13) stays at its authored progress.
  //
  // These indexes correspond to the orderData entries below:
  //   0  Sarah Johnson  (confirmed)
  //   1  Michael Brown  (quote)
  //   2  Liz Wilson     (completed)
  //   5  Hayes          (confirmed)
  //   6  Priya Patel    (completed)
  //   9  Mitchell       (draft)
  //   10 Williams       (quote)
  //   11 Thompson       (draft)
  //   14 Morris         (quote)
  const enquiryIndexesWithLiveOrder = new Set([0, 1, 2, 5, 6, 9, 10, 11, 14]);

  const enquiryIds = [];
  for (let i = 0; i < enquiriesList.length; i++) {
    const enq = enquiriesList[i];
    const enquiryId = randomUUID();
    enquiryIds.push(enquiryId);
    const progress = enquiryIndexesWithLiveOrder.has(i) ? "Order" : enq.progress;
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
        progress,
        enq.notes,
      ]
    );
  }

  // Seed orders and order items (expanded to 10 orders)
  const orderData = [
    {
      enquiryIndex: 0,
      status: "confirmed",
      totalPrice: "2850.00",
      items: [
        { description: "Bridal Bouquet - Garden Roses", quantity: 1, unitPrice: "245.00", category: "Bouquet" },
        { description: "Bridesmaids Bouquets", quantity: 4, unitPrice: "85.00", category: "Bouquet" },
        { description: "Table Centrepieces", quantity: 20, unitPrice: "65.00", category: "Centrepiece" },
        { description: "Church Pedestal Arrangements", quantity: 2, unitPrice: "275.00", category: "Pedestal" },
      ],
    },
    {
      enquiryIndex: 1,
      status: "quote",
      totalPrice: "3200.00",
      items: [
        { description: "Corporate Reception Arrangement", quantity: 1, unitPrice: "450.00", category: "Reception" },
        { description: "Table Centrepieces", quantity: 50, unitPrice: "55.00", category: "Centrepiece" },
      ],
    },
    {
      enquiryIndex: 2,
      status: "completed",
      totalPrice: "890.00",
      items: [
        { description: "Funeral Wreath", quantity: 2, unitPrice: "350.00", category: "Sympathy" },
        { description: "Casket Spray", quantity: 1, unitPrice: "190.00", category: "Sympathy" },
      ],
    },
    {
      enquiryIndex: 5,
      status: "confirmed",
      totalPrice: "4120.00",
      items: [
        { description: "Bridal Bouquet", quantity: 1, unitPrice: "250.00", category: "Bouquet" },
        { description: "Bridesmaids Bouquets", quantity: 6, unitPrice: "80.00", category: "Bouquet" },
        { description: "Table Centrepieces", quantity: 30, unitPrice: "65.00", category: "Centrepiece" },
        { description: "Top Table Arrangement", quantity: 1, unitPrice: "130.00", category: "TopTable" },
        { description: "Church Pedestals", quantity: 2, unitPrice: "270.00", category: "Pedestal" },
        { description: "Buttonholes", quantity: 15, unitPrice: "12.00", category: "Buttonhole" },
      ],
    },
    {
      enquiryIndex: 6,
      status: "completed",
      totalPrice: "620.00",
      items: [
        { description: "Anniversary Centrepiece", quantity: 1, unitPrice: "150.00", category: "Centrepiece" },
        { description: "Red Rose and Lily Arrangement", quantity: 2, unitPrice: "235.00", category: "Arrangement" },
      ],
    },
    {
      enquiryIndex: 9,
      status: "draft",
      totalPrice: "950.00",
      items: [
        { description: "Baby Shower Arrangement", quantity: 1, unitPrice: "180.00", category: "Arrangement" },
        { description: "Small Posies", quantity: 5, unitPrice: "65.00", category: "Posy" },
        { description: "Corsages", quantity: 8, unitPrice: "22.00", category: "Corsage" },
      ],
    },
    {
      enquiryIndex: 10,
      status: "quote",
      totalPrice: "1850.00",
      items: [
        { description: "Mixed Garden Arrangement", quantity: 3, unitPrice: "320.00", category: "Arrangement" },
        { description: "Table Centrepieces", quantity: 8, unitPrice: "85.00", category: "Centrepiece" },
      ],
    },
    {
      enquiryIndex: 11,
      status: "draft",
      totalPrice: "5450.00",
      items: [
        { description: "Bridal Bouquet - White and Gold", quantity: 1, unitPrice: "280.00", category: "Bouquet" },
        { description: "Bridesmaids Bouquets", quantity: 7, unitPrice: "95.00", category: "Bouquet" },
        { description: "Table Centrepieces", quantity: 45, unitPrice: "75.00", category: "Centrepiece" },
        { description: "Church Pedestals", quantity: 3, unitPrice: "300.00", category: "Pedestal" },
        { description: "Top Table Arrangement", quantity: 1, unitPrice: "145.00", category: "TopTable" },
        { description: "Buttonholes", quantity: 20, unitPrice: "14.00", category: "Buttonhole" },
        { description: "Corsages", quantity: 8, unitPrice: "25.00", category: "Corsage" },
      ],
    },
    {
      enquiryIndex: 13,
      status: "cancelled",
      totalPrice: "3290.00",
      items: [
        { description: "Bridal Bouquet", quantity: 1, unitPrice: "240.00", category: "Bouquet" },
        { description: "Bridesmaids Bouquets", quantity: 5, unitPrice: "85.00", category: "Bouquet" },
        { description: "Table Centrepieces", quantity: 35, unitPrice: "70.00", category: "Centrepiece" },
      ],
    },
    {
      enquiryIndex: 14,
      status: "quote",
      totalPrice: "2200.00",
      items: [
        { description: "Prom Entrance Arrangement", quantity: 2, unitPrice: "450.00", category: "Reception" },
        { description: "Stage Flowers", quantity: 3, unitPrice: "300.00", category: "Stage" },
        { description: "Table Centrepieces", quantity: 15, unitPrice: "35.00", category: "Centrepiece" },
      ],
    },
  ];

  // Recompute each order's totalPrice as the exact sum of its
  // normalised line items. Previously the seed hard-coded totalPrice
  // alongside items and the two drifted -- 7 out of 10 orders had
  // `orders.total_price` that didn't match `SUM(order_items.total_price)`,
  // which broke every dashboard widget and invoice that used the
  // header value. Now the header is derived, so the invariant holds
  // by construction.
  for (const od of orderData) {
    const sum = od.items.reduce(
      (acc, it) => acc + parseFloat(it.unitPrice) * it.quantity,
      0
    );
    od.totalPrice = sum.toFixed(2);
  }

  const orderIds = [];
  const proposalOrderIds = [];
  const invoiceOrderIds = [];

  for (let i = 0; i < orderData.length; i++) {
    const orderId = randomUUID();
    orderIds.push(orderId);
    if (i < 6) proposalOrderIds.push(orderId);
    if (i < 5) invoiceOrderIds.push(orderId);

    const od = orderData[i];
    await client.query(
      `INSERT INTO orders (id, enquiry_id, company_id, status, total_price, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [orderId, enquiryIds[od.enquiryIndex], COMPANY_ID, od.status, od.totalPrice]
    );

    // Add order items
    for (const item of od.items) {
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

  // Seed proposals (6 proposals)
  const proposalStatuses = ["draft", "sent", "accepted", "rejected", "sent", "accepted"];
  for (let i = 0; i < proposalOrderIds.length; i++) {
    const proposalId = randomUUID();
    const sentAt = proposalStatuses[i] !== "draft" ? new Date() : null;
    await client.query(
      `INSERT INTO proposals (id, order_id, company_id, status, sent_at, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        proposalId,
        proposalOrderIds[i],
        COMPANY_ID,
        proposalStatuses[i],
        sentAt,
        "Detailed proposal for floral arrangements and event decoration. Please review the attached specification and pricing.",
      ]
    );
  }

  // Seed invoices (5 invoices)
  const invoiceStatuses = ["draft", "sent", "paid", "overdue", "sent"];
  for (let i = 0; i < invoiceOrderIds.length; i++) {
    const invoiceId = randomUUID();
    const invoiceNumber = `INV-2026-${String(i + 1).padStart(3, "0")}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const paidAt = invoiceStatuses[i] === "paid" ? new Date() : null;

    const orderAmount = orderData[i].totalPrice;
    await client.query(
      `INSERT INTO invoices (id, order_id, company_id, invoice_number, status, total_amount, due_date, paid_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        invoiceId,
        invoiceOrderIds[i],
        COMPANY_ID,
        invoiceNumber,
        invoiceStatuses[i],
        orderAmount,
        dueDate,
        paidAt,
      ]
    );
  }

  // Seed wholesale orders (4 wholesale orders). Items are normalised
  // into `wholesale_order_items` (see #16 in
  // Process-Flow-Review-2026-04-11.md), with one child row per line.
  const wholesaleData = [
    {
      orderId: orderIds[0],
      supplier: "Dutch Flower Group",
      items: [
        { description: "David Austin Roses - Juliet", category: "flower", quantity: 50, unitPrice: 4.5 },
        { description: "White Hydrangeas", category: "flower", quantity: 30, unitPrice: 1.8 },
        { description: "Eucalyptus Seeded", category: "foliage", quantity: 20, unitPrice: 0.75 },
      ],
      status: "confirmed",
    },
    {
      orderId: orderIds[1],
      supplier: "Triangle Nursery",
      items: [
        { description: "Mixed Roses", category: "flower", quantity: 200, unitPrice: 2.0 },
        { description: "Ruscus Italian", category: "foliage", quantity: 100, unitPrice: 0.5 },
        { description: "Gypsophila White", category: "flower", quantity: 80, unitPrice: 0.6 },
      ],
      status: "received",
    },
    {
      orderId: orderIds[3],
      supplier: "Zest Flowers",
      items: [
        { description: "Peonies Mix", category: "flower", quantity: 40, unitPrice: 5.5 },
        { description: "Lisianthus White", category: "flower", quantity: 60, unitPrice: 1.5 },
        { description: "Waxflower Pink", category: "flower", quantity: 50, unitPrice: 1.2 },
        { description: "Asparagus Fern", category: "foliage", quantity: 30, unitPrice: 0.65 },
      ],
      status: "dispatched",
    },
    {
      // orderIds[4] is the Priya Patel anniversary arrangement
      // (2x "Red Rose and Lily Arrangement" plus 1x centrepiece).
      // Previously this wholesale row carried only sundries, which
      // meant the completed order had zero wholesale flower spend
      // on file. Replaced with red roses and white lilies to match
      // the actual arrangement brief, with a handful of sundries
      // retained for mechanics.
      orderId: orderIds[4],
      supplier: "Dutch Flower Group",
      items: [
        { description: "Red Naomi Roses", category: "flower", quantity: 80, unitPrice: 2.25 },
        { description: "White Oriental Lilies", category: "flower", quantity: 25, unitPrice: 3.5 },
        { description: "Eucalyptus Parvifolia", category: "foliage", quantity: 15, unitPrice: 0.8 },
        { description: "Oasis Bricks", category: "sundry", quantity: 6, unitPrice: 0.75 },
      ],
      status: "pending",
    },
  ];

  for (const wo of wholesaleData) {
    const wholesaleId = randomUUID();
    const receivedDate = wo.status === "received" ? new Date() : null;
    await client.query(
      `INSERT INTO wholesale_orders (id, order_id, company_id, supplier, status, received_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        wholesaleId,
        wo.orderId,
        COMPANY_ID,
        wo.supplier,
        wo.status,
        receivedDate,
      ]
    );

    for (const item of wo.items) {
      await client.query(
        `INSERT INTO wholesale_order_items (id, wholesale_order_id, description, category, quantity, unit_price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          randomUUID(),
          wholesaleId,
          item.description,
          item.category,
          item.quantity,
          item.unitPrice,
        ]
      );
    }
  }

  // Seed production schedules (5 production schedules). These dates
  // describe when the production work itself is planned, not the
  // client event, hence `productionDate` rather than `eventDate`.
  // Items are now normalised into `production_schedule_items` (see
  // #16 in Process-Flow-Review-2026-04-11.md), so each production
  // schedule owns a set of child rows keyed by its id.
  const productionData = [
    {
      orderId: orderIds[0],
      productionDate: new Date("2026-06-14"),
      items: [
        { description: "Bridal Bouquet", category: "arrangement", quantity: 1 },
        { description: "Bridesmaids Bouquets", category: "arrangement", quantity: 4 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 20 },
      ],
      notes: "Start early on bridesmaids to ensure consistency. Event is Saturday.",
      status: "in_progress",
    },
    {
      orderId: orderIds[1],
      productionDate: new Date("2026-04-09"),
      items: [
        { description: "Reception Arrangement", category: "arrangement", quantity: 1 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 50 },
      ],
      notes: "Corporate event. Minimalist style, focus on clean lines.",
      status: "in_progress",
    },
    {
      orderId: orderIds[3],
      productionDate: new Date("2026-09-11"),
      items: [
        { description: "Bridal Bouquet", category: "arrangement", quantity: 1 },
        { description: "Bridesmaids Bouquets", category: "arrangement", quantity: 6 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 30 },
        { description: "Pedestals and Top Table", category: "arrangement", quantity: 1 },
      ],
      notes: "Large summer wedding. Schedule production carefully to maintain freshness.",
      status: "not_started",
    },
    {
      orderId: orderIds[5],
      productionDate: new Date("2026-05-09"),
      items: [
        { description: "Baby Shower Arrangement", category: "arrangement", quantity: 1 },
        { description: "Small Posies", category: "arrangement", quantity: 6 },
      ],
      notes: "Pastel colours completed successfully.",
      status: "completed",
    },
    {
      orderId: orderIds[7],
      productionDate: new Date("2026-11-21"),
      items: [
        { description: "Bridal Bouquet - Formal White", category: "arrangement", quantity: 1 },
        { description: "Bridesmaids Bouquets", category: "arrangement", quantity: 7 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 45 },
      ],
      notes: "Formal winter wedding. Traditional style. Order well in advance for holiday season.",
      status: "not_started",
    },
  ];

  for (const pd of productionData) {
    const productionId = randomUUID();
    await client.query(
      `INSERT INTO production_schedules (id, order_id, company_id, production_date, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        productionId,
        pd.orderId,
        COMPANY_ID,
        pd.productionDate,
        pd.notes,
        pd.status,
      ]
    );

    for (const item of pd.items) {
      await client.query(
        `INSERT INTO production_schedule_items (id, production_schedule_id, description, category, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          randomUUID(),
          productionId,
          item.description,
          item.category,
          item.quantity,
        ]
      );
    }
  }

  // Seed delivery schedules (5 delivery schedules). `deliveryDate`
  // is the date the flowers are being dropped off at the venue,
  // which may or may not match the event start on the enquiry.
  // Items are normalised into `delivery_schedule_items` (see #16 in
  // Process-Flow-Review-2026-04-11.md). Per-item delivered booleans
  // from the old JSON shape are dropped -- the schedule-level
  // `status` column already captures whether the drop-off happened.
  const deliveryData = [
    {
      orderId: orderIds[0],
      deliveryDate: new Date("2026-06-15"),
      deliveryAddress: "Chelsea Town Hall, King's Road, London, SW3 5EE",
      items: [
        { description: "Bridal Bouquet", category: "arrangement", quantity: 1 },
        { description: "Bridesmaids Bouquets", category: "arrangement", quantity: 4 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 20 },
      ],
      notes: "Early morning delivery. Coordinate with venue manager. Contact: Sarah Johnson 020 7946 0958",
      status: "ready",
    },
    {
      orderId: orderIds[1],
      deliveryDate: new Date("2026-04-10"),
      deliveryAddress: "Canary Wharf Conference Centre, 40 Bank Street, London, E14 5ER",
      items: [
        { description: "Reception Arrangement", category: "arrangement", quantity: 1 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 50 },
      ],
      notes: "Delivery by 8 AM for morning event setup. Building security code required.",
      status: "pending",
    },
    {
      orderId: orderIds[2],
      deliveryDate: new Date("2026-04-05"),
      deliveryAddress: "St Mary Church, Kensington Church Street, London, W8 4LA",
      items: [
        { description: "Funeral Wreaths", category: "arrangement", quantity: 2 },
        { description: "Casket Spray", category: "arrangement", quantity: 1 },
      ],
      notes: "Delivery completed. Service took place as scheduled.",
      status: "delivered",
    },
    {
      // Previously this record pointed at orderIds[5] (the Mitchell
      // baby shower, which is a draft order for a Belgravia private
      // residence), but the delivery date, address, item list, and
      // venue contact all describe the Hayes wedding at Tower Bridge
      // Exhibition Hall (orderIds[3]). Fixed to reference the order
      // whose content this row actually represents.
      orderId: orderIds[3],
      deliveryDate: new Date("2026-09-12"),
      deliveryAddress: "Tower Bridge Exhibition Hall, Tower Bridge, London, SE1 2UP",
      items: [
        { description: "Bridal Bouquet", category: "arrangement", quantity: 1 },
        { description: "Bridesmaids Bouquets", category: "arrangement", quantity: 6 },
        { description: "Table Centrepieces", category: "arrangement", quantity: 30 },
      ],
      notes: "Large wedding. Multiple deliveries may be required. Venue contact: Rebecca Hayes 020 7654 3210",
      status: "dispatched",
    },
    {
      orderId: orderIds[9],
      deliveryDate: new Date("2026-07-02"),
      deliveryAddress: "Alexandra Palace, Alexandra Palace Way, London, N22 7AY",
      items: [
        { description: "Prom Entrance Flowers", category: "arrangement", quantity: 1 },
        { description: "Stage Arrangements", category: "arrangement", quantity: 2 },
      ],
      notes: "School prom event. Early afternoon delivery. Large event with many guests.",
      status: "pending",
    },
  ];

  for (const dd of deliveryData) {
    const deliveryId = randomUUID();
    await client.query(
      `INSERT INTO delivery_schedules (id, order_id, company_id, delivery_date, delivery_address, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        deliveryId,
        dd.orderId,
        COMPANY_ID,
        dd.deliveryDate,
        dd.deliveryAddress,
        dd.notes,
        dd.status,
      ]
    );

    for (const item of dd.items) {
      await client.query(
        `INSERT INTO delivery_schedule_items (id, delivery_schedule_id, description, category, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          randomUUID(),
          deliveryId,
          item.description,
          item.category,
          item.quantity,
        ]
      );
    }
  }
}

async function main() {
  // Seed is development-only. It drops/recreates tables and inserts
  // demo accounts with a known password. Refuse to run against prod.
  const allowProdSeed = process.env.ALLOW_PROD_SEED === "true";
  if (process.env.NODE_ENV === "production" && !allowProdSeed) {
    throw new Error(
      "Refusing to run seed script in production. " +
        "If you really want to seed a production database, set " +
        "ALLOW_PROD_SEED=true in the environment."
    );
  }

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
