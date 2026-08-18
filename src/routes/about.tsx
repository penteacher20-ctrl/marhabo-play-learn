import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, Sec } from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — مِرحابو" },
      { name: "description", content: "مِرحابو منصة عربية تساعد المعلمين على تحويل الدروس إلى ألعاب تعليمية تفاعلية للأطفال من 4 إلى 12 سنة." },
      { property: "og:title", content: "من نحن — مِرحابو" },
      { property: "og:description", content: "منصة عربية تساعد المعلمين على تحويل الدروس إلى ألعاب تعليمية تفاعلية." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://marhabo-play-learn.lovable.app/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://marhabo-play-learn.lovable.app/about" }],
  }),
  component: About,
});

function About() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return (
    <PageShell title={ar ? "من نحن" : "About us"} subtitle={ar ? "التعلّم بقى لعبة!" : "Learning, but make it play!"}>
      <Sec h={ar ? "رسالتنا" : "Our mission"}>
        <p>{ar ? "نساعد المعلمين وأولياء الأمور على تحويل أي درس إلى لعبة تفاعلية ممتعة في دقائق، بالعربية أولًا وبدعم كامل للإنجليزية." : "We help teachers and parents turn any lesson into a fun interactive game in minutes — Arabic first, with full English support."}</p>
      </Sec>
      <Sec h={ar ? "كيف تعمل المنصة" : "How it works"}>
        <p>{ar ? "اختر قالبًا جاهزًا (اختبارات، مطابقة، عجلة، بازل، رسم، برج الأبطال...)، أضف محتواك، ثم شارك رابط اللعبة مع طلابك ليلعبوا فورًا دون تسجيل." : "Pick a ready template (quiz, matching, wheel, puzzle, drawing, Tower Kingdom...), add your content, then share the game link with your students — no signup needed to play."}</p>
      </Sec>
      <Sec h={ar ? "للأطفال بأمان" : "Safe for kids"}>
        <p>{ar ? "شاشات اللعب خالية من الإعلانات ومن أي عناصر تجارية، والإعلانات تظهر فقط في الصفحات الموجهة للبالغين." : "Play screens are free of ads and commercial elements; ads appear only on adult-facing pages."}</p>
      </Sec>
      <p>
        <Link to="/templates" className="bubble-btn text-white inline-block" style={{ background: "var(--gradient-primary)" }}>
          {ar ? "استعرض القوالب" : "Browse templates"} →
        </Link>
      </p>
    </PageShell>
  );
}
