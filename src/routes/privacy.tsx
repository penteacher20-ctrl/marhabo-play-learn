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
      <Sec h={ar ? "الإعلانات وملفات تعريف الارتباط (Google AdSense)" : "Advertising and cookies (Google AdSense)"}>
        <p>
          {ar
            ? "نستخدم Google AdSense لعرض الإعلانات في الصفحات العامة ولوحة المعلم الموجهة للبالغين فقط. لا تُعرض أي إعلانات داخل شاشة اللعب أو الواجهات الموجهة للأطفال."
            : "We use Google AdSense to serve ads on public pages and the adult-facing teacher dashboard only. No ads are shown inside the play screen or any child-facing interface."}
        </p>
        <p>
          {ar
            ? "تستخدم جهات خارجية، بما فيها Google، ملفات تعريف الارتباط (مثل ملف DoubleClick) لعرض إعلانات بناءً على زياراتك السابقة لهذا الموقع أو لمواقع أخرى. استخدام Google لملفات تعريف الارتباط الإعلانية يمكّنه وشركاءه من عرض إعلانات مخصصة استنادًا إلى زيارتك."
            : "Third-party vendors, including Google, use cookies (such as the DoubleClick cookie) to serve ads based on your prior visits to this or other websites. Google's use of advertising cookies enables it and its partners to serve personalized ads based on your visit."}
        </p>
        <p>
          {ar
            ? "يمكنك إيقاف الإعلانات المخصصة في أي وقت عبر إعدادات إعلانات Google (adssettings.google.com)، أو إدارة ملفات تعريف الارتباط من إعدادات متصفحك. استمرارك في استخدام الموقع يعني موافقتك على استخدام ملفات تعريف الارتباط الضرورية لتشغيل الخدمة."
            : "You can opt out of personalized advertising anytime via Google Ads Settings (adssettings.google.com), or manage cookies in your browser settings. Continued use of the site means you accept the cookies required to operate the service."}
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
