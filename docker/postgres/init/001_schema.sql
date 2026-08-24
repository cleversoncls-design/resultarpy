CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('Viajante', 'Aprovador', 'Administrativo')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  city VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travelers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id),
  unit_id BIGINT REFERENCES units(id),
  name VARCHAR(160) NOT NULL,
  document_number VARCHAR(40),
  can_drive BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL UNIQUE,
  billing_currency CHAR(3) NOT NULL DEFAULT 'BRL',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_billing_limits (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  expense_type_id BIGINT NOT NULL REFERENCES expense_types(id),
  limit_amount NUMERIC(14, 2) NOT NULL CHECK (limit_amount >= 0),
  UNIQUE (client_id, expense_type_id)
);

CREATE TABLE IF NOT EXISTS reimbursement_limits (
  id BIGSERIAL PRIMARY KEY,
  expense_type_id BIGINT NOT NULL REFERENCES expense_types(id),
  city VARCHAR(120) NOT NULL,
  limit_amount NUMERIC(14, 2) NOT NULL CHECK (limit_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  UNIQUE (expense_type_id, city)
);

CREATE TABLE IF NOT EXISTS trips (
  id BIGSERIAL PRIMARY KEY,
  trip_code VARCHAR(40) NOT NULL UNIQUE,
  traveler_id BIGINT NOT NULL REFERENCES travelers(id),
  approver_id BIGINT REFERENCES app_users(id),
  client_id BIGINT REFERENCES clients(id),
  origin VARCHAR(120) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('Rascunho', 'Aguardando aprovação', 'Aprovada', 'Em preparação', 'Em prestação', 'Finalizada', 'Rejeitada')),
  requires_fleet_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  advance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS trip_expenses (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_type_id BIGINT NOT NULL REFERENCES expense_types(id),
  occurred_on DATE NOT NULL,
  city VARCHAR(120) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  receipt_uri TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_reasons (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  category VARCHAR(32) NOT NULL CHECK (category IN ('Preventiva', 'Corretiva')),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGSERIAL PRIMARY KEY,
  plate VARCHAR(16) NOT NULL UNIQUE,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(100) NOT NULL,
  model_year INTEGER NOT NULL CHECK (model_year BETWEEN 1950 AND 2200),
  color VARCHAR(60),
  unit_id BIGINT NOT NULL REFERENCES units(id),
  current_km INTEGER NOT NULL DEFAULT 0 CHECK (current_km >= 0),
  last_maintenance_km INTEGER NOT NULL DEFAULT 0 CHECK (last_maintenance_km >= 0),
  maintenance_interval_km INTEGER NOT NULL CHECK (maintenance_interval_km > 0),
  fire_extinguisher_expires_on DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Reservado', 'Em viagem', 'Realizar Manutenção', 'Em manutenção', 'Extintor próximo do vencimento', 'Avaria registrada')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_reservations (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
  driver_id BIGINT NOT NULL REFERENCES travelers(id),
  status VARCHAR(32) NOT NULL DEFAULT 'Reservado' CHECK (status IN ('Reservado', 'Em viagem', 'Finalizada', 'Cancelada')),
  departure_at TIMESTAMPTZ,
  departure_km INTEGER CHECK (departure_km IS NULL OR departure_km >= 0),
  return_at TIMESTAMPTZ,
  return_km INTEGER CHECK (return_km IS NULL OR return_km >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (return_km IS NULL OR departure_km IS NULL OR return_km >= departure_km)
);

CREATE TABLE IF NOT EXISTS fleet_events (
  id BIGSERIAL PRIMARY KEY,
  reservation_id BIGINT NOT NULL REFERENCES fleet_reservations(id) ON DELETE CASCADE,
  event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('Multa', 'Avaria', 'Outro')),
  description TEXT NOT NULL,
  photo_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_work_orders (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
  reason_id BIGINT REFERENCES maintenance_reasons(id),
  maintenance_type VARCHAR(32) NOT NULL CHECK (maintenance_type IN ('Preventiva', 'Corretiva')),
  maintenance_date DATE NOT NULL,
  vehicle_km INTEGER NOT NULL CHECK (vehicle_km >= 0),
  observation TEXT,
  cost_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_date ON trip_expenses(trip_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_date ON fleet_work_orders(vehicle_id, maintenance_date);
