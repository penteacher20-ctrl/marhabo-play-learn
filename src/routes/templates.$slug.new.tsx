import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validateTemplateSave } from "@/lib/templates.functions";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, generateBlanks, generateMatching, generateWheel, generatePuzzle, generateDraw, generateColoring, generateTower, type TowerQuestion } from "@/lib/templates";
import cardBackAsset from "@/assets/card-back.png.asset.json";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type StageStatus = "pending" | "uploading" | "done" | "error";
type Stage = { id: string; label: string; status: StageStatus; progress: number; error?: string };

export const Route = createFileRoute("/templates/$slug/new")({ component: NewFromTemplate });

const SUPPORTED = ["quiz", "blanks", "matching", "wheel", "puzzle", "draw", "tower"];

function NewFromTemplate() {
  const { slug } = Route.useParams();
  const { tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const updateStage = (id: string, patch: Partial<Stage>) =>
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  // builder state
  const [quizQs, setQuizQs] = useState<{ q: string; options: string[]; correct: number }[]>([{ q: "", options: ["", "", "", ""], correct: 0 }]);
  const [blanksList, setBlanksList] = useState<{ text: string; answers: string[] }[]>([{ text: "عاصمة مصر هي ___ .", answers: ["القاهرة"] }]);
  const [pairs, setPairs] = useState<{ a: string; b: string }[]>([{ a: "", b: "" }, { a: "", b: "" }]);
  const [matchImages, setMatchImages] = useState<File[]>([]);
  const [wheelItems, setWheelItems] = useState<string[]>(["", "", ""]);
  const [puzzleImage, setPuzzleImage] = useState<File | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState(3);
  const [colorImage, setColorImage] = useState<File | null>(null);
  const [towerQs, setTowerQs] = useState<TowerQuestion[]>([
    { question_ar: "كم يساوي 5 + 3؟", question_en: "What is 5 + 3?", answers_ar: ["7", "8", "9"], answers_en: ["7", "8", "9"], correct: 1 },
  ]);

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
    if (slug === "tower") {
      const qs = towerQs.filter(q => (q.question_ar.trim() || q.question_en.trim()) && q.answers_ar.some(a => a.trim()));
      if (!qs.length) { toast.error("أضف سؤالاً واحداً على الأقل"); return null; }
      return generateTower({ title, questions: qs });
    }
    return null;
  };

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per image
  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "file";

  const uploadAsset = async (file: File, label: string, stageId: string): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${label}: يجب أن يكون صورة (PNG/JPG/WEBP)`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${label}: الحجم أكبر من 8 ميجابايت. الرجاء ضغط الصورة`);
    }
    const ts = Date.now();
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/${ts}-${sanitizeName(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const supaUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
    const apiKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

    updateStage(stageId, { status: "uploading", progress: 0 });

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${supaUrl}/storage/v1/object/game-files/${path}`);
      xhr.setRequestHeader("apikey", apiKey);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          updateStage(stageId, { progress: Math.round((e.loaded / e.total) * 100) });
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          const raw = xhr.responseText || "";
          const m = raw.toLowerCase();
          if (xhr.status === 401 || xhr.status === 403 || m.includes("row-level") || m.includes("unauthorized")) {
            reject(new Error(`${label}: ليست لديك صلاحية الرفع. سجّل الدخول من جديد وحاول مرة أخرى`));
          } else if (xhr.status === 413 || m.includes("too large") || m.includes("payload")) {
            reject(new Error(`${label}: الملف كبير جداً على الخادم`));
          } else {
            reject(new Error(`${label}: فشل الرفع (${xhr.status})`));
          }
        }
      };
      xhr.onerror = () => reject(new Error(`${label}: مشكلة في الشبكة أثناء الرفع`));
      xhr.onabort = () => reject(new Error(`${label}: تم إلغاء الرفع`));
      xhr.send(file);
    }).then(() => {
      updateStage(stageId, { status: "done", progress: 100 });
    }).catch((e) => {
      updateStage(stageId, { status: "error", error: e.message });
      throw e;
    });

    return supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
  };


  const submittingRef = useRef(false);
  const validateOnServer = useServerFn(validateTemplateSave);

  const submit = async () => {
    if (submittingRef.current || busy) return; // prevent duplicate submissions
    if (!title.trim()) { toast.error("أضف عنوان اللعبة"); return; }
    if (title.trim().length > 200) { toast.error("العنوان طويل جداً (حدّ 200 حرف)"); return; }
    // pre-validate & build stage list
    const plan: Stage[] = [];
    if (slug === "puzzle") {
      if (!puzzleImage) { toast.error("ارفع صورة للبازل أولاً"); return; }
      plan.push({ id: "puzzle", label: "صورة البازل", status: "pending", progress: 0 });
    } else if (slug === "draw") {
      if (!colorImage) { toast.error("ارفع صورة للتلوين أولاً"); return; }
      plan.push({ id: "draw", label: "صورة التلوين", status: "pending", progress: 0 });
    } else if (slug === "matching") {
      if (matchImages.length < 2) { toast.error("ارفع صورتين على الأقل للعبة المطابقة"); return; }
      if (matchImages.length > 12) { toast.error("الحدّ الأقصى 12 صورة للعبة المطابقة"); return; }
      matchImages.forEach((_, i) => plan.push({ id: `m-${i}`, label: `الصورة ${i + 1}`, status: "pending", progress: 0 }));
      plan.push({ id: "back", label: "ظهر البطاقة", status: "pending", progress: 0 });
    }
    plan.push({ id: "verify", label: "التحقق من الصور على الخادم", status: "pending", progress: 0 });
    plan.push({ id: "save", label: "حفظ اللعبة", status: "pending", progress: 0 });
    setStages(plan);
    submittingRef.current = true;
    setBusy(true);

    try {
      let html = buildHtml();
      const userImageUrls: string[] = [];
      if (slug === "puzzle") {
        const url = await uploadAsset(puzzleImage!, "صورة البازل", "puzzle");
        userImageUrls.push(url);
        html = generatePuzzle({ title, imageUrl: url, rows: puzzleGrid, cols: puzzleGrid });
      } else if (slug === "draw") {
        const url = await uploadAsset(colorImage!, "صورة التلوين", "draw");
        userImageUrls.push(url);
        html = generateColoring({ title, imageUrl: url });
      } else if (slug === "matching") {
        for (let i = 0; i < matchImages.length; i++) {
          userImageUrls.push(await uploadAsset(matchImages[i], `الصورة ${i + 1}`, `m-${i}`));
        }
        let backUrl: string;
        try {
          const backRes = await fetch(cardBackAsset.url);
          if (!backRes.ok) throw new Error(`HTTP ${backRes.status}`);
          const backBlob = await backRes.blob();
          const backFile = new File([backBlob], "card-back.png", { type: backBlob.type || "image/png" });
          backUrl = await uploadAsset(backFile, "ظهر البطاقة", "back");
        } catch (e: any) {
          updateStage("back", { status: "error", error: e.message });
          throw new Error(`تعذّر تجهيز ظهر البطاقات: ${e.message || e}`);
        }
        html = generateMatching({ title, images: userImageUrls, backUrl });
      }
      if (!html) { throw new Error("تعذّر إنشاء محتوى اللعبة"); }

      // Server-side validation (defense in depth)
      updateStage("verify", { status: "uploading", progress: 40 });
      try {
        await validateOnServer({ data: { slug, title: title.trim(), imageUrls: userImageUrls } });
        updateStage("verify", { status: "done", progress: 100 });
      } catch (e: any) {
        const msg = e?.message || "فشل التحقق من الخادم";
        updateStage("verify", { status: "error", error: msg });
        throw new Error(msg);
      }

      updateStage("save", { status: "uploading", progress: 30 });
      const ts = Date.now();
      const path = `${user.id}/${ts}-${slug}.html`;
      const blob = new Blob([html], { type: "text/html" });
      const { error: upErr } = await supabase.storage.from("game-files").upload(path, blob, { contentType: "text/html" });
      if (upErr) { updateStage("save", { status: "error", error: upErr.message }); throw new Error(`فشل حفظ ملف اللعبة: ${upErr.message}`); }
      updateStage("save", { progress: 70 });
      const { data: { publicUrl } } = supabase.storage.from("game-files").getPublicUrl(path);
      const { data: game, error } = await supabase.from("games").insert({
        user_id: user.id, title: title.trim(), type: `template:${slug}`, file_url: publicUrl, is_public: isPublic,
      }).select().single();
      if (error) { updateStage("save", { status: "error", error: error.message }); throw new Error(`فشل حفظ اللعبة في قاعدة البيانات: ${error.message}`); }
      updateStage("save", { status: "done", progress: 100 });
      toast.success("تم إنشاء اللعبة! 🎉");
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (err: any) {
      console.error("[template submit]", err);
      toast.error(err?.message || "حدث خطأ غير متوقع أثناء إنشاء اللعبة", { duration: 6000 });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };


  return (
    <Wrapper>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display font-black text-center mb-2">إنشاء لعبة من قالب</h1>
        <p className="text-center text-muted-foreground mb-8">القالب: <span className="font-bold text-primary">{slug}</span></p>

        <fieldset disabled={busy} className="card-pop p-6 md:p-8 space-y-5 group/form disabled:opacity-70 disabled:cursor-not-allowed relative">
          {busy && (
            <div aria-live="polite" className="absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px] rounded-3xl flex items-start justify-center pt-4 pointer-events-none">
              <div className="flex items-center gap-2 bg-background/90 border-2 border-primary/20 rounded-full px-4 py-2 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="font-bold text-sm">جاري الإنشاء — يرجى عدم إغلاق الصفحة</span>
              </div>
            </div>
          )}
          <Field label={tr("game_title")}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
          </Field>

          {slug === "quiz" && <QuizBuilder qs={quizQs} setQs={setQuizQs} />}
          {slug === "blanks" && <BlanksBuilder list={blanksList} setList={setBlanksList} />}
          {slug === "matching" && <MatchingBuilder images={matchImages} setImages={setMatchImages} />}
          {slug === "wheel" && <WheelBuilder items={wheelItems} setItems={setWheelItems} />}
          {slug === "tower" && <TowerBuilder qs={towerQs} setQs={setTowerQs} />}
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

          {stages.length > 0 && (
            <div className="rounded-2xl bg-secondary/40 border-2 border-primary/10 p-4 space-y-3">
              {stages.map((s) => (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 font-bold">
                      {s.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      {s.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      {s.status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
                      {s.status === "pending" && <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />}
                      <span>{s.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {s.status === "error" ? "فشل" : s.status === "done" ? "تم" : `${s.progress}%`}
                    </span>
                  </div>
                  <Progress value={s.status === "error" ? 100 : s.progress} className={s.status === "error" ? "[&>div]:bg-destructive" : s.status === "done" ? "[&>div]:bg-green-600" : ""} />
                  {s.error && <p className="text-xs text-destructive">{s.error}</p>}
                </div>
              ))}
            </div>
          )}

          <button disabled={busy} onClick={submit} className="bubble-btn text-white w-full disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: "var(--gradient-primary)" }}>
            {busy && <Loader2 className="w-5 h-5 animate-spin" />}
            {busy ? "جاري الإنشاء..." : "🚀 إنشاء اللعبة"}
          </button>
        </fieldset>
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


function TowerBuilder({ qs, setQs }: { qs: TowerQuestion[]; setQs: (v: TowerQuestion[]) => void }) {
  const update = (i: number, patch: Partial<TowerQuestion>) => setQs(qs.map((q, k) => k === i ? { ...q, ...patch } : q));
  const updateAns = (i: number, lang: "ar" | "en", oi: number, val: string) => {
    const key = lang === "ar" ? "answers_ar" : "answers_en";
    update(i, { [key]: qs[i][key].map((x, k) => k === oi ? val : x) } as any);
  };
  const addOpt = (i: number) => update(i, { answers_ar: [...qs[i].answers_ar, ""], answers_en: [...qs[i].answers_en, ""] });
  const rmOpt = (i: number, oi: number) => update(i, {
    answers_ar: qs[i].answers_ar.filter((_, k) => k !== oi),
    answers_en: qs[i].answers_en.filter((_, k) => k !== oi),
    correct: Math.max(0, Math.min(qs[i].correct, qs[i].answers_ar.length - 2)),
  });
  return (
    <div>
      <SectionHeader title="أسئلة برج الأبطال (ثنائية اللغة)" onAdd={() => setQs([...qs, { question_ar: "", question_en: "", answers_ar: ["", "", ""], answers_en: ["", "", ""], correct: 0 }])} />
      <p className="text-xs text-muted-foreground mb-3">اكتب السؤال بالعربية والإنجليزية معًا، مع خيارات الإجابة لكل لغة. حدّد الإجابة الصحيحة.</p>
      <div className="space-y-4">
        {qs.map((q, i) => (
          <div key={i} className="bg-secondary/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">سؤال {i + 1}</span>
              <button type="button" onClick={() => setQs(qs.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <input dir="rtl" value={q.question_ar} onChange={(e) => update(i, { question_ar: e.target.value })} placeholder="السؤال بالعربية" className="input" />
              <input dir="ltr" value={q.question_en} onChange={(e) => update(i, { question_en: e.target.value })} placeholder="Question in English" className="input" />
            </div>
            <div className="space-y-2">
              {q.answers_ar.map((_, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`t-${i}`} checked={q.correct === oi} onChange={() => update(i, { correct: oi })} className="w-5 h-5 accent-primary shrink-0" title="الإجابة الصحيحة" />
                  <input dir="rtl" value={q.answers_ar[oi]} onChange={(e) => updateAns(i, "ar", oi, e.target.value)} placeholder={`إجابة عربية ${oi + 1}`} className="input flex-1" />
                  <input dir="ltr" value={q.answers_en[oi]} onChange={(e) => updateAns(i, "en", oi, e.target.value)} placeholder={`Answer ${oi + 1}`} className="input flex-1" />
                  {q.answers_ar.length > 2 && <button type="button" onClick={() => rmOpt(i, oi)} className="px-2 text-destructive font-bold">×</button>}
                </div>
              ))}
              <button type="button" onClick={() => addOpt(i)} className="text-sm font-bold text-primary">+ خيار</button>
            </div>
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
