import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, generateBlanks, generateMatching, generateWheel, generatePuzzle, generateDraw, generateColoring } from "@/lib/templates";
import cardBackAsset from "@/assets/card-back.png.asset.json";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type StageStatus = "pending" | "uploading" | "done" | "error";
type Stage = { id: string; label: string; status: StageStatus; progress: number; error?: string };

export const Route = createFileRoute("/templates/$slug/new")({ component: NewFromTemplate });

const SUPPORTED = ["quiz", "blanks", "matching", "wheel", "puzzle", "draw"];

function NewFromTemplate() {
  const { slug } = Route.useParams();
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  // builder state
  const [quizQs, setQuizQs] = useState<{ q: string; options: string[]; correct: number }[]>([{ q: "", options: ["", "", "", ""], correct: 0 }]);
  const [blanksList, setBlanksList] = useState<{ text: string; answers: string[] }[]>([{ text: "عاصمة مصر هي ___ .", answers: ["القاهرة"] }]);
  const [pairs, setPairs] = useState<{ a: string; b: string }[]>([{ a: "", b: "" }, { a: "", b: "" }]);
  const [matchImages, setMatchImages] = useState<File[]>([]);
  const [wheelItems, setWheelItems] = useState<string[]>(["", "", ""]);
  const [puzzleImage, setPuzzleImage] = useState<File | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState(3);
  const [colorImage, setColorImage] = useState<File | null>(null);

  if (loading) {
    return (
      <Wrapper>
        <div className="card-pop p-10 text-center max-w-md mx-auto">جاري التحميل...</div>
      </Wrapper>
    );
  }

  if (!user) {
    return (
      <Wrapper>
        <div className="card-pop p-10 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-display font-extrabold mb-2">{tr("nav_login")}</h2>
          <p className="text-muted-foreground mb-4">سجّل دخولك أولاً لإنشاء لعبة من قالب</p>
          <button onClick={() => navigate({ to: "/auth" })} className="bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>{tr("signin")}</button>
        </div>
      </Wrapper>
    );
  }

  if (!SUPPORTED.includes(slug)) {
    return (
      <Wrapper>
        <div className="card-pop p-10 text-center max-w-md mx-auto">
          <div className="text-5xl mb-3">🚧</div>
          <h2 className="text-2xl font-display font-extrabold mb-2">{tr("coming_soon")}</h2>
          <p className="text-muted-foreground mb-6">هذا القالب قيد التطوير. جرّب: اختبار، فراغات، مطابقة، عجلة.</p>
          <button onClick={() => navigate({ to: "/templates" })} className="bubble-btn text-white" style={{ background: "var(--gradient-primary)" }}>← القوالب</button>
        </div>
      </Wrapper>
    );
  }

  const buildHtml = (): string | null => {
    if (slug === "quiz") {
      const qs = quizQs.filter(q => q.q.trim() && q.options.some(o => o.trim()));
      if (qs.length === 0) { toast.error("أضف سؤالاً واحداً على الأقل"); return null; }
      return generateQuiz({ title, questions: qs.map(q => ({ q: q.q, options: q.options.filter(o => o.trim()), correct: Math.min(q.correct, q.options.filter(o => o.trim()).length - 1) })) });
    }
    if (slug === "blanks") {
      const ss = blanksList.filter(b => b.text.includes("___") && b.answers.some(a => a.trim()));
      if (!ss.length) { toast.error("أضف جملة بفراغات ___ مع الإجابات"); return null; }
      return generateBlanks({ title, sentences: ss });
    }
    if (slug === "matching") {
      // handled in submit (async uploads)
      return "";
    }
    if (slug === "wheel") {
      const items = wheelItems.map(s => s.trim()).filter(Boolean);
      if (items.length < 2) { toast.error("أضف عنصرين على الأقل"); return null; }
      return generateWheel({ title, items });
    }
    return null;
  };

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per image
  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "file";

  const uploadAsset = async (file: File, label = "الملف"): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${label}: يجب أن يكون صورة (PNG/JPG/WEBP)`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${label}: الحجم أكبر من 8 ميجابايت. الرجاء ضغط الصورة`);
    }
    const ts = Date.now();
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/${ts}-${sanitizeName(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
    const { error } = await supabase.storage.from("game-files").upload(path, file, { contentType: file.type });
    if (error) {
      const m = (error.message || "").toLowerCase();
      if (m.includes("row-level") || m.includes("unauthorized") || m.includes("permission")) {
        throw new Error(`${label}: ليست لديك صلاحية الرفع. سجّل الدخول من جديد وحاول مرة أخرى`);
      }
      if (m.includes("payload") || m.includes("too large") || m.includes("size")) {
        throw new Error(`${label}: الملف كبير جداً على الخادم`);
      }
      if (m.includes("network") || m.includes("fetch")) {
        throw new Error(`${label}: مشكلة في الشبكة أثناء الرفع. تحقّق من الاتصال وحاول مجدداً`);
      }
      throw new Error(`${label}: فشل الرفع — ${error.message}`);
    }
    return supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
  };


  const submit = async () => {
    if (!title.trim()) { toast.error("أضف عنوان اللعبة"); return; }
    setBusy(true);
    const loadingId = toast.loading("جاري إنشاء اللعبة...");
    try {
      let html = buildHtml();
      if (slug === "puzzle") {
        if (!puzzleImage) { toast.dismiss(loadingId); toast.error("ارفع صورة للبازل أولاً"); setBusy(false); return; }
        toast.loading("رفع صورة البازل...", { id: loadingId });
        const url = await uploadAsset(puzzleImage, "صورة البازل");
        html = generatePuzzle({ title, imageUrl: url, rows: puzzleGrid, cols: puzzleGrid });
      } else if (slug === "draw") {
        if (!colorImage) { toast.dismiss(loadingId); toast.error("ارفع صورة للتلوين أولاً"); setBusy(false); return; }
        toast.loading("رفع صورة التلوين...", { id: loadingId });
        const url = await uploadAsset(colorImage, "صورة التلوين");
        html = generateColoring({ title, imageUrl: url });
      } else if (slug === "matching") {
        if (matchImages.length < 2) { toast.dismiss(loadingId); toast.error("ارفع صورتين على الأقل للعبة المطابقة"); setBusy(false); return; }
        const imageUrls: string[] = [];
        for (let i = 0; i < matchImages.length; i++) {
          toast.loading(`رفع الصورة ${i + 1} من ${matchImages.length}...`, { id: loadingId });
          imageUrls.push(await uploadAsset(matchImages[i], `الصورة ${i + 1}`));
        }
        toast.loading("تجهيز البطاقات...", { id: loadingId });
        let backUrl: string;
        try {
          const backRes = await fetch(cardBackAsset.url);
          if (!backRes.ok) throw new Error(`HTTP ${backRes.status}`);
          const backBlob = await backRes.blob();
          const backFile = new File([backBlob], "card-back.png", { type: backBlob.type || "image/png" });
          backUrl = await uploadAsset(backFile, "ظهر البطاقة");
        } catch (e: any) {
          throw new Error(`تعذّر تجهيز ظهر البطاقات: ${e.message || e}`);
        }
        html = generateMatching({ title, images: imageUrls, backUrl });
      }
      if (!html) { toast.dismiss(loadingId); setBusy(false); return; }
      toast.loading("حفظ اللعبة...", { id: loadingId });
      const ts = Date.now();
      const path = `${user.id}/${ts}-${slug}.html`;
      const blob = new Blob([html], { type: "text/html" });
      const { error: upErr } = await supabase.storage.from("game-files").upload(path, blob, { contentType: "text/html" });
      if (upErr) throw new Error(`فشل حفظ ملف اللعبة: ${upErr.message}`);
      const { data: { publicUrl } } = supabase.storage.from("game-files").getPublicUrl(path);
      const { data: game, error } = await supabase.from("games").insert({
        user_id: user.id, title, type: `template:${slug}`, file_url: publicUrl, is_public: isPublic,
      }).select().single();
      if (error) throw new Error(`فشل حفظ اللعبة في قاعدة البيانات: ${error.message}`);
      toast.success("تم إنشاء اللعبة! 🎉", { id: loadingId });
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (err: any) {
      console.error("[template submit]", err);
      toast.error(err?.message || "حدث خطأ غير متوقع أثناء إنشاء اللعبة", { id: loadingId, duration: 6000 });
    } finally { setBusy(false); }
  };


  return (
    <Wrapper>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display font-black text-center mb-2">إنشاء لعبة من قالب</h1>
        <p className="text-center text-muted-foreground mb-8">القالب: <span className="font-bold text-primary">{slug}</span></p>

        <div className="card-pop p-6 md:p-8 space-y-5">
          <Field label={tr("game_title")}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
          </Field>

          {slug === "quiz" && <QuizBuilder qs={quizQs} setQs={setQuizQs} />}
          {slug === "blanks" && <BlanksBuilder list={blanksList} setList={setBlanksList} />}
          {slug === "matching" && <MatchingBuilder images={matchImages} setImages={setMatchImages} />}
          {slug === "wheel" && <WheelBuilder items={wheelItems} setItems={setWheelItems} />}
          {slug === "puzzle" && (
            <div className="space-y-3">
              <Field label="صورة البازل (PNG/JPG)">
                <input type="file" accept="image/*" onChange={(e) => setPuzzleImage(e.target.files?.[0] ?? null)} className="input" />
              </Field>
              {puzzleImage && <img src={URL.createObjectURL(puzzleImage)} alt="" className="max-h-48 mx-auto rounded-2xl" />}
              <Field label={`صعوبة (${puzzleGrid}×${puzzleGrid})`}>
                <input type="range" min={2} max={6} value={puzzleGrid} onChange={(e) => setPuzzleGrid(+e.target.value)} className="w-full" />
              </Field>
            </div>
          )}
          {slug === "draw" && (
            <div className="space-y-3">
              <Field label="صورة للتلوين (خطوط على خلفية بيضاء)">
                <input type="file" accept="image/*" onChange={(e) => setColorImage(e.target.files?.[0] ?? null)} className="input" />
              </Field>
              {colorImage && <img src={URL.createObjectURL(colorImage)} alt="" className="max-h-48 mx-auto rounded-2xl" />}
            </div>
          )}

          <div className="flex items-center justify-between bg-secondary/50 rounded-2xl px-4 py-3">
            <span className="font-bold">{tr("privacy")}</span>
            <div className="flex gap-1 p-1 bg-background rounded-full">
              <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${isPublic ? "text-white" : "text-foreground"}`} style={isPublic ? { background: "var(--green-fun)" } : {}}>{tr("public")}</button>
              <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-1.5 rounded-full text-sm font-bold ${!isPublic ? "text-white bg-foreground" : "text-foreground"}`}>{tr("private")}</button>
            </div>
          </div>

          <button disabled={busy} onClick={submit} className="bubble-btn text-white w-full disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
            {busy ? "..." : "🚀 إنشاء اللعبة"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.65rem 1rem;border-radius:1rem;background:#fff;border:2px solid var(--color-border);font:inherit;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </Wrapper>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-bold mb-1.5">{label}</span>{children}</label>;
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-display font-extrabold text-lg">{title}</h3>
      <button type="button" onClick={onAdd} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm">+ إضافة</button>
    </div>
  );
}

function QuizBuilder({ qs, setQs }: { qs: any[]; setQs: any }) {
  const update = (i: number, patch: any) => setQs(qs.map((q, k) => k === i ? { ...q, ...patch } : q));
  return (
    <div>
      <SectionHeader title="الأسئلة" onAdd={() => setQs([...qs, { q: "", options: ["", ""], correct: 0 }])} />
      <div className="space-y-4">
        {qs.map((q, i) => (
          <div key={i} className="bg-secondary/40 rounded-2xl p-4 space-y-2">
            <div className="flex gap-2">
              <input value={q.q} onChange={(e) => update(i, { q: e.target.value })} placeholder={`سؤال ${i + 1}`} className="input flex-1" />
              <button type="button" onClick={() => setQs(qs.filter((_: any, k: number) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
            </div>
            {q.options.map((o: string, oi: number) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`c-${i}`} checked={q.correct === oi} onChange={() => update(i, { correct: oi })} className="w-5 h-5 accent-primary" />
                <input value={o} onChange={(e) => update(i, { options: q.options.map((x: string, k: number) => k === oi ? e.target.value : x) })} placeholder={`خيار ${oi + 1}`} className="input flex-1" />
                {q.options.length > 2 && <button type="button" onClick={() => update(i, { options: q.options.filter((_: string, k: number) => k !== oi), correct: 0 })} className="px-2 text-destructive font-bold">×</button>}
              </div>
            ))}
            <button type="button" onClick={() => update(i, { options: [...q.options, ""] })} className="text-sm font-bold text-primary">+ خيار</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlanksBuilder({ list, setList }: { list: any[]; setList: any }) {
  const update = (i: number, patch: any) => setList(list.map((s, k) => k === i ? { ...s, ...patch } : s));
  return (
    <div>
      <SectionHeader title="جمل بفراغات (استخدم ___ مكان الفراغ)" onAdd={() => setList([...list, { text: "", answers: [""] }])} />
      <div className="space-y-3">
        {list.map((s, i) => (
          <div key={i} className="bg-secondary/40 rounded-2xl p-4 space-y-2">
            <div className="flex gap-2">
              <input value={s.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="عاصمة مصر هي ___ ." className="input flex-1" />
              <button type="button" onClick={() => setList(list.filter((_: any, k: number) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {s.answers.map((a: string, ai: number) => (
                <input key={ai} value={a} onChange={(e) => update(i, { answers: s.answers.map((x: string, k: number) => k === ai ? e.target.value : x) })} placeholder={`إجابة ${ai + 1}`} className="input !w-40" />
              ))}
              <button type="button" onClick={() => update(i, { answers: [...s.answers, ""] })} className="text-sm font-bold text-primary">+ إجابة</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchingBuilder({ images, setImages }: { images: File[]; setImages: (f: File[]) => void }) {
  const onAdd = (files: FileList | null) => {
    if (!files) return;
    setImages([...images, ...Array.from(files)]);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-extrabold text-lg">صور اللعبة (كل صورة ستُكرَّر مرتين لتُطابَق)</h3>
        <label className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm cursor-pointer">
          + إضافة صور
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onAdd(e.target.files); e.currentTarget.value = ""; }} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground mb-3">أضف من 2 إلى 12 صورة. ظهر البطاقة سيكون شعار مِرحابو.</p>
      {images.length === 0 ? (
        <div className="text-center py-8 rounded-2xl border-2 border-dashed border-primary/30 text-muted-foreground">لم تُضِف صوراً بعد</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {images.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary/40 border-2 border-primary/20">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImages(images.filter((_, k) => k !== i))} className="absolute top-1 end-1 w-6 h-6 rounded-full bg-destructive text-white font-bold text-xs shadow">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WheelBuilder({ items, setItems }: { items: string[]; setItems: any }) {
  return (
    <div>
      <SectionHeader title="عناصر العجلة" onAdd={() => setItems([...items, ""])} />
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input value={it} onChange={(e) => setItems(items.map((x, k) => k === i ? e.target.value : x))} placeholder={`عنصر ${i + 1}`} className="input flex-1" />
            <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
          </div>
        ))}
      </div>
    </div>
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
