import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"];

const SLUG_RULES: Record<string, { min: number; max: number; label: string }> = {
  puzzle: { min: 1, max: 1, label: "البازل" },
  draw: { min: 1, max: 1, label: "التلوين" },
  matching: { min: 2, max: 12, label: "المطابقة" }, // user images only (back added separately)
  quiz: { min: 0, max: 0, label: "الاختبار" },
  blanks: { min: 0, max: 0, label: "الفراغات" },
  wheel: { min: 0, max: 0, label: "العجلة" },
  tower: { min: 0, max: 0, label: "برج الأبطال" },

};

const inputSchema = z.object({
  slug: z.string().min(1).max(32),
  title: z.string().trim().min(1, "أضف عنوان اللعبة").max(200, "العنوان طويل جداً (حدّ 200 حرف)"),
  imageUrls: z.array(z.string().url()).max(20, "عدد الصور أكبر من الحد المسموح (20)"),
});

export const validateTemplateSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { slug, title, imageUrls } = data;
    const rule = SLUG_RULES[slug];
    if (!rule) throw new Error(`قالب غير مدعوم: ${slug}`);

    if (imageUrls.length < rule.min) {
      throw new Error(`قالب ${rule.label}: يلزم ${rule.min} صورة على الأقل`);
    }
    if (imageUrls.length > rule.max) {
      throw new Error(`قالب ${rule.label}: الحدّ الأقصى ${rule.max} صورة`);
    }

    const supaUrl = process.env.SUPABASE_URL!;
    const bucketPrefix = `${supaUrl}/storage/v1/object/public/game-files/${context.userId}/`;

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const label = `الصورة ${i + 1}`;
      if (!url.startsWith(bucketPrefix)) {
        throw new Error(`${label}: مسار غير صالح — يجب رفعها إلى مساحتك الخاصة`);
      }
      let head: Response;
      try {
        head = await fetch(url, { method: "HEAD" });
      } catch {
        throw new Error(`${label}: تعذّر التحقق من الملف (خطأ في الشبكة)`);
      }
      if (!head.ok) throw new Error(`${label}: الملف غير موجود على الخادم (${head.status})`);
      const ct = (head.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
      if (!ALLOWED_MIME.includes(ct)) {
        throw new Error(`${label}: نوع الملف غير مدعوم (${ct || "غير معروف"})`);
      }
      const len = Number(head.headers.get("content-length") || "0");
      if (len > MAX_IMAGE_BYTES) {
        throw new Error(`${label}: الحجم ${(len / 1024 / 1024).toFixed(1)}MB أكبر من 8MB`);
      }
    }

    return { ok: true as const, title, slug, count: imageUrls.length };
  });
