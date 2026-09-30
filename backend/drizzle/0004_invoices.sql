CREATE TYPE "public"."invoice_kind" AS ENUM('standard', 'rectifying');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued');--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"legal_name" text,
	"trade_name" text,
	"tax_id" text,
	"address_line" text,
	"postal_code" text,
	"city" text,
	"province" text,
	"country" text DEFAULT 'ES' NOT NULL,
	"email" text,
	"phone" text,
	"iban" text,
	"payment_term_days" integer DEFAULT 30 NOT NULL,
	"invoice_footer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_singleton" CHECK ("company_settings"."id" = 1),
	CONSTRAINT "company_settings_payment_term" CHECK ("company_settings"."payment_term_days" BETWEEN 0 AND 365)
);
--> statement-breakpoint
CREATE TABLE "invoice_chain" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_hash" text,
	"last_invoice_id" uuid,
	CONSTRAINT "invoice_chain_singleton" CHECK ("invoice_chain"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"series" text NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer NOT NULL,
	CONSTRAINT "invoice_counters_series_year_pk" PRIMARY KEY("series","year")
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity_milli" integer NOT NULL,
	"unit_price_cents" bigint NOT NULL,
	"vat_rate_bp" integer NOT NULL,
	"base_cents" bigint NOT NULL,
	CONSTRAINT "invoice_lines_vat_range" CHECK ("invoice_lines"."vat_rate_bp" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"kind" "invoice_kind" DEFAULT 'standard' NOT NULL,
	"series" text,
	"year" integer,
	"number" integer,
	"full_number" text,
	"client_id" uuid NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"rectifies_invoice_id" uuid,
	"rectification_reason" text,
	"irpf_rate_bp" integer DEFAULT 0 NOT NULL,
	"base_cents" bigint DEFAULT 0 NOT NULL,
	"vat_cents" bigint DEFAULT 0 NOT NULL,
	"irpf_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"internal_notes" text,
	"issuer_snapshot" jsonb,
	"client_snapshot" jsonb,
	"issued_at" timestamp with time zone,
	"hash" text,
	"previous_hash" text,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_series_valid" CHECK ("invoices"."series" IS NULL OR "invoices"."series" IN ('F', 'R')),
	CONSTRAINT "invoices_issued_complete" CHECK ("invoices"."status" = 'draft' OR ("invoices"."full_number" IS NOT NULL AND "invoices"."hash" IS NOT NULL AND "invoices"."issued_at" IS NOT NULL AND "invoices"."issuer_snapshot" IS NOT NULL AND "invoices"."client_snapshot" IS NOT NULL)),
	CONSTRAINT "invoices_total_consistent" CHECK ("invoices"."total_cents" = "invoices"."base_cents" + "invoices"."vat_cents" - "invoices"."irpf_cents"),
	CONSTRAINT "invoices_rectifying_has_origin" CHECK ("invoices"."kind" = 'standard' OR ("invoices"."rectifies_invoice_id" IS NOT NULL AND "invoices"."rectification_reason" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_contacts_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rectifies_invoice_id_invoices_id_fk" FOREIGN KEY ("rectifies_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_full_number_key" ON "invoices" USING btree ("full_number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_series_year_number_key" ON "invoices" USING btree ("series","year","number");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_issue_date_idx" ON "invoices" USING btree ("issue_date");