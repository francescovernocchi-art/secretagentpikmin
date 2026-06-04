
CREATE TABLE public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_user_id uuid,
  actor_agent text,
  target_table text,
  target_id text,
  action text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_audit_logs TO authenticated;
GRANT ALL ON public.security_audit_logs TO service_role;

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only papa can read audit logs"
ON public.security_audit_logs FOR SELECT
TO authenticated
USING (public.current_agent_key() = 'papa');

CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs (created_at DESC);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs (event_type);
CREATE INDEX idx_security_audit_logs_actor ON public.security_audit_logs (actor_user_id);

-- Trigger function for message writes (logs metadata only, no content)
CREATE OR REPLACE FUNCTION public.log_message_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_logs (event_type, actor_user_id, actor_agent, target_table, target_id, action, details)
  VALUES (
    'message_write',
    auth.uid(),
    public.current_agent_key()::text,
    TG_TABLE_NAME,
    NEW.id::text,
    TG_OP,
    jsonb_build_object(
      'channel', CASE WHEN TG_TABLE_NAME = 'family_chat_messages' THEN NEW.channel ELSE NULL END,
      'sender', CASE WHEN TG_TABLE_NAME = 'family_chat_messages' THEN NEW.sender_agent ELSE NEW.sender END,
      'content_length', COALESCE(length(NEW.content), 0)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_family_chat_messages
AFTER INSERT ON public.family_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.log_message_write();

CREATE TRIGGER trg_audit_messages
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.log_message_write();

-- Helper function for admin actions, callable from server functions
CREATE OR REPLACE FUNCTION public.log_admin_action(_action text, _target_table text DEFAULT NULL, _target_id text DEFAULT NULL, _details jsonb DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_agent text;
BEGIN
  v_agent := public.current_agent_key()::text;
  INSERT INTO public.security_audit_logs (event_type, actor_user_id, actor_agent, target_table, target_id, action, details)
  VALUES ('admin_action', auth.uid(), v_agent, _target_table, _target_id, _action, _details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) TO authenticated;
