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

    // Usuarios fixos usados pelos testes automatizados (CI) -- sem
    // eles, getUserByOpenId('seed-admin'/'seed-approver') retorna
    // undefined e os testes falham.
    await client.query(`
      INSERT INTO users ("openId", name, role, profile)
      VALUES
        ('seed-admin', 'CI Admin', 'admin', 'admin'),
        ('seed-approver', 'CI Approver', 'user', 'approver')
      ON CONFLICT ("openId") DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        profile = EXCLUDED.profile
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

    // Viajante de teste, vinculado ao usuario seed-approver e a unidade
    // Sao Paulo -- necessario para os testes automatizados de CRUD de
    // viagem (que exigem pelo menos um viajante, uma unidade, um
    // cliente e um tipo de gasto ja cadastrados).
    await client.query(`
      INSERT INTO travelers (user_id, unit_id, name, document_number, can_drive, active)
      SELECT u.id, un.id, 'Viajante Teste CI', '00000000000', true, true
      FROM users u, units un
      WHERE u."openId" = 'seed-approver' AND un.code = 'SP-CAP'
      AND NOT EXISTS (SELECT 1 FROM travelers WHERE name = 'Viajante Teste CI')
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
      INSERT INTO vehicles (plate, brand, model, model_year, color, unit_id, current_km, last_maintenance_km, maintenance_interval_km, fire_extinguisher_expires_on, status, notes)
      SELECT 'ABC1D23', 'Toyota', 'Corolla', 2024, 'Prata', un.id, 74101, 65000, 10000, '2026-12-31', 'Disponível', 'Veículo inicial do ambiente local'
      FROM units un WHERE un.code = 'SP-CAP'
      ON CONFLICT (plate) DO UPDATE SET
        brand = EXCLUDED.brand,
        model = EXCLUDED.model,
        unit_id = EXCLUDED.unit_id,
        status = 'Disponível'
    `);

    await client.query(`
	INSERT INTO maintenance_reasons (name, category)
	SELECT name, category::maintenance_category FROM (VALUES
  	('Revisão periódica', 'Preventiva'),
  	('Avaria mecânica', 'Corretiva'),
  	('Troca de pneus', 'Preventiva')
	) AS defaults(name, category)
	WHERE NOT EXISTS (SELECT 1 FROM maintenance_reasons)     
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
