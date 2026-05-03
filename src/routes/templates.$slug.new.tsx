import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, generateBlanks, generateMatching, generateWheel, generatePuzzle, generateDraw, generateColoring } from "@/lib/templates";

export const Route = createFileRoute("/templates/$slug/new")({ component: NewFromTemplate });

const SUPPORTED = ["quiz", "blanks", "matching", "wheel", "puzzle", "draw"];

function NewFromTemplate() {
  const { slug } = Route.useParams();
  const { tr } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  // builder state
  const [quizQs, setQuizQs] = useState<{ q: string; options: string[]; correct: number }[]>([{ q: "", options: ["", "", "", ""], correct: 0 }]);
  const [blanksList, setBlanksList] = useState<{ text: string; answers: string[] }[]>([{ text: "عاصمة مصر هي ___ .", answers: ["القاهرة"] }]);
  const [pairs, setPairs] = useState<{ a: string; b: string }[]>([{ a: "", b: "" }, { a: "", b: "" }]);
  const [wheelItems, setWheelItems] = useState<string[]>(["", "", ""]);
  const [puzzleImage, setPuzzleImage] = useState<File | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState(3);
  const [colorImage, setColorImage] = useState<File | null>(null);

  if (!user) {
    return (
      <Wrapper>
        <div className="card-pop p-10 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-display font-extrabold mb-2">{tr("nav_login")}</h2>
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
      const ps = pairs.filter(p => p.a.trim() && p.b.trim());
      if (ps.length < 2) { toast.error("أضف زوجين على الأقل"); return null; }
      return generateMatching({ title, pairs: ps });
    }
    if (slug === "wheel") {
      const items = wheelItems.map(s => s.trim()).filter(Boolean);
      if (items.length < 2) { toast.error("أضف عنصرين على الأقل"); return null; }
      return generateWheel({ title, items });
    }
    return null;
  };

  const uploadAsset = async (file: File): Promise<string> => {
    const ts = Date.now();
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${ts}-asset.${ext}`;
    const { error } = await supabase.storage.from("game-files").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("game-files").getPublicUrl(path).data.publicUrl;
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("أضف عنوان اللعبة"); return; }
    const html = buildHtml(); if (!html) return;
    setBusy(true);
    try {
      const ts = Date.now();
      const path = `${user.id}/${ts}-${slug}.html`;
      const blob = new Blob([html], { type: "text/html" });
      const { error: upErr } = await supabase.storage.from("game-files").upload(path, blob, { contentType: "text/html" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("game-files").getPublicUrl(path);
      const { data: game, error } = await supabase.from("games").insert({
        user_id: user.id, title, type: `template:${slug}`, file_url: publicUrl, is_public: isPublic,
      }).select().single();
      if (error) throw error;
      toast.success("تم إنشاء اللعبة! 🎉");
      navigate({ to: "/play/$gameId", params: { gameId: game.id } });
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
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
          {slug === "matching" && <MatchingBuilder pairs={pairs} setPairs={setPairs} />}
          {slug === "wheel" && <WheelBuilder items={wheelItems} setItems={setWheelItems} />}
          {slug === "puzzle" && <PuzzleBuilder words={puzzleWords} setWords={setPuzzleWords} />}
          {slug === "draw" && (
            <Field label="موضوع الرسم (اختياري)">
              <input value={drawPrompt} onChange={(e) => setDrawPrompt(e.target.value)} placeholder="مثال: ارسم منزلك المفضل" className="input" />
            </Field>
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

function MatchingBuilder({ pairs, setPairs }: { pairs: any[]; setPairs: any }) {
  return (
    <div>
      <SectionHeader title="الأزواج" onAdd={() => setPairs([...pairs, { a: "", b: "" }])} />
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input value={p.a} onChange={(e) => setPairs(pairs.map((x, k) => k === i ? { ...x, a: e.target.value } : x))} placeholder="عنصر A" className="input flex-1" />
            <input value={p.b} onChange={(e) => setPairs(pairs.map((x, k) => k === i ? { ...x, b: e.target.value } : x))} placeholder="عنصر B" className="input flex-1" />
            <button type="button" onClick={() => setPairs(pairs.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
          </div>
        ))}
      </div>
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

function PuzzleBuilder({ words, setWords }: { words: string[]; setWords: any }) {
  return (
    <div>
      <SectionHeader title="كلمات للترتيب" onAdd={() => setWords([...words, ""])} />
      <div className="space-y-2">
        {words.map((w, i) => (
          <div key={i} className="flex gap-2">
            <input value={w} onChange={(e) => setWords(words.map((x, k) => k === i ? e.target.value : x))} placeholder={`كلمة ${i + 1}`} className="input flex-1" />
            <button type="button" onClick={() => setWords(words.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
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
