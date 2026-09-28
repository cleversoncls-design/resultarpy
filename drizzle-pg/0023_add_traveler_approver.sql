ALTER TABLE "travelers" ADD COLUMN IF NOT EXISTS "approver_id" bigint REFERENCES "users"("id");
