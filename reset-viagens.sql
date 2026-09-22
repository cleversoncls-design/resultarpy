BEGIN;

DELETE FROM trips;
DELETE FROM vehicles WHERE id = 26;
DELETE FROM units WHERE id IN (45, 46);

ALTER SEQUENCE trips_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_reservations_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_events_id_seq RESTART WITH 1;
ALTER SEQUENCE fleet_event_photos_id_seq RESTART WITH 1;
ALTER SEQUENCE trip_expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE trip_approvals_id_seq RESTART WITH 1;

COMMIT;
