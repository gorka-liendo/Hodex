CREATE TYPE "public"."inbound_status" AS ENUM('received', 'processed', 'blocked', 'failed', 'dismissed');--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_email_id" text NOT NULL,
	"from_address" text NOT NULL,
	"subject" text,
	"received_at" timestamp with time zone NOT NULL,
	"status" "inbound_status" NOT NULL,
	"attachment_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbound_emails_provider_email_id_unique" UNIQUE("provider_email_id")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "inbound_email_id" uuid;--> statement-breakpoint
CREATE INDEX "inbound_emails_received_at_idx" ON "inbound_emails" USING btree ("received_at");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_inbound_email_id_inbound_emails_id_fk" FOREIGN KEY ("inbound_email_id") REFERENCES "public"."inbound_emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_inbound_email_id_idx" ON "attachments" USING btree ("inbound_email_id");