CREATE TYPE "public"."approval_decision" AS ENUM('Aprovada', 'Rejeitada', 'Devolvida');--> statement-breakpoint
CREATE TYPE "public"."fleet_work_order_status" AS ENUM('Em andamento', 'Concluída', 'Cancelada');--> statement-breakpoint
ALTER TYPE "public"."reservation_status" ADD VALUE 'Aguardando veículo' BEFORE 'Reservado';--> statement-breakpoint
ALTER TYPE "public"."reservation_status" ADD VALUE 'Reservada' BEFORE 'Em viagem';--> statement-breakpoint
ALTER TYPE "public"."trip_status" ADD VALUE 'Liberada para viagem' BEFORE 'Em prestação';--> statement-breakpoint
ALTER TYPE "public"."trip_status" ADD VALUE 'Devolvida';