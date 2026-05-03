import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generatePuzzle } from "@/lib/templates";

export const Route = createFileRoute("/games/$gameId/edit")({ component: EditGame });

function extractPuzzleMeta(html: string): { src: string | null; grid: number } {
  const s = html.match(/const\s+SRC\s*=\s*("([^"]+)"|'([^']+)')/);
  const g = html.match(/let\s+ROWS\s*=\s*(\d+)/);
  return { src: s ? (s[2] ?? s[3] ?? null) : null, grid: g ? parseInt(g[1], 10) : 4 };
}

function EditGame() {
  const { gameId } = Route.useParams();
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [newThumb, setNewThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [gameType, setGameType] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  // Puzzle-specific
  const [puzzleImageUrl, setPuzzleImageUrl] = useState<string | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState<number>(4);
  const [newPuzzleImage, setNewPuzzleImage] = useState<File | null>(null);

  const isPuzzle = gameType.startsWith("template:puzzle");

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth" }); return; }
    if (!user) return;
    supabase.from("games").select("*").eq("id", gameId).maybeSingle().then(async ({ data }) => {
      if (!data) { setNotFound(true); return; }
      if ((data as any).user_id !== user.id) { setNotFound(true); return; }
      const g = data as any;
      setTitle(g.title);
      setDesc(g.description ?? "");
      setIsPublic(g.is_public);
      setThumbUrl(g.thumbnail_url);
      setGameType(g.type ?? "");
      setFileUrl(g.file_url ?? null);
      if ((g.type ?? "").startsWith("template:puzzle") && g.file_url) {
        try {
          const res = await fetch(g.file_url);
          const txt = await res.text();
          const meta = extractPuzzleMeta(txt);
          setPuzzleImageUrl(meta.src);
          setPuzzleGrid(meta.grid);
        } catch { /* ignore */ }
      }
    });
  }, [gameId, user, loading, navigate]);

  const uploadAsset = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${user!.id}/${Date.now()}-asset.${ext}`;
    const { error } = await supabase.storage.from("game-files").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let thumbnail_url = thumbUrl;
      if (newThumb) {
        const safeName = newThumb.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("thumbnails").upload(path, newThumb);
        if (error) throw error;
        thumbnail_url = supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
      }

      let file_url = fileUrl;
      // Regenerate puzzle HTML if image changed, grid changed, or title changed (so iframe header matches)
      if (isPuzzle) {
        let imgUrl = puzzleImageUrl;
        if (newPuzzleImage) {
          imgUrl = await uploadAsset(newPuzzleImage);
        }
        if (!imgUrl) { toast.error("لا توجد صورة للبازل"); setBusy(false); return; }
        const html = generatePuzzle({ title, imageUrl: imgUrl, rows: puzzleGrid, cols: puzzleGrid });
        const path = `${user.id}/${Date.now()}-puzzle.html`;
        const blob = new Blob([html], { type: "text/html" });
        const { error: upErr } = await supabase.storage.from("game-files").upload(path, blob, { contentType: "text/html" });
        if (upErr) throw upErr;
        file_url = supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
        setPuzzleImageUrl(imgUrl);
      }

      const { error } = await supabase.from("games").update({ title, description: desc, is_public: isPublic, thumbnail_url, file_url }).eq("id", gameId);
      if (error) throw error;
      toast.success("تم الحفظ ✅ وستظهر التحديثات للطلاب فوراً");
      navigate({ to: "/dashboard" });
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("هل أنت متأكد من حذف اللعبة؟")) return;
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    navigate({ to: "/dashboard" });
  };

  if (notFound) return <Wrapper><div className="card-pop p-10 text-center max-w-md mx-auto"><p>اللعبة غير موجودة أو ليست لك.</p></div></Wrapper>;

  return (
    <Wrapper>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-black text-center mb-8">تعديل اللعبة</h1>
        <div className="card-pop p-8 space-y-5">
          <Field label={tr("game_title")}><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></Field>
          <Field label={tr("game_desc")}><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input" /></Field>
          <Field label={tr("thumbnail")}>
            {thumbUrl && <img src={thumbUrl} alt="" className="w-32 h-20 object-cover rounded-xl mb-2" />}
            <input type="file" accept="image/*" onChange={(e) => setNewThumb(e.target.files?.[0] ?? null)} className="text-sm" />
          </Field>

          {isPuzzle && (
            <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4 space-y-3 bg-primary/5">
              <div className="font-bold text-primary">🧩 إعدادات البازل</div>
              <Field label="صورة البازل الحالية">
                {(newPuzzleImage || puzzleImageUrl) && (
                  <img
                    src={newPuzzleImage ? URL.createObjectURL(newPuzzleImage) : puzzleImageUrl!}
                    alt="puzzle"
                    className="w-40 h-40 object-cover rounded-xl mb-2 border-2 border-border"
                  />
                )}
                <input type="file" accept="image/*" onChange={(e) => setNewPuzzleImage(e.target.files?.[0] ?? null)} className="text-sm" />
                <p className="text-xs text-muted-foreground mt-1">عند الحفظ ستُولَّد القطع تلقائياً من الصورة الجديدة، وسيراها الطلاب فوراً.</p>
              </Field>
              <Field label={`صعوبة الشبكة الافتراضية: ${puzzleGrid}×${puzzleGrid}`}>
                <input
                  type="range" min={3} max={6} step={1}
                  value={puzzleGrid}
                  onChange={(e) => setPuzzleGrid(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </Field>
            </div>
          )}

          <div className="flex items-center justify-between bg-secondary/50 rounded-2xl px-4 py-3">
            <span className="font-bold">{tr("privacy")}</span>
            <div className="flex gap-1 p-1 bg-background rounded-full">
              <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${isPublic ? "text-white" : ""}`} style={isPublic ? { background: "var(--green-fun)" } : {}}>{tr("public")}</button>
              <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${!isPublic ? "text-white bg-foreground" : ""}`}>{tr("private")}</button>
            </div>
          </div>

          <div className="flex gap-3">
            <button disabled={busy} onClick={save} className="bubble-btn text-white flex-1 disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>{busy ? "..." : "💾 حفظ"}</button>
            <button onClick={remove} className="bubble-btn text-white" style={{ background: "var(--coral)" }}>🗑 حذف</button>
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.75rem 1rem;border-radius:1rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </Wrapper>
  );
}
