CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_client" boolean DEFAULT true NOT NULL,
	"is_supplier" boolean DEFAULT false NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"tax_id" text,
	"country" text DEFAULT 'ES' NOT NULL,
	"email" text,
	"phone" text,
	"address_line" text,
	"postal_code" text,
	"city" text,
	"province" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_has_role" CHECK ("contacts"."is_client" OR "contacts"."is_supplier"),
	CONSTRAINT "contacts_country_iso" CHECK ("contacts"."country" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tax_id_active_key" ON "contacts" USING btree ("country","tax_id") WHERE "contacts"."tax_id" IS NOT NULL AND "contacts"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "contacts_legal_name_idx" ON "contacts" USING btree ("legal_name");