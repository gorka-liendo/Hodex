-- El registro de auditoría es de solo inserción. Estos triggers rechazan
-- cualquier UPDATE, DELETE o TRUNCATE, venga de la aplicación o de una consulta
-- manual, para que nadie pueda borrar el rastro de lo ocurrido.
CREATE FUNCTION "audit_log_reject_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es de solo inserción (% no permitido)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_log_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_reject_mutation"();
--> statement-breakpoint
CREATE TRIGGER "audit_log_no_truncate"
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_reject_mutation"();
