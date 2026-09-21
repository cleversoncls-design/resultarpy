BEGIN;

DELETE FROM trips;
DELETE FROM fleet_work_orders;
DELETE FROM currency_rates;

UPDATE vehicles SET current_km = last_maintenance_km, status = 'Disponível';

ALTER SEQUENCE trips_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_reservations_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_events_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_event_photos_id_seq RESTART WITH 1;
ALTER SEQUENCE trip_expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE trip_approvals_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_work_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE currency_rates_id_seq RESTART WITH 1;

COMMIT;
