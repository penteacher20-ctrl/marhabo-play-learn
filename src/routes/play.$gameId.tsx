import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/play/$gameId")({ component: PlayPage });

interface Game { id: string; title: string; description: string | null; file_url: string | null; user_id: string; play_count: number; }

function PlayPage() {
  const { gameId } = Route.useParams();
  const { tr } = useI18n();
  const [game, setGame] = useState<Game | null>(null);
  const [creator, setCreator] = useState<string>("");
  const [showEmbed, setShowEmbed] = useState(false);
  const [html, setHtml] = useState<string>("");

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
            const txt = await res.text();
            setHtml(txt);
          } catch { /* ignore */ }
        }
      }
    })();
  }, [gameId]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${gameId}` : "";
  const embed = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success(tr("copied")); };

  if (!game) return <div className="min-h-screen grid place-items-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background/80 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-display font-extrabold truncate">{game.title}</h1>
          {creator && <p className="text-xs text-muted-foreground truncate">بواسطة {creator}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => copy(shareUrl)} className="bubble-btn !py-1.5 !px-4 text-xs text-white" style={{ background: "var(--gradient-fresh)" }}>🔗 {tr("share_link")}</button>
          <button onClick={() => setShowEmbed(!showEmbed)} className="bubble-btn !py-1.5 !px-4 text-xs text-foreground" style={{ background: "var(--yellow-fun)" }}>📋 {tr("embed_code")}</button>
        </div>
      </div>
      {showEmbed && (
        <pre onClick={() => copy(embed)} className="cursor-pointer text-xs bg-secondary/60 px-3 py-2 overflow-x-auto">{embed}</pre>
      )}
      <div className="flex-1 min-h-0">
        {html ? (
          <iframe srcDoc={html} title={game.title} className="w-full h-full block border-0" style={{ minHeight: "calc(100vh - 110px)" }} sandbox="allow-scripts allow-same-origin allow-downloads" allowFullScreen />
        ) : game.file_url ? (
          <div className="grid place-items-center h-96 text-muted-foreground">جاري تحميل اللعبة...</div>
        ) : <div className="grid place-items-center h-96 text-muted-foreground">لا يوجد ملف</div>}
      </div>
    </div>
  );
}
