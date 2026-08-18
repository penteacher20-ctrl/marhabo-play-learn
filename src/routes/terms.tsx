import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Sec } from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — مِرحابو" },
      { name: "description", content: "شروط استخدام منصة مِرحابو لإنشاء ونشر الألعاب التعليمية: الحساب، المحتوى، الملكية الفكرية، وحدود المسؤولية." },
      { property: "og:title", content: "شروط الاستخدام — مِرحابو" },
      { property: "og:description", content: "شروط استخدام منصة مِرحابو لإنشاء ونشر الألعاب التعليمية." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://marhabo-play-learn.lovable.app/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://marhabo-play-learn.lovable.app/terms" }],
  }),
  component: Terms,
});

function Terms() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return (
    <PageShell title={ar ? "شروط الاستخدام" : "Terms of Use"} subtitle={ar ? "آخر تحديث: أغسطس 2026" : "Last updated: August 2026"}>
      <Sec h={ar ? "الحساب" : "Your account"}>
        <p>{ar ? "الحسابات للبالغين (معلمين وأولياء أمور). أنت مسؤول عن سرية بيانات دخولك وعن كل نشاط يحدث من حسابك." : "Accounts are for adults (teachers and parents). You are responsible for your credentials and all activity on your account."}</p>
      </Sec>
      <Sec h={ar ? "المحتوى الذي تنشئه" : "Content you create"}>
        <p>{ar ? "تحتفظ بملكية محتوى ألعابك، وتمنحنا ترخيصًا لاستضافته وعرضه لتشغيل الخدمة. يُمنع نشر محتوى غير مناسب للأطفال أو مخالف للقانون أو ينتهك حقوق الآخرين." : "You keep ownership of your game content and grant us a license to host and display it to operate the service. Content that is unlawful, infringing, or unsuitable for children is prohibited."}</p>
      </Sec>
      <Sec h={ar ? "الألعاب الخارجية" : "External games"}>
        <p>{ar ? "بعض القوالب تعتمد على روابط أو أكواد تضمين خارجية، ونحن غير مسؤولين عن محتوى المواقع الخارجية." : "Some templates rely on external links or embed codes; we are not responsible for third-party content."}</p>
      </Sec>
      <Sec h={ar ? "حدود المسؤولية" : "Limitation of liability"}>
        <p>{ar ? "تُقدَّم الخدمة كما هي دون ضمانات، ويمكننا تعديل أو إيقاف أي ميزة، أو إيقاف الحسابات المخالفة." : "The service is provided as is without warranties. We may modify or discontinue features, or suspend accounts that violate these terms."}</p>
      </Sec>
    </PageShell>
  );
}
