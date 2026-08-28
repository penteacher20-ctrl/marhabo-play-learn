import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, Sec } from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — مِرحابو" },
      { name: "description", content: "قصة منصة مِرحابو وأهدافها التعليمية: منصة عربية تحوّل الدروس إلى ألعاب تفاعلية ممتعة للأطفال من 4 إلى 12 سنة." },
      { property: "og:title", content: "من نحن — مِرحابو" },
      { property: "og:description", content: "قصة منصة مِرحابو وأهدافها التعليمية في دمج اللعب بالتعلم." },
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
      <Sec h={ar ? "قصتنا" : "Our story"}>
        <p>
          {ar
            ? "بدأت مِرحابو من فكرة بسيطة لاحظناها في الفصول والبيوت: الأطفال ينسون الدرس الجاف بعد ساعات، لكنهم يتذكرون اللعبة لأسابيع. فلماذا لا يكون الدرس نفسه هو اللعبة؟ من هذا السؤال وُلدت مِرحابو — منصة عربية تساعد المعلمين وأولياء الأمور على تحويل أي محتوى تعليمي إلى لعبة تفاعلية ممتعة في دقائق، دون الحاجة لأي خبرة برمجية."
            : "Marhabo started from a simple observation in classrooms and homes: children forget a dry lesson within hours, yet remember a game for weeks. So why shouldn't the lesson itself be the game? From that question Marhabo was born — an Arabic-first platform that helps teachers and parents turn any educational content into a fun interactive game in minutes, with no coding skills required."}
        </p>
        <p>
          {ar
            ? "نؤمن أن اللعب ليس ترفًا بل أسلوب تعلّم طبيعي. حين يجيب الطفل على سؤال ليبني طابقًا جديدًا في برج الأبطال، أو يجمع قطع البازل ليكتشف الصورة، أو يطابق الكلمات بمعانيها — فهو يتعلم بعمق ومتعة في آن واحد، دون أن يشعر أنه في اختبار."
            : "We believe play is not a luxury but a natural way of learning. When a child answers a question to build a new floor in Tower Kingdom, assembles puzzle pieces to reveal a picture, or matches words to meanings — they learn deeply and joyfully at once, without feeling tested."}
        </p>
      </Sec>
      <Sec h={ar ? "أهدافنا التعليمية" : "Our educational goals"}>
        <p>
          {ar
            ? "هدفنا الأول هو تمكين المعلم العربي بأدوات عصرية بلغته: قوالب جاهزة (اختبارات، مطابقة، عجلة الحظ، بازل، رسم وتلوين، برج الأبطال وغيرها) يخصّصها بمحتوى مادته في خطوات بسيطة، ثم يشاركها مع طلابه برابط واحد يلعبون منه فورًا دون تسجيل. وهدفنا الثاني هو بناء مجتمع تعليمي يتبادل فيه المعلمون ألعابهم العامة ليستفيد منها الجميع."
            : "Our first goal is empowering Arabic-speaking teachers with modern tools in their language: ready-made templates (quizzes, matching, spin wheel, jigsaw, drawing and coloring, Tower Kingdom, and more) they customize with their own lesson content in simple steps, then share via a single link students can play instantly with no signup. Our second goal is building a teaching community where educators share their public games for everyone's benefit."}
        </p>
        <p>
          {ar
            ? "نلتزم بأن تكون تجربة الطفل آمنة تمامًا: شاشات اللعب خالية من الإعلانات ومن أي عناصر تجارية، والإعلانات تظهر فقط في الصفحات الموجهة للبالغين. كما ندعم اللغتين العربية والإنجليزية لتناسب المنصة مدارس اللغات والمحتوى الثنائي."
            : "We are committed to a completely safe experience for children: play screens are free of ads and commercial elements, with ads appearing only on adult-facing pages. The platform fully supports both Arabic and English to suit language schools and bilingual content."}
        </p>
      </Sec>
      <Sec h={ar ? "رؤيتنا" : "Our vision"}>
        <p>
          {ar
            ? "نسعى لأن تصبح مِرحابو المرجع الأول للمعلم العربي في التعلم القائم على اللعب، وأن يجد كل طفل فيها درسه المفضل على هيئة لعبة يحبها — لأننا مقتنعون أن أفضل تعليم هو الذي لا يشعر الطفل أنه تعليم."
            : "We strive to make Marhabo the go-to reference for Arabic teachers in game-based learning, where every child finds their favorite lesson as a game they love — because we believe the best education is the kind that never feels like education."}
        </p>
      </Sec>
      <p>
        <Link to="/templates" className="bubble-btn text-white inline-block" style={{ background: "var(--gradient-primary)" }}>
          {ar ? "استعرض القوالب" : "Browse templates"} →
        </Link>
      </p>
    </PageShell>
  );
}
