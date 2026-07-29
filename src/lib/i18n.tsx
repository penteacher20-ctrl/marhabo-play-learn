import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "ar" | "en";
type Dict = Record<string, { ar: string; en: string }>;

export const t: Dict = {
  brand: { ar: "مِرحابو", en: "Marhabo" },
  tagline: { ar: "التعلّم بقى لعبة!", en: "Learning is now a game!" },
  nav_home: { ar: "الرئيسية", en: "Home" },
  nav_templates: { ar: "القوالب", en: "Templates" },
  nav_upload: { ar: "رفع لعبة", en: "Upload Game" },
  nav_login: { ar: "تسجيل الدخول", en: "Sign in" },
  nav_dashboard: { ar: "لوحتي", en: "Dashboard" },
  nav_logout: { ar: "خروج", en: "Sign out" },
  hero_title: { ar: "تعلّم باللعب!", en: "Learn by playing!" },
  hero_sub: { ar: "مغامرات تعليمية ممتعة للأطفال من ٤–١٢ سنة", en: "Fun learning adventures for kids aged 4–12" },
  cta_start: { ar: "ابدأ مجاناً", en: "Start free" },
  cta_explore: { ar: "اكتشف الألعاب", en: "Explore games" },
  templates_title: { ar: "اختر قالب لعبتك", en: "Pick your game template" },
  templates_sub: { ar: "قوالب جاهزة، أضف محتواك في دقائق", en: "Ready-made templates, add your content in minutes" },
  use_template: { ar: "استخدم القالب", en: "Use template" },
  coming_soon: { ar: "قريباً", en: "Coming soon" },
  how_title: { ar: "كيف تعمل؟", en: "How it works" },
  step1_t: { ar: "اختر قالب", en: "Pick a template" },
  step1_d: { ar: "اختر من بين عشرات القوالب التعليمية الممتعة", en: "Choose from dozens of fun educational templates" },
  step2_t: { ar: "أضف محتواك", en: "Add your content" },
  step2_d: { ar: "اكتب الأسئلة، ارفع الصور، خصص اللعبة", en: "Write questions, upload images, customize the game" },
  step3_t: { ar: "شارك مع طلابك", en: "Share with your students" },
  step3_d: { ar: "احصل على رابط أو كود تضمين بنقرة واحدة", en: "Get a shareable link or embed code with one click" },
  upload_title: { ar: "ارفع لعبة HTML", en: "Upload an HTML game" },
  upload_sub: { ar: "اسحب ملف اللعبة هنا أو اضغط للاختيار", en: "Drop your game file here or click to choose" },
  game_title: { ar: "عنوان اللعبة", en: "Game title" },
  game_desc: { ar: "وصف اللعبة", en: "Game description" },
  thumbnail: { ar: "الصورة المصغرة", en: "Thumbnail" },
  privacy: { ar: "الخصوصية", en: "Privacy" },
  public: { ar: "عام", en: "Public" },
  private: { ar: "خاص", en: "Private" },
  upload_now: { ar: "ارفع الآن", en: "Upload now" },
  share_link: { ar: "نسخ الرابط", en: "Copy link" },
  embed_code: { ar: "كود التضمين", en: "Embed code" },
  copied: { ar: "تم النسخ!", en: "Copied!" },
  my_games: { ar: "ألعابي", en: "My games" },
  total_games: { ar: "عدد الألعاب", en: "Games" },
  total_plays: { ar: "إجمالي اللعب", en: "Total plays" },
  upload_new: { ar: "ارفع لعبة جديدة", en: "Upload new game" },
  from_template: { ar: "ابدأ من قالب", en: "Start from template" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  name: { ar: "الاسم", en: "Name" },
  signup: { ar: "إنشاء حساب", en: "Sign up" },
  signin: { ar: "تسجيل الدخول", en: "Sign in" },
  have_account: { ar: "لديك حساب؟", en: "Have an account?" },
  no_account: { ar: "ليس لديك حساب؟", en: "No account?" },
  more_games: { ar: "أكثر من ٣٥ لعبة تعليمية", en: "Over 35 educational games" },
  footer: { ar: "صُنع بحب للأطفال 💜", en: "Made with love for kids 💜" },
  community_title: { ar: "ألعاب من صنع الأعضاء", en: "Games by our community" },
  community_sub: { ar: "استكشف أحدث الألعاب التي أنشأها المعلمون والأطفال", en: "Explore the latest games created by teachers and kids" },
  play_now: { ar: "العب الآن", en: "Play now" },
  view_all: { ar: "عرض الكل", en: "View all" },
  by: { ar: "بواسطة", en: "by" },
  nav_suggestions: { ar: "الاقتراحات", en: "Suggestions" },
  sugg_title: { ar: "اقتراحات وملاحظات", en: "Suggestions & Feedback" },
  sugg_sub: { ar: "شاركنا أفكارك لتحسين مِرحابو ✨", en: "Share your ideas to improve Marhabo ✨" },
  sugg_form_title: { ar: "عنوان الاقتراح", en: "Suggestion title" },
  sugg_form_desc: { ar: "الوصف التفصيلي", en: "Details" },
  sugg_form_image: { ar: "صورة (اختياري)", en: "Image (optional)" },
  sugg_form_link: { ar: "رابط (اختياري)", en: "Link (optional)" },
  sugg_send: { ar: "إرسال الاقتراح", en: "Send suggestion" },
  sugg_sent: { ar: "شكراً! تم إرسال اقتراحك.", en: "Thanks! Your suggestion was sent." },
  sugg_my: { ar: "اقتراحاتي السابقة", en: "My previous suggestions" },
  sugg_empty: { ar: "لم ترسل أي اقتراح بعد", en: "No suggestions yet" },
  sugg_admin_response: { ar: "رد الإدارة", en: "Admin response" },
  sugg_status_new: { ar: "جديد", en: "New" },
  sugg_status_reviewed: { ar: "قيد المراجعة", en: "Reviewed" },
  sugg_status_resolved: { ar: "تم", en: "Resolved" },
  sugg_status_rejected: { ar: "مرفوض", en: "Rejected" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  no_notifications: { ar: "لا توجد إشعارات", en: "No notifications" },
  mark_all_read: { ar: "تعليم الكل كمقروء", en: "Mark all as read" },
  view_details: { ar: "عرض التفاصيل", en: "View details" },
  delete: { ar: "حذف", en: "Delete" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  search: { ar: "بحث...", en: "Search..." },
  all: { ar: "الكل", en: "All" },
};

interface Ctx { lang: Lang; setLang: (l: Lang) => void; tr: (k: keyof typeof t) => string; }
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const tr = (k: keyof typeof t) => t[k][lang];
  return <I18nContext.Provider value={{ lang, setLang, tr }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
