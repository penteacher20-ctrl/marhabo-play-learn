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
            ? "نستخدم Google AdSense في الصفحات العامة ولوحة المعلم الموجهة للبالغين فقط. لا تُعرض أي إعلانات داخل شاشة اللعب أو الواجهات الموجهة للأطفال. قد يستخدم Google وشركاؤه ملفات تعريف الارتباط لعرض إعلانات مناسبة، ويمكنك التحكم بذلك من إعدادات إعلانات Google."
            : "We use Google AdSense only on public pages and the adult-facing teacher dashboard. No ads are shown inside the play screen or any child-facing interface. Google and its partners may use cookies to serve relevant ads; you can control this in Google Ads Settings."}
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
