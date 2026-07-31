import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { generateColoring, generatePuzzle, generateMatching, generateWheel, generateQuiz, generateBlanks, generateTower, type TowerQuestion } from "@/lib/templates";
import { useEmbed, useEmbedFullBleed } from "@/lib/embed";

export const Route = createFileRoute("/play/$gameId")({ component: PlayPage });

interface Game { id: string; title: string; description: string | null; type: string; file_url: string | null; user_id: string; play_count: number; }

type FitMode = "auto" | "fit" | "fill" | "stretch";

function extractSrc(html: string): string | null {
  const m = html.match(/const\s+SRC\s*=\s*("([^"]+)"|'([^']+)')/);
  return m ? (m[2] ?? m[3] ?? null) : null;
}
function extractPuzzleGrid(html: string): number {
  const m = html.match(/(?:let|const|var)\s+ROWS\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 4;
}
// Parse `const NAME = <JSON>;` baked into template HTML. Templates always
// serialize their config via JSON.stringify so JSON.parse is safe here.
function extractJsonConst<T = unknown>(html: string, name: string): T | null {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\})\\s*;`);
  const m = html.match(re);
  if (!m) return null;
  try { return JSON.parse(m[1]) as T; } catch { return null; }
}
function extractMatchingBack(html: string): string | null {
  const m = html.match(/\.mm-back\s*\{\s*background-image:\s*url\(['"]([^'"]+)['"]\)/);
  return m ? m[1] : null;
}
function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return m ? m[1].trim() : fallback;
}


function PlayPage() {
  const { gameId } = Route.useParams();
  const { tr } = useI18n();
  const [game, setGame] = useState<Game | null>(null);
  const [creator, setCreator] = useState<string>("");
  const [showEmbed, setShowEmbed] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fit, setFit] = useState<FitMode>("auto");
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const embed = useEmbed();
  useEmbedFullBleed(embed);
  const chromeHidden = isFullscreen || embed;


  useEffect(() => {

    (async () => {
      const { data } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
      if (data) {
        setGame(data as Game);
        await supabase.from("games").update({ play_count: (data as Game).play_count + 1 }).eq("id", gameId);
        const { data: p } = await supabase.from("profiles").select("name").eq("id", (data as Game).user_id).maybeSingle();
        if (p) setCreator((p as any).name ?? "");
        if ((data as Game).type === "embed") {
          // External embed (Wordwall, YouTube, etc.) — render iframe src directly, skip fetch.
          return;
        }
        if ((data as Game).file_url) {
          try {
            setLoadError("");
            const fileUrl = (data as Game).file_url!;
            const res = await fetch(fileUrl);
            if (!res.ok) throw new Error(`تعذّر جلب ملف اللعبة (HTTP ${res.status})`);
            let txt = await res.text();
            if (!txt || txt.length < 20) throw new Error("ملف اللعبة فارغ أو تالف");

            // Runtime auto-upgrade: for every template type we can parse the
            // baked-in config out of the saved HTML and re-generate with the
            // latest template code. This transparently upgrades old games.
            const gtype = (data as Game).type || "";
            const gtitle = (data as Game).title;
            const isZip = gtype === "html-zip";
            try {
              if (gtype === "template:draw") {
                const imageUrl = extractSrc(txt);
                if (imageUrl) txt = generateColoring({ title: gtitle, imageUrl });
              } else if (gtype.startsWith("template:puzzle")) {
                const imageUrl = extractSrc(txt);
                if (imageUrl) {
                  const grid = extractPuzzleGrid(txt);
                  txt = generatePuzzle({ title: gtitle, imageUrl, rows: grid, cols: grid });
                }
              } else if (gtype === "template:matching") {
                const imgs = extractJsonConst<string[]>(txt, "IMGS");
                if (imgs && imgs.length) {
                  const backUrl = extractMatchingBack(txt) || "";
                  txt = generateMatching({ title: gtitle, images: imgs, backUrl });
                } else {
                  const pairs = extractJsonConst<{ a: string; b: string }[]>(txt, "P");
                  if (pairs) txt = generateMatching({ title: gtitle, pairs });
                }
              } else if (gtype === "template:wheel") {
                const items = extractJsonConst<string[]>(txt, "items");
                if (items) txt = generateWheel({ title: gtitle, items });
              } else if (gtype === "template:quiz") {
                const questions = extractJsonConst<{ q: string; options: string[]; correct: number }[]>(txt, "Q");
                if (questions) txt = generateQuiz({ title: gtitle, questions });
              } else if (gtype === "template:blanks") {
                const sentences = extractJsonConst<{ text: string; answers: string[] }[]>(txt, "S");
                if (sentences) txt = generateBlanks({ title: gtitle, sentences });
              } else if (gtype === "template:tower") {
                const qs = extractJsonConst<TowerQuestion[]>(txt, "Q");
                if (qs) txt = generateTower({ title: gtitle, questions: qs });
              }
            } catch (regenErr) {
              console.warn("template auto-upgrade failed, using stored HTML", regenErr);
            }
            // For zipped multi-file games, inject <base href> so relative assets resolve under srcDoc
            if (isZip) {
              const baseHref = fileUrl.replace(/[^/]*$/, "");
              const baseTag = `<base href="${baseHref}">`;
              if (/<head([^>]*)>/i.test(txt)) {
                txt = txt.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
              } else {
                txt = `${baseTag}${txt}`;
              }
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
            // Celebration: confetti + sound + overlay when game completes (detects 🎉 anywhere in DOM)
            const celebrateScript = `<style>
@keyframes lovConfFall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}
@keyframes lovPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}
.lov-celebrate-overlay{position:fixed;inset:0;pointer-events:none;z-index:999999;overflow:hidden}
.lov-confetti{position:absolute;top:-10vh;width:12px;height:18px;border-radius:2px;animation:lovConfFall linear forwards}
.lov-celebrate-card{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#ffd166,#ef476f);color:#fff;padding:24px 36px;border-radius:24px;font-family:system-ui,sans-serif;font-weight:900;font-size:28px;box-shadow:0 20px 50px rgba(0,0,0,.35);text-align:center;animation:lovPop .6s cubic-bezier(.34,1.56,.64,1) forwards;pointer-events:auto;z-index:1000000}
.lov-celebrate-card button{margin-top:14px;background:#fff;color:#ef476f;border:0;border-radius:999px;padding:10px 22px;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.15)}
</style>
<script>(function(){
  var fired=false;
  function playSound(){
    try{
      var Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return;
      var ac=new Ctx(); var notes=[523.25,659.25,783.99,1046.5]; var t=ac.currentTime;
      notes.forEach(function(f,i){ var o=ac.createOscillator(),g=ac.createGain(); o.type='triangle'; o.frequency.value=f; g.gain.setValueAtTime(0.0001,t+i*0.15); g.gain.exponentialRampToValueAtTime(0.25,t+i*0.15+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.15+0.4); o.connect(g); g.connect(ac.destination); o.start(t+i*0.15); o.stop(t+i*0.15+0.45); });
    }catch(e){}
  }
  function confetti(){
    var ov=document.createElement('div'); ov.className='lov-celebrate-overlay';
    var colors=['#ef476f','#ffd166','#06d6a0','#118ab2','#8338ec','#fb5607'];
    for(var i=0;i<140;i++){
      var c=document.createElement('div'); c.className='lov-confetti';
      c.style.left=(Math.random()*100)+'vw';
      c.style.background=colors[i%colors.length];
      c.style.animationDuration=(2.5+Math.random()*2.5)+'s';
      c.style.animationDelay=(Math.random()*0.8)+'s';
      c.style.transform='rotate('+(Math.random()*360)+'deg)';
      if(Math.random()<0.3) c.style.borderRadius='50%';
      ov.appendChild(c);
    }
    var card=document.createElement('div'); card.className='lov-celebrate-card';
    card.innerHTML='<div style="font-size:54px;line-height:1">🎉</div><div>أحسنت! أكملت اللعبة</div><button type="button">العب مجدداً</button>';
    card.querySelector('button').onclick=function(){ try{location.reload();}catch(e){} };
    document.body.appendChild(ov); document.body.appendChild(card);
    setTimeout(function(){ try{ov.remove();}catch(e){} }, 6000);
  }
  function celebrate(){ if(fired) return; fired=true; playSound(); confetti(); }
  window.lovCelebrate=celebrate;
  function scan(){
    if(fired) return;
    try{
      var t=document.body && document.body.innerText || '';
      if(/🎉/.test(t) || /أحسنت/.test(t) && /أكمل|نتيج/.test(t)) celebrate();
    }catch(e){}
  }
  function start(){
    scan();
    try{
      var mo=new MutationObserver(function(){ scan(); });
      mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();</script>`;
            const inject = `${resizeScript}${celebrateScript}`;
            txt = txt.includes("</body>") ? txt.replace("</body>", `${inject}</body>`) : txt + inject;
            setHtml(txt);
          } catch (e: any) {
            setLoadError(e?.message ?? "تعذّر تحميل اللعبة");
          }
        }
      }
    })();
  }, [gameId, reloadKey]);


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
        {loadError ? (
          <div className="grid place-items-center h-full min-h-[60vh] p-6">
            <div className="max-w-md w-full bg-background rounded-2xl border-2 border-destructive/30 p-6 text-center space-y-3">
              <div className="text-4xl">⚠️</div>
              <div className="font-extrabold text-lg">تعذّر تحميل اللعبة</div>
              <div className="text-sm text-muted-foreground break-words">{loadError}</div>
              <button
                onClick={() => { setLoadError(""); setHtml(""); setReloadKey((k) => k + 1); }}
                className="bubble-btn text-white text-sm w-full"
                style={{ background: "var(--gradient-primary)" }}
              >
                🔄 إعادة المحاولة
              </button>
            </div>
          </div>
        ) : game.type === "embed" && game.file_url ? (() => {
          // Parse sizing preferences from the URL hash (#lv=size=...&w=...&h=...&ar=...)
          let embedSrc = game.file_url;
          let embedStyle: React.CSSProperties = { width: "100%", height: "100%" };
          let wrapperStyle: React.CSSProperties | null = null;
          try {
            const u = new URL(game.file_url);
            const raw = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
            if (raw.startsWith("lv=")) {
              const p = new URLSearchParams(raw.slice(3));
              const size = p.get("size");
              if (size === "fixed") {
                const w = p.get("w") || "100%";
                const h = p.get("h") || "600px";
                embedStyle = { width: w, height: h, maxWidth: "100%" };
                wrapperStyle = { display: "grid", placeItems: "center", padding: "12px" };
              } else if (size === "responsive") {
                const ar = p.get("ar") || "16/10";
                if (!isFullscreen) {
                  embedStyle = { width: "100%", aspectRatio: ar.replace("/", " / "), height: "auto", maxHeight: "calc(100vh - 110px)" };
                }
              }
              u.hash = "";
              embedSrc = u.toString();
            }
          } catch { /* keep defaults */ }
          const frame = (
            <iframe
              ref={iframeRef}
              src={embedSrc}
              title={game.title}
              className="block border-0"
              style={{ ...(isFullscreen ? { width: "100%", height: "100%", minHeight: "100vh" } : embedStyle) }}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
              onError={() => setLoadError("فشل تحميل اللعبة المضمّنة")}
            />
          );
          return wrapperStyle && !isFullscreen ? <div style={wrapperStyle}>{frame}</div> : frame;
        })() : html ? (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={game.title}
            className="block border-0"
            style={{ ...iframeStyle, minHeight: isFullscreen ? "100vh" : "calc(100vh - 110px)" }}
            sandbox="allow-scripts allow-same-origin allow-downloads"
            allowFullScreen
            onError={() => setLoadError("فشل عرض اللعبة داخل الإطار")}
          />
        ) : game.file_url ? (
          <div className="grid place-items-center h-96 text-muted-foreground">جاري تحميل اللعبة...</div>
        ) : <div className="grid place-items-center h-96 text-muted-foreground">لا يوجد ملف</div>}
      </div>
    </div>
  );
}

