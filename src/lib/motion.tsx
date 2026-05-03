import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type MotionPref = "system" | "on" | "off";
const KEY = "marhabo:motion";

interface Ctx { pref: MotionPref; setPref: (p: MotionPref) => void; reduced: boolean; }
const MotionContext = createContext<Ctx | null>(null);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<MotionPref>("system");
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as MotionPref | null;
    if (saved === "on" || saved === "off" || saved === "system") setPrefState(saved);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const reduced = pref === "off" ? true : pref === "on" ? false : systemReduced;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reduced);
    root.classList.toggle("force-motion", pref === "on");
  }, [reduced, pref]);

  const setPref = (p: MotionPref) => {
    setPrefState(p);
    try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
  };

  return <MotionContext.Provider value={{ pref, setPref, reduced }}>{children}</MotionContext.Provider>;
}

export function useMotion() {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion outside provider");
  return ctx;
}
