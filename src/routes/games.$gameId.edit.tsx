import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generatePuzzle, generateQuiz, generateBlanks, generateWheel, generateMatching, generateTower,
  extractEmbeddedConfig, type TowerQuestion,
} from "@/lib/templates";
import {
  Field, QuizBuilder, BlanksBuilder, WheelBuilder, PairsBuilder, TowerBuilder,
  type QuizQ, type BlanksItem, type Pair,
} from "@/components/TemplateBuilders";

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
  const [contentLoaded, setContentLoaded] = useState(false);

  // Puzzle
  const [puzzleImageUrl, setPuzzleImageUrl] = useState<string | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState<number>(4);
  const [newPuzzleImage, setNewPuzzleImage] = useState<File | null>(null);

  // Editable content per template
  const [quizQs, setQuizQs] = useState<QuizQ[]>([]);
  const [blanksList, setBlanksList] = useState<BlanksItem[]>([]);
  const [wheelItems, setWheelItems] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [towerQs, setTowerQs] = useState<TowerQuestion[]>([]);

  // Embed
  const [embedCode, setEmbedCode] = useState("");
  const [embedSize, setEmbedSize] = useState<"responsive" | "fixed">("responsive");
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedHeight, setEmbedHeight] = useState("600");
  const [embedAspect, setEmbedAspect] = useState("16/10");

  // HTML replacement
  const [newHtmlFile, setNewHtmlFile] = useState<File | null>(null);

  const slug = gameType.startsWith("template:") ? gameType.slice("template:".length) : "";
  const isPuzzle = slug === "puzzle";
  const isEmbed = gameType === "embed";
  const isHtml = gameType === "html" || gameType === "zip";
  const editableContent = ["quiz", "blanks", "wheel", "tower"].includes(slug) || (slug === "matching" && pairs.length > 0);

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
      const gtype: string = g.type ?? "";
      setGameType(gtype);
      setFileUrl(g.file_url ?? null);
      if (gtype === "embed" && g.file_url) {
        setEmbedCode(g.file_url);
        try {
          const u = new URL(g.file_url);
          const hash = u.hash.startsWith("#lv=") ? u.hash.slice(4) : "";
          const p = new URLSearchParams(hash);
          const sz = p.get("size");
          if (sz === "fixed") {
            setEmbedSize("fixed");
            setEmbedWidth(p.get("w") ?? "100%");
            setEmbedHeight((p.get("h") ?? "600").replace(/px$/, ""));
          } else {
            setEmbedSize("responsive");
            setEmbedAspect(p.get("ar") ?? "16/10");
          }
        } catch { /* ignore */ }
      } else if (gtype.startsWith("template:") && g.file_url) {
        try {
          const res = await fetch(g.file_url);
          const txt = await res.text();
          const embedded = extractEmbeddedConfig(txt);
          if (embedded) {
            const c = embedded.config;
            if (embedded.slug === "quiz" && Array.isArray(c.questions)) setQuizQs(c.questions);
            else if (embedded.slug === "blanks" && Array.isArray(c.sentences)) setBlanksList(c.sentences);
            else if (embedded.slug === "wheel" && Array.isArray(c.items)) setWheelItems(c.items);
            else if (embedded.slug === "matching" && Array.isArray(c.pairs)) setPairs(c.pairs);
            else if (embedded.slug === "tower" && Array.isArray(c.questions)) setTowerQs(c.questions);
            else if (embedded.slug === "puzzle") {
              setPuzzleImageUrl(c.imageUrl ?? null);
              setPuzzleGrid(c.rows ?? 4);
            }
          } else if (gtype.startsWith("template:puzzle")) {
            const meta = extractPuzzleMeta(txt);
            setPuzzleImageUrl(meta.src);
            setPuzzleGrid(meta.grid);
          }
        } catch { /* ignore */ }
      }
      setContentLoaded(true);
    });
  }, [gameId, user, loading, navigate]);

  const uploadAsset = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${user!.id}/${Date.now()}-asset.${ext}`;
    const { error } = await supabase.storage.from("game-files").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
  };

  const uploadHtml = async (html: string, suffix: string): Promise<string> => {
    const path = `${user!.id}/${Date.now()}-${suffix}.html`;
    const blob = new Blob([html], { type: "text/html" });
    const { error } = await supabase.storage.from("game-files").upload(path, blob, { contentType: "text/html" });
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

      if (isPuzzle) {
        let imgUrl = puzzleImageUrl;
        if (newPuzzleImage) imgUrl = await uploadAsset(newPuzzleImage);
        if (!imgUrl) { toast.error("لا توجد صورة للبازل"); setBusy(false); return; }
        file_url = await uploadHtml(generatePuzzle({ title, imageUrl: imgUrl, rows: puzzleGrid, cols: puzzleGrid }), "puzzle");
        setPuzzleImageUrl(imgUrl);
      } else if (slug === "quiz") {
        const qs = quizQs.filter(q => q.q.trim() && q.options.some(o => o.trim()));
        if (!qs.length) { toast.error("أضف سؤالاً واحداً على الأقل"); setBusy(false); return; }
        file_url = await uploadHtml(generateQuiz({ title, questions: qs.map(q => ({ q: q.q, options: q.options.filter(o => o.trim()), correct: Math.min(q.correct, q.options.filter(o => o.trim()).length - 1) })) }), "quiz");
      } else if (slug === "blanks") {
        const ss = blanksList.filter(b => b.text.includes("___") && b.answers.some(a => a.trim()));
        if (!ss.length) { toast.error("أضف جملة بفراغات ___ مع الإجابات"); setBusy(false); return; }
        file_url = await uploadHtml(generateBlanks({ title, sentences: ss }), "blanks");
      } else if (slug === "wheel") {
        const items = wheelItems.map(s => s.trim()).filter(Boolean);
        if (items.length < 2) { toast.error("أضف عنصرين على الأقل"); setBusy(false); return; }
        file_url = await uploadHtml(generateWheel({ title, items }), "wheel");
      } else if (slug === "matching" && pairs.length > 0) {
        const filtered = pairs.filter(p => p.a.trim() && p.b.trim());
        if (filtered.length < 2) { toast.error("أضف زوجين على الأقل"); setBusy(false); return; }
        file_url = await uploadHtml(generateMatching({ title, pairs: filtered }), "matching");
      } else if (slug === "tower") {
        const qs = towerQs.filter(q => (q.question_ar.trim() || q.question_en.trim()) && q.answers_ar.some(a => a.trim()));
        if (!qs.length) { toast.error("أضف سؤالاً واحداً على الأقل"); setBusy(false); return; }
        file_url = await uploadHtml(generateTower({ title, questions: qs }), "tower");
      } else if (isEmbed) {
        const raw = embedCode.trim();
        if (!raw) { toast.error("الصق رابط أو كود التضمين"); setBusy(false); return; }
        const m = raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
        const baseUrl = m ? m[1] : raw;
        let u: URL;
        try { u = new URL(baseUrl); } catch { toast.error("رابط غير صالح"); setBusy(false); return; }
        if (u.protocol !== "https:") { toast.error("يجب أن يبدأ الرابط بـ https"); setBusy(false); return; }
        const params = new URLSearchParams();
        if (embedSize === "responsive") {
          params.set("size", "responsive");
          if (embedAspect) params.set("ar", embedAspect);
        } else {
          params.set("size", "fixed");
          params.set("w", embedWidth || "100%");
          params.set("h", /^\d+$/.test(embedHeight) ? `${embedHeight}px` : (embedHeight || "600px"));
        }
        u.hash = `lv=${params.toString()}`;
        file_url = u.toString();
      } else if (isHtml && newHtmlFile) {
        if (!/\.html?$/i.test(newHtmlFile.name)) { toast.error("اختر ملف .html"); setBusy(false); return; }
        const safeName = newHtmlFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("game-files").upload(path, newHtmlFile, { contentType: "text/html" });
        if (upErr) throw upErr;
        file_url = supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
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

  const canEditContent = contentLoaded && (
    (slug === "quiz" && quizQs.length > 0) ||
    (slug === "blanks" && blanksList.length > 0) ||
    (slug === "wheel" && wheelItems.length > 0) ||
    (slug === "matching" && pairs.length > 0) ||
    (slug === "tower" && towerQs.length > 0)
  );

  return (
    <Wrapper>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-black text-center mb-8">تعديل اللعبة</h1>
        <div className="card-pop p-6 md:p-8 space-y-5">
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
                  <img src={newPuzzleImage ? URL.createObjectURL(newPuzzleImage) : puzzleImageUrl!} alt="puzzle" className="w-40 h-40 object-cover rounded-xl mb-2 border-2 border-border" />
                )}
                <input type="file" accept="image/*" onChange={(e) => setNewPuzzleImage(e.target.files?.[0] ?? null)} className="text-sm" />
                <p className="text-xs text-muted-foreground mt-1">عند الحفظ ستُولَّد القطع تلقائياً من الصورة الجديدة.</p>
              </Field>
              <Field label={`صعوبة الشبكة: ${puzzleGrid}×${puzzleGrid}`}>
                <input type="range" min={3} max={6} step={1} value={puzzleGrid} onChange={(e) => setPuzzleGrid(parseInt(e.target.value, 10))} className="w-full" />
              </Field>
            </div>
          )}

          {canEditContent && (
            <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4 space-y-3 bg-primary/5">
              <div className="font-bold text-primary">✏️ محتوى اللعبة</div>
              {slug === "quiz" && <QuizBuilder qs={quizQs} setQs={setQuizQs} />}
              {slug === "blanks" && <BlanksBuilder list={blanksList} setList={setBlanksList} />}
              {slug === "wheel" && <WheelBuilder items={wheelItems} setItems={setWheelItems} />}
              {slug === "matching" && pairs.length > 0 && <PairsBuilder pairs={pairs} setPairs={setPairs} />}
              {slug === "tower" && <TowerBuilder qs={towerQs} setQs={setTowerQs} />}
            </div>
          )}

          {contentLoaded && slug && !canEditContent && !isPuzzle && (
            <p className="text-sm text-muted-foreground bg-secondary/40 rounded-xl p-3">
              لا يمكن تعديل محتوى هذا النوع من الألعاب مباشرة هنا. يمكنك تعديل العنوان والوصف والصورة.
            </p>
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

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
