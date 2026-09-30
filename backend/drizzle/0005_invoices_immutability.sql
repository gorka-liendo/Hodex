-- Inmutabilidad de las facturas emitidas, garantizada por la base de datos
-- (no depende de que la aplicación no tenga fallos):
--   · una factura emitida no se puede borrar;
--   · no se puede modificar salvo para registrar su cobro (paid_on);
--   · sus líneas no se pueden añadir, cambiar ni borrar.
-- Los errores se corrigen con una factura rectificativa.

CREATE FUNCTION "invoices_guard_issued"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'issued' THEN
      RAISE EXCEPTION 'Una factura emitida no se puede eliminar (%)', OLD.full_number
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'issued' THEN
    -- Todo igual salvo el cobro y la marca de actualización.
    IF (to_jsonb(NEW) - 'paid_on' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'paid_on' - 'updated_at') THEN
      RAISE EXCEPTION 'Una factura emitida no se puede modificar (%)', OLD.full_number
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "invoices_guard_issued"
  BEFORE UPDATE OR DELETE ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION "invoices_guard_issued"();
--> statement-breakpoint
CREATE FUNCTION "invoice_lines_guard_issued"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "invoices"
    WHERE status = 'issued'
      AND id IN (
        CASE WHEN TG_OP <> 'INSERT' THEN OLD.invoice_id END,
        CASE WHEN TG_OP <> 'DELETE' THEN NEW.invoice_id END
      )
  ) THEN
    RAISE EXCEPTION 'Las líneas de una factura emitida no se pueden modificar'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "invoice_lines_guard_issued"
  BEFORE INSERT OR UPDATE OR DELETE ON "invoice_lines"
  FOR EACH ROW EXECUTE FUNCTION "invoice_lines_guard_issued"();
--> statement-breakpoint
-- Eslabón inicial de la cadena de huellas.
INSERT INTO "invoice_chain" ("id", "last_hash") VALUES (1, NULL);
