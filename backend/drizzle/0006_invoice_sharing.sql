CREATE TYPE "public"."invoice_send_channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TABLE "invoice_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"channel" "invoice_send_channel" NOT NULL,
	"recipient" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_by" uuid
);
--> statement-breakpoint
CREATE TABLE "invoice_share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	CONSTRAINT "invoice_share_links_expiry" CHECK ("invoice_share_links"."expires_at" > "invoice_share_links"."created_at")
);
--> statement-breakpoint
ALTER TABLE "invoice_sends" ADD CONSTRAINT "invoice_sends_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_sends" ADD CONSTRAINT "invoice_sends_sent_by_admin_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_share_links" ADD CONSTRAINT "invoice_share_links_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_share_links" ADD CONSTRAINT "invoice_share_links_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_sends_invoice_id_idx" ON "invoice_sends" USING btree ("invoice_id","sent_at");--> statement-breakpoint
CREATE INDEX "invoice_share_links_invoice_id_idx" ON "invoice_share_links" USING btree ("invoice_id");