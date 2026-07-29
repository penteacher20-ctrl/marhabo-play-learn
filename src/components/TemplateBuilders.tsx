import type { TowerQuestion } from "@/lib/templates";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

export type QuizQ = { q: string; options: string[]; correct: number };
export function QuizBuilder({ qs, setQs }: { qs: QuizQ[]; setQs: (v: QuizQ[]) => void }) {
  const update = (i: number, patch: Partial<QuizQ>) => setQs(qs.map((q, k) => k === i ? { ...q, ...patch } : q));
  return (
    <div>
      <SectionHeader title="الأسئلة" onAdd={() => setQs([...qs, { q: "", options: ["", ""], correct: 0 }])} />
      <div className="space-y-4">
        {qs.map((q, i) => (
          <div key={i} className="bg-secondary/40 rounded-2xl p-4 space-y-2">
            <div className="flex gap-2">
              <input value={q.q} onChange={(e) => update(i, { q: e.target.value })} placeholder={`سؤال ${i + 1}`} className="input flex-1" />
              <button type="button" onClick={() => setQs(qs.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
            </div>
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`c-${i}`} checked={q.correct === oi} onChange={() => update(i, { correct: oi })} className="w-5 h-5 accent-primary" />
                <input value={o} onChange={(e) => update(i, { options: q.options.map((x, k) => k === oi ? e.target.value : x) })} placeholder={`خيار ${oi + 1}`} className="input flex-1" />
                {q.options.length > 2 && <button type="button" onClick={() => update(i, { options: q.options.filter((_, k) => k !== oi), correct: 0 })} className="px-2 text-destructive font-bold">×</button>}
              </div>
            ))}
            <button type="button" onClick={() => update(i, { options: [...q.options, ""] })} className="text-sm font-bold text-primary">+ خيار</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export type BlanksItem = { text: string; answers: string[] };
export function BlanksBuilder({ list, setList }: { list: BlanksItem[]; setList: (v: BlanksItem[]) => void }) {
  const update = (i: number, patch: Partial<BlanksItem>) => setList(list.map((s, k) => k === i ? { ...s, ...patch } : s));
  return (
    <div>
      <SectionHeader title="جمل بفراغات (استخدم ___ مكان الفراغ)" onAdd={() => setList([...list, { text: "", answers: [""] }])} />
      <div className="space-y-3">
        {list.map((s, i) => (
          <div key={i} className="bg-secondary/40 rounded-2xl p-4 space-y-2">
            <div className="flex gap-2">
              <input value={s.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="عاصمة مصر هي ___ ." className="input flex-1" />
              <button type="button" onClick={() => setList(list.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {s.answers.map((a, ai) => (
                <input key={ai} value={a} onChange={(e) => update(i, { answers: s.answers.map((x, k) => k === ai ? e.target.value : x) })} placeholder={`إجابة ${ai + 1}`} className="input !w-40" />
              ))}
              <button type="button" onClick={() => update(i, { answers: [...s.answers, ""] })} className="text-sm font-bold text-primary">+ إجابة</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WheelBuilder({ items, setItems }: { items: string[]; setItems: (v: string[]) => void }) {
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

export type Pair = { a: string; b: string };
export function PairsBuilder({ pairs, setPairs }: { pairs: Pair[]; setPairs: (v: Pair[]) => void }) {
  const update = (i: number, patch: Partial<Pair>) => setPairs(pairs.map((p, k) => k === i ? { ...p, ...patch } : p));
  return (
    <div>
      <SectionHeader title="أزواج المطابقة" onAdd={() => setPairs([...pairs, { a: "", b: "" }])} />
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input value={p.a} onChange={(e) => update(i, { a: e.target.value })} placeholder="العنصر الأول" className="input flex-1" />
            <input value={p.b} onChange={(e) => update(i, { b: e.target.value })} placeholder="العنصر الثاني" className="input flex-1" />
            <button type="button" onClick={() => setPairs(pairs.filter((_, k) => k !== i))} className="px-3 rounded-xl bg-destructive/10 text-destructive font-bold">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TowerBuilder({ qs, setQs }: { qs: TowerQuestion[]; setQs: (v: TowerQuestion[]) => void }) {
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
