import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Sec } from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — مِرحابو" },
      { name: "description", content: "كيف تجمع منصة مِرحابو البيانات وتستخدمها، وسياسة الإعلانات وملفات تعريف الارتباط للمعلمين وأولياء الأمور." },
      { property: "og:title", content: "سياسة الخصوصية — مِرحابو" },
      { property: "og:description", content: "كيف تجمع منصة مِرحابو البيانات وتستخدمها، وسياسة الإعلانات وملفات تعريف الارتباط." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://marhabo-play-learn.lovable.app/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://marhabo-play-learn.lovable.app/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return (
    <PageShell
      title={ar ? "سياسة الخصوصية" : "Privacy Policy"}
      subtitle={ar ? "آخر تحديث: أغسطس 2026" : "Last updated: August 2026"}
    >
      <Sec h={ar ? "من نحن ولمن نوجّه الخدمة" : "Who we are"}>
        <p>
          {ar
            ? "مِرحابو منصة يستخدمها المعلمون وأولياء الأمور (البالغون) لإنشاء ألعاب تعليمية للأطفال. الحسابات مخصّصة للبالغين فقط، والأطفال يلعبون الألعاب عبر روابط مشاركة بدون تسجيل أو جمع بيانات شخصية منهم."
            : "Marhabo is a platform used by teachers and parents (adults) to build educational games for children. Accounts are for adults only; children play shared game links without signing up or providing personal data."}
        </p>
      </Sec>
      <Sec h={ar ? "البيانات التي نجمعها" : "Data we collect"}>
        <p>
          {ar
            ? "بيانات الحساب (البريد الإلكتروني، الاسم، صورة الملف الشخصي إن رفعتها)، محتوى الألعاب الذي تنشئه، وإحصائيات استخدام مجهولة مثل عدد مرات اللعب."
            : "Account data (email, name, optional avatar), the game content you create, and anonymous usage stats such as play counts."}
        </p>
      </Sec>
      <Sec h={ar ? "الإعلانات وملفات تعريف الارتباط" : "Advertising and cookies"}>
        <p>
          {ar
            ? "لا تعرض مِرحابو حاليًا أي إعلانات في أي صفحة من صفحات الموقع، ولا يتم تحميل أي سكربتات إعلانية."
            : "Marhabo does not currently display any advertising on any page, and no advertising scripts are loaded."}
        </p>
        <p>
          {ar
            ? "إذا فُعّلت الإعلانات مستقبلًا فستكون فقط داخل مساحة المعلمين البالغين بعد تسجيل الدخول، ولن تظهر أبدًا في الصفحات العامة الموجهة للأطفال أو داخل شاشات اللعب. وسنحدّث هذه السياسة قبل تفعيلها لتوضيح مزوّد الإعلانات وملفات تعريف الارتباط المستخدمة وطرق إيقاف الإعلانات المخصصة."
            : "If advertising is enabled in the future, it will appear only inside the signed-in adult teacher area, and never on child-facing public pages or inside play screens. We will update this policy before that happens to name the ad provider, the cookies used, and how to opt out of personalized ads."}
        </p>
        <p>
          {ar
            ? "نستخدم حاليًا ملفات تعريف الارتباط الضرورية لتشغيل الخدمة فقط، مثل الحفاظ على تسجيل دخولك وتذكّر تفضيلات اللغة."
            : "Today we use only the cookies required to operate the service, such as keeping you signed in and remembering your language preference."}
        </p>
      </Sec>

      <Sec h={ar ? "حقوقك" : "Your rights"}>
        <p>
          {ar
            ? "يمكنك تعديل بياناتك أو حذف ألعابك في أي وقت من لوحتك، وطلب حذف حسابك بالكامل بالتواصل معنا."
            : "You can edit your data or delete your games any time from your dashboard, and request full account deletion by contacting us."}
        </p>
      </Sec>
    </PageShell>
  );
}
