import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Sec } from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — مِرحابو" },
      { name: "description", content: "تواصل مع فريق مِرحابو للاستفسارات والدعم واقتراح قوالب ألعاب تعليمية جديدة." },
      { property: "og:title", content: "تواصل معنا — مِرحابو" },
      { property: "og:description", content: "تواصل مع فريق مِرحابو للاستفسارات والدعم والاقتراحات." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://marhabo-play-learn.lovable.app/contact" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://marhabo-play-learn.lovable.app/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return (
    <PageShell title={ar ? "تواصل معنا" : "Contact us"} subtitle={ar ? "يسعدنا سماع رأيك" : "We'd love to hear from you"}>
      <Sec h={ar ? "البريد الإلكتروني" : "Email"}>
        <p>
          <a href="mailto:penteacher20@gmail.com" className="font-bold text-primary hover:underline">penteacher20@gmail.com</a>
        </p>
        <p>{ar ? "نرد عادة خلال 1–2 يوم عمل." : "We usually reply within 1–2 business days."}</p>
      </Sec>
      <Sec h={ar ? "الاقتراحات والملاحظات" : "Suggestions & feedback"}>
        <p>{ar ? "إذا كان لديك حساب، استخدم صفحة الاقتراحات داخل المنصة للتواصل المباشر مع الإدارة ومتابعة حالة اقتراحك." : "If you have an account, use the in-app Suggestions page to chat with the team and track your request."}</p>
      </Sec>
      <Sec h={ar ? "الإبلاغ عن محتوى" : "Report content"}>
        <p>{ar ? "لأي محتوى غير مناسب للأطفال أو مخالف، راسلنا مع رابط اللعبة وسنتعامل معه سريعًا." : "For content that is unsuitable for children or violates our terms, email us with the game link and we'll act quickly."}</p>
      </Sec>
    </PageShell>
  );
}
