/**
 * AdSlot — OPTIONAL, NOT USED ANYWHERE YET.
 *
 * Purpose: a single, self-contained place to render an advertising unit *only*
 * inside the signed-in adult teacher area (e.g. the dashboard). It loads the
 * AdSense script lazily on mount, so no ad code is ever fetched on pages that
 * children may see.
 *
 * HARD RULES before using this component:
 *  1. Render it ONLY on pages behind authentication that are meant for adult
 *     teachers/parents (dashboard, settings, suggestions).
 *  2. NEVER render it on the home page, templates, any play screen, or any
 *     child-facing interface, and never in a shared layout such as
 *     src/routes/__root.tsx, Navbar, Footer or PageShell.
 *  3. Keep the AdSense script out of the global <head>. This component is the
 *     only loader.
 *  4. Update the privacy policy in the same change that first enables ads.
 *
 * Usage (future):
 *   {user && <AdSlot slot="1234567890" />}
 */
import { useEffect, useRef, useState } from "react";

const AD_CLIENT = "ca-pub-8374144873772547";
const SCRIPT_ID = "marhabo-adsense-script";

/** Set to true only when ads are intentionally launched for the adult area. */
export const ADS_ENABLED = false;

export function AdSlot({ slot, className }: { slot: string; className?: string }) {
  const ref = useRef<HTMLModElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ADS_ENABLED) return;
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
      document.head.appendChild(s);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      /* ad rendering is non-critical */
    }
  }, [ready]);

  if (!ADS_ENABLED) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle block ${className ?? ""}`}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
