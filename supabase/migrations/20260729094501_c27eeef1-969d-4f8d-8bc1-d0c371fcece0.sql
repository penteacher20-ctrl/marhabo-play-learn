CREATE TABLE public.site_settings (
  id text NOT NULL PRIMARY KEY DEFAULT 'main',
  logo_url text,
  favicon_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings readable by all"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;
