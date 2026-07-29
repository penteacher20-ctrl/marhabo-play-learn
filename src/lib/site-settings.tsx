import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  logo_url: string | null;
  favicon_url: string | null;
}

const defaultSettings: SiteSettings = { logo_url: null, favicon_url: null };

const SiteSettingsContext = createContext<{
  settings: SiteSettings;
  refresh: () => Promise<void>;
}>({ settings: defaultSettings, refresh: async () => {} });

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);

  const refresh = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("logo_url, favicon_url")
      .eq("id", "main")
      .maybeSingle();
    if (data) setSettings({ logo_url: data.logo_url, favicon_url: data.favicon_url });
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("site_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update favicon dynamically
  useEffect(() => {
    if (typeof document === "undefined") return;
    const href = settings.favicon_url;
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [settings.favicon_url]);

  return (
    <SiteSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
