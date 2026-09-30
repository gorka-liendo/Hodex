CREATE TYPE "public"."expense_category" AS ENUM('software', 'hardware', 'professional_services', 'marketing', 'travel', 'meals', 'training', 'utilities', 'rent', 'insurance', 'bank_fees', 'taxes_fees', 'other');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid,
	"issue_date" date NOT NULL,
	"invoice_number" text,
	"description" text NOT NULL,
	"category" "expense_category" NOT NULL,
	"base_cents" bigint NOT NULL,
	"vat_rate_bp" integer NOT NULL,
	"vat_cents" bigint NOT NULL,
	"irpf_rate_bp" integer DEFAULT 0 NOT NULL,
	"irpf_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint NOT NULL,
	"vat_deductible" boolean DEFAULT true NOT NULL,
	"paid_on" date,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_rates_range" CHECK ("expenses"."vat_rate_bp" BETWEEN 0 AND 10000 AND "expenses"."irpf_rate_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "expenses_total_consistent" CHECK ("expenses"."total_cents" = "expenses"."base_cents" + "expenses"."vat_cents" - "expenses"."irpf_cents")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_contacts_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_issue_date_idx" ON "expenses" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX "expenses_supplier_id_idx" ON "expenses" USING btree ("supplier_id");