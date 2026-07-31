import { useEffect, useState } from "react";

/** True when the app is rendered inside an iframe or ?embed=1 is present. */
export function detectEmbed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("embed") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access throws → we are framed.
    return true;
  }
}

/**
 * Embed mode flag. Always false during SSR/first render to avoid hydration
 * mismatches, then flips on after mount.
 */
export function useEmbed(): boolean {
  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    setEmbed(detectEmbed());
  }, []);
  return embed;
}

/** Adds `lov-embed` to <html> when framed, so global CSS can adapt. */
export function EmbedModeEffect() {
  const embed = useEmbed();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("lov-embed", embed);
    return () => root.classList.remove("lov-embed");
  }, [embed]);
  return null;
}

/** Locks scrolling for full-bleed embedded experiences (game player). */
export function useEmbedFullBleed(active: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (!active) return;
    root.classList.add("lov-embed-full");
    return () => root.classList.remove("lov-embed-full");
  }, [active]);
}
