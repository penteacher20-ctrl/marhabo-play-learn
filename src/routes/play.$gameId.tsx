import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { generateColoring } from "@/lib/templates";

export const Route = createFileRoute("/play/$gameId")({ component: PlayPage });

interface Game { id: string; title: string; description: string | null; type: string; file_url: string | null; user_id: string; play_count: number; }

type FitMode = "auto" | "fit" | "fill" | "stretch";

function extractColoringImageUrl(html: string): string | null {
  const m = html.match(/const\s+SRC\s*=\s*("([^"]+)"|'([^']+)')/);
  return m ? (m[2] ?? m[3] ?? null) : null;
}

function PlayPage() {
  const { gameId } = Route.useParams();
  const { tr } = useI18n();
  const [game, setGame] = useState<Game | null>(null);
  const [creator, setCreator] = useState<string>("");
  const [showEmbed, setShowEmbed] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fit, setFit] = useState<FitMode>("auto");
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
      if (data) {
        setGame(data as Game);
        await supabase.from("games").update({ play_count: (data as Game).play_count + 1 }).eq("id", gameId);
        const { data: p } = await supabase.from("profiles").select("name").eq("id", (data as Game).user_id).maybeSingle();
        if (p) setCreator((p as any).name ?? "");
        if ((data as Game).file_url) {
          try {
            const res = await fetch((data as Game).file_url!);
            let txt = await res.text();
            const isColoring = (data as Game).type === "template:draw" && /const\s+SRC\s*=/.test(txt);
            const imageUrl = isColoring ? extractColoringImageUrl(txt) : null;
            if (imageUrl) {
              txt = generateColoring({ title: (data as Game).title, imageUrl });
            }
            txt = txt.replace(
              ".card{display:none!important}",
              ".card{display:contents!important;max-width:none!important;width:auto!important;padding:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}",
            );
            // Ensure responsive viewport meta inside the game
            if (!/name=["']viewport["']/i.test(txt)) {
              txt = txt.replace(
                /<head([^>]*)>/i,
                `<head$1><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />`,
              );
            }
            // Inject auto-resize helper that fires resize on orientation change
            const resizeScript = `<script>(function(){function fire(){try{window.dispatchEvent(new Event('resize'));}catch(e){}}window.addEventListener('orientationchange',function(){setTimeout(fire,150);});window.addEventListener('message',function(e){if(e&&e.data==='lov-fit')fire();});setTimeout(fire,200);})();</script>`;
            txt = txt.includes("</body>") ? txt.replace("</body>", `${resizeScript}</body>`) : txt + resizeScript;
            setHtml(txt);
          } catch { /* ignore */ }
        }
      }
    })();
  }, [gameId]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Notify iframe to refit when fit mode changes or fullscreen toggles
  useEffect(() => {
    const t = setTimeout(() => {
      try { iframeRef.current?.contentWindow?.postMessage("lov-fit", "*"); } catch { /* noop */ }
    }, 250);
    return () => clearTimeout(t);
  }, [fit, isFullscreen]);

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        try { await (screen.orientation as any)?.lock?.("landscape"); } catch { /* ignore */ }
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      toast.error("تعذر تفعيل ملء الشاشة");
    }
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${gameId}` : "";
  const embed = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success(tr("copied")); };

  if (!game) return <div className="min-h-screen grid place-items-center">جاري التحميل...</div>;

  // Compute iframe sizing styles based on fit mode
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const effectiveFit: FitMode = fit === "auto" ? (isMobile ? "fill" : "fit") : fit;
  const iframeStyle: React.CSSProperties = (() => {
    switch (effectiveFit) {
      case "fill":
        return { width: "100%", height: "100%" };
      case "stretch":
        return { width: "100%", height: "100%", transform: "none" };
      case "fit":
      default:
        return { width: "100%", height: "100%" };
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isFullscreen && <Navbar />}
      {!isFullscreen && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background/80 backdrop-blur">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-display font-extrabold truncate">{game.title}</h1>
            {creator && <p className="text-xs text-muted-foreground truncate">بواسطة {creator}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">المقاس:</label>
            <select
              value={fit}
              onChange={(e) => setFit(e.target.value as FitMode)}
              className="text-xs rounded-md border border-border bg-background px-2 py-1"
              aria-label="ضبط مقاس الكانفاس"
            >
              <option value="auto">تلقائي</option>
              <option value="fit">احتواء</option>
              <option value="fill">ملء الشاشة</option>
              <option value="stretch">تمدد</option>
            </select>
            <button onClick={toggleFullscreen} className="bubble-btn !py-1.5 !px-4 text-xs text-white" style={{ background: "var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))" }}>⛶ ملء الشاشة</button>
            <button onClick={() => copy(shareUrl)} className="bubble-btn !py-1.5 !px-4 text-xs text-white" style={{ background: "var(--gradient-fresh)" }}>🔗 {tr("share_link")}</button>
            <button onClick={() => setShowEmbed(!showEmbed)} className="bubble-btn !py-1.5 !px-4 text-xs text-foreground" style={{ background: "var(--yellow-fun)" }}>📋 {tr("embed_code")}</button>
          </div>
        </div>
      )}
      {showEmbed && !isFullscreen && (
        <pre onClick={() => copy(embed)} className="cursor-pointer text-xs bg-secondary/60 px-3 py-2 overflow-x-auto">{embed}</pre>
      )}
      <div ref={wrapRef} className="flex-1 min-h-0 relative bg-black">
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-10 rounded-full bg-black/60 text-white text-xs px-3 py-1.5 backdrop-blur hover:bg-black/80"
            aria-label="خروج من ملء الشاشة"
          >
            ✕ خروج
          </button>
        )}
        {html ? (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={game.title}
            className="block border-0"
            style={{ ...iframeStyle, minHeight: isFullscreen ? "100vh" : "calc(100vh - 110px)" }}
            sandbox="allow-scripts allow-same-origin allow-downloads"
            allowFullScreen
          />
        ) : game.file_url ? (
          <div className="grid place-items-center h-96 text-muted-foreground">جاري تحميل اللعبة...</div>
        ) : <div className="grid place-items-center h-96 text-muted-foreground">لا يوجد ملف</div>}
      </div>
    </div>
  );
}
