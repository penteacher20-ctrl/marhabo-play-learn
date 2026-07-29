
CREATE TABLE public.suggestion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL DEFAULT '',
  image_paths text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX suggestion_messages_thread_idx ON public.suggestion_messages(suggestion_id, created_at);

GRANT SELECT, INSERT ON public.suggestion_messages TO authenticated;
GRANT ALL ON public.suggestion_messages TO service_role;

ALTER TABLE public.suggestion_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin thread"
  ON public.suggestion_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.suggestions s WHERE s.id = suggestion_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Insert own or admin message"
  ON public.suggestion_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.suggestions s WHERE s.id = suggestion_id AND s.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestion_messages;
