import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString?.startsWith("postgres://") && !connectionString?.startsWith("postgresql://")) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection string");
}

const pool = new Pool({ connectionString });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO users ("openId", name, email, role)
      VALUES
        ('seed-admin', 'Administrador de demonstração', 'admin@controle.local', 'admin'),
        ('seed-approver', 'Aprovador de demonstração', 'aprovador@controle.local', 'user'),
        ('seed-traveler', 'Viajante de demonstração', 'viajante@controle.local', 'user')
      ON CONFLICT ("openId") DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        "updatedAt" = now()
    `);

    await client.query(`
      INSERT INTO units (code, name, city)
      VALUES
        ('SP-CAP', 'Unidade São Paulo', 'São Paulo'),
        ('PR-CWB', 'Unidade Curitiba', 'Curitiba')
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        active = true
    `);

    await client.query(`
      INSERT INTO clients (name, billing_currency)
      VALUES
        ('AgroNorte S.A.', 'BRL'),
        ('Indústria Horizonte Ltda.', 'BRL')
      ON CONFLICT (name) DO UPDATE SET
        billing_currency = EXCLUDED.billing_currency,
        active = true
    `);

    await client.query(`
      INSERT INTO expense_types (name, description)
      VALUES
        ('Hospedagem', 'Diárias de hotel durante a viagem'),
        ('Alimentação', 'Refeições durante a viagem'),
        ('Transporte', 'Deslocamentos e transporte local')
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        active = true
    `);

    await client.query(`
      INSERT INTO maintenance_reasons (name, category)
      VALUES
        ('Revisão periódica', 'Preventiva'),
        ('Avaria mecânica', 'Corretiva'),
        ('Troca de pneus', 'Preventiva')
      ON CONFLICT (name) DO UPDATE SET
        category = EXCLUDED.category,
        active = true
    `);

    await client.query(`
      INSERT INTO travelers (user_id, unit_id, name, document_number, can_drive)
      SELECT u.id, un.id, values.name, values.document_number, values.can_drive
      FROM (VALUES
        ('seed-traveler', 'Mariana Lopes', 'DEMO-001', false),
        ('seed-approver', 'Carlos Mendes', 'DEMO-002', true)
      ) AS values(open_id, name, document_number, can_drive)
      JOIN users u ON u."openId" = values.open_id
      JOIN units un ON un.code = 'SP-CAP'
      WHERE NOT EXISTS (
        SELECT 1 FROM travelers existing WHERE existing.document_number = values.document_number
      )
    `);

    await client.query("COMMIT");
    console.log("PostgreSQL seed completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void seed();
