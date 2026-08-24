INSERT INTO app_users (name, email, role)
VALUES
  ('Mariana Lopes', 'mariana.admin@demo.local', 'Administrativo'),
  ('Rafael Souza', 'rafael.aprovador@demo.local', 'Aprovador'),
  ('Camila Mendes', 'camila.viajante@demo.local', 'Viajante')
ON CONFLICT (email) DO NOTHING;

INSERT INTO units (code, name, city)
VALUES
  ('UN-001', 'Matriz Curitiba', 'Curitiba'),
  ('UN-002', 'Filial Oeste', 'Foz do Iguaçu')
ON CONFLICT (code) DO NOTHING;

INSERT INTO travelers (user_id, unit_id, name, document_number, can_drive)
SELECT u.id, un.id, data.name, data.document_number, data.can_drive
FROM (VALUES
  ('camila.viajante@demo.local', 'UN-001', 'Camila Mendes', '000.000.000-01', TRUE),
  ('rafael.aprovador@demo.local', 'UN-002', 'Rafael Souza', '000.000.000-02', TRUE),
  (NULL, 'UN-001', 'Mariana Lopes', '000.000.000-03', FALSE)
) AS data(email, unit_code, name, document_number, can_drive)
LEFT JOIN app_users u ON u.email = data.email
JOIN units un ON un.code = data.unit_code
WHERE NOT EXISTS (
  SELECT 1 FROM travelers existing WHERE existing.name = data.name
);

INSERT INTO clients (name, billing_currency)
VALUES
  ('AgroNorte S.A.', 'BRL'),
  ('Cooperativa Central', 'BRL')
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_types (name, description)
VALUES
  ('Alimentação', 'Refeições durante a viagem'),
  ('Hospedagem', 'Diárias de hotel'),
  ('Combustível', 'Abastecimento do veículo')
ON CONFLICT (name) DO NOTHING;

INSERT INTO maintenance_reasons (name, category)
VALUES
  ('Revisão periódica', 'Preventiva'),
  ('Troca de pneus', 'Preventiva'),
  ('Avaria em viagem', 'Corretiva')
ON CONFLICT (name) DO NOTHING;

INSERT INTO client_billing_limits (client_id, expense_type_id, limit_amount)
SELECT c.id, e.id, data.limit_amount
FROM (VALUES
  ('AgroNorte S.A.', 'Hospedagem', 80.00),
  ('AgroNorte S.A.', 'Alimentação', 65.00),
  ('Cooperativa Central', 'Hospedagem', 90.00)
) AS data(client_name, expense_name, limit_amount)
JOIN clients c ON c.name = data.client_name
JOIN expense_types e ON e.name = data.expense_name
ON CONFLICT (client_id, expense_type_id) DO NOTHING;

INSERT INTO reimbursement_limits (expense_type_id, city, limit_amount, currency)
SELECT e.id, data.city, data.limit_amount, 'BRL'
FROM (VALUES
  ('Hospedagem', 'Curitiba', 80.00),
  ('Hospedagem', 'Foz do Iguaçu', 95.00),
  ('Alimentação', 'Curitiba', 65.00),
  ('Alimentação', 'Foz do Iguaçu', 75.00),
  ('Combustível', 'Foz do Iguaçu', 250.00)
) AS data(expense_name, city, limit_amount)
JOIN expense_types e ON e.name = data.expense_name
ON CONFLICT (expense_type_id, city) DO NOTHING;

INSERT INTO vehicles (plate, brand, model, model_year, color, unit_id, current_km, last_maintenance_km, maintenance_interval_km, fire_extinguisher_expires_on, status, notes)
SELECT data.plate, data.brand, data.model, data.model_year, data.color, un.id, data.current_km, data.last_maintenance_km, data.maintenance_interval_km, data.fire_extinguisher_expires_on::date, data.status, data.notes
FROM (VALUES
  ('ABC1D23', 'Toyota', 'Corolla Cross', 2024, 'Prata', 'UN-001', 74820, 65000, 10000, '2027-03-15', 'Disponível', 'Veículo executivo da matriz'),
  ('XYZ9K87', 'Fiat', 'Toro', 2023, 'Branca', 'UN-002', 42100, 40000, 10000, '2026-09-10', 'Extintor próximo do vencimento', 'Uso compartilhado da filial')
) AS data(plate, brand, model, model_year, color, unit_code, current_km, last_maintenance_km, maintenance_interval_km, fire_extinguisher_expires_on, status, notes)
JOIN units un ON un.code = data.unit_code
ON CONFLICT (plate) DO NOTHING;

INSERT INTO trips (trip_code, traveler_id, approver_id, client_id, origin, destination, starts_on, ends_on, status, requires_fleet_vehicle, advance_amount)
SELECT 'TR-2026-031', t.id, a.id, c.id, 'Curitiba', 'Foz do Iguaçu', '2026-08-18', '2026-08-21', 'Em prestação', TRUE, 1280.00
FROM travelers t
JOIN app_users a ON a.email = 'rafael.aprovador@demo.local'
JOIN clients c ON c.name = 'AgroNorte S.A.'
WHERE t.name = 'Camila Mendes'
ON CONFLICT (trip_code) DO NOTHING;

INSERT INTO trip_expenses (trip_id, expense_type_id, occurred_on, city, quantity, amount, notes)
SELECT tr.id, et.id, data.occurred_on::date, data.city, data.quantity, data.amount, data.notes
FROM (VALUES
  ('TR-2026-031', 'Hospedagem', '2026-08-19', 'Foz do Iguaçu', 1, 86.00, 'Diária do hotel'),
  ('TR-2026-031', 'Alimentação', '2026-08-19', 'Foz do Iguaçu', 2, 120.00, 'Almoço e jantar')
) AS data(trip_code, expense_name, occurred_on, city, quantity, amount, notes)
JOIN trips tr ON tr.trip_code = data.trip_code
JOIN expense_types et ON et.name = data.expense_name
WHERE NOT EXISTS (
  SELECT 1 FROM trip_expenses existing
  WHERE existing.trip_id = tr.id AND existing.occurred_on = data.occurred_on::date AND existing.amount = data.amount
);

INSERT INTO fleet_reservations (trip_id, vehicle_id, driver_id, status, departure_at, departure_km)
SELECT tr.id, v.id, d.id, 'Em viagem', '2026-08-18 08:00:00+00', 74101
FROM trips tr
JOIN vehicles v ON v.plate = 'ABC1D23'
JOIN travelers d ON d.name = 'Camila Mendes'
WHERE tr.trip_code = 'TR-2026-031'
  AND NOT EXISTS (SELECT 1 FROM fleet_reservations r WHERE r.trip_id = tr.id);

INSERT INTO fleet_work_orders (vehicle_id, reason_id, maintenance_type, maintenance_date, vehicle_km, observation, cost_amount)
SELECT v.id, r.id, 'Preventiva', '2026-07-12', 65000, 'Revisão de 65 mil km', 1840.00
FROM vehicles v
JOIN maintenance_reasons r ON r.name = 'Revisão periódica'
WHERE v.plate = 'ABC1D23'
  AND NOT EXISTS (SELECT 1 FROM fleet_work_orders wo WHERE wo.vehicle_id = v.id AND wo.vehicle_km = 65000);
