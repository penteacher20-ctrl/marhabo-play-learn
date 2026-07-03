import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB unzipped
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per file

const inputSchema = z.object({
  title: z.string().trim().min(1, "أضف عنوان اللعبة").max(200, "العنوان طويل جداً"),
  indexUrl: z.string().url("رابط غير صالح"),
  folderPath: z.string().min(1, "مسار المجلد مفقود"), // e.g. "<userId>/<ts>-name"
});

const BAD_PATH = /(^|\/)\.\.($|\/)|\\|^\/|:/;

const uploadPlanSchema = z.object({
  title: z.string().trim().min(1, "أضف عنوان اللعبة").max(200, "العنوان طويل جداً"),
  indexRel: z.string().min(1, "نقطة الدخول مفقودة"),
  files: z.array(z.object({
    rel: z.string().min(1, "اسم ملف غير صالح"),
    size: z.number().int().nonnegative(),
    contentType: z.string().min(1).max(120),
  })).min(1, "الأرشيف فارغ"),
});

function validateRelativePath(path: string) {
  if (BAD_PATH.test(path)) throw new Error(`مسار غير آمن داخل الأرشيف: ${path}`);
  if (path.startsWith(".") || path.includes("//")) throw new Error(`مسار غير آمن داخل الأرشيف: ${path}`);
  if (!/^[a-zA-Z0-9._\-/]+$/.test(path)) throw new Error(`اسم ملف غير مسموح بعد التنظيف: ${path}`);
}

export const createZipUploadPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uploadPlanSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { files, indexRel } = data;

    if (files.length > MAX_FILES) throw new Error(`عدد الملفات يتجاوز الحد المسموح (${MAX_FILES})`);
    validateRelativePath(indexRel);
    if (!/(^|\/)index\.html?$/i.test(indexRel)) throw new Error("نقطة الدخول يجب أن تكون index.html");

    let total = 0;
    const seen = new Set<string>();
    for (const file of files) {
      validateRelativePath(file.rel);
      if (seen.has(file.rel)) throw new Error(`ملف مكرر داخل الأرشيف: ${file.rel}`);
      seen.add(file.rel);
      if (file.size > MAX_FILE_BYTES) throw new Error(`ملف ${file.rel.split("/").pop()} أكبر من ${MAX_FILE_BYTES / 1024 / 1024}MB`);
      total += file.size;
      if (total > MAX_TOTAL_BYTES) throw new Error(`الحجم الإجمالي ${(total / 1024 / 1024).toFixed(1)}MB أكبر من ${MAX_TOTAL_BYTES / 1024 / 1024}MB`);
    }
    if (!seen.has(indexRel)) throw new Error("لا يوجد index.html داخل الملفات المحددة");

    const baseFolder = `${context.userId}/${Date.now()}-${crypto.randomUUID()}`;
    const signedFiles = [] as Array<{ rel: string; path: string; token: string; signedUrl: string; contentType: string }>;
    for (const file of files) {
      const path = `${baseFolder}/${file.rel}`;
      const { data: signed, error } = await supabaseAdmin.storage
        .from("game-files")
        .createSignedUploadUrl(path, { upsert: true });
      if (error || !signed?.token) {
        throw new Error(`تعذّر تجهيز رفع الملف "${file.rel}": ${error?.message ?? "خطأ غير معروف"}`);
      }
      signedFiles.push({ rel: file.rel, path, token: signed.token, signedUrl: signed.signedUrl, contentType: file.contentType });
    }

    return {
      baseFolder,
      indexPath: `${baseFolder}/${indexRel}`,
      files: signedFiles,
      totalBytes: total,
    };
  });

export const validateZipGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { indexUrl, folderPath } = data;
    const supaUrl = process.env.SUPABASE_URL!;
    const publicPrefix = `${supaUrl}/storage/v1/object/public/game-files/`;
    const userPrefix = `${context.userId}/`;

    // 1) folder must be under caller's own space
    if (!folderPath.startsWith(userPrefix)) {
      throw new Error("مسار غير مسموح: يجب أن يكون داخل مساحتك الخاصة");
    }
    if (BAD_PATH.test(folderPath)) {
      throw new Error("مسار غير آمن (path traversal مرفوض)");
    }

    // 2) index URL must be an index.html inside that same folder
    if (!indexUrl.startsWith(publicPrefix + folderPath + "/")) {
      throw new Error("رابط ملف الدخول لا يطابق المجلد المرفوع");
    }
    const rel = indexUrl.slice((publicPrefix + folderPath + "/").length);
    if (BAD_PATH.test(rel)) throw new Error("مسار غير آمن داخل الأرشيف");
    if (!/(^|\/)index\.html?$/i.test(rel)) {
      throw new Error("نقطة الدخول يجب أن تكون index.html");
    }

    // 3) verify index is actually reachable and is HTML
    let head: Response;
    try { head = await fetch(indexUrl, { method: "HEAD" }); }
    catch { throw new Error("تعذّر الوصول إلى index.html (خطأ شبكة)"); }
    if (!head.ok) throw new Error(`index.html غير موجود (HTTP ${head.status})`);
    const ct = (head.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html")) {
      throw new Error(`نوع ملف الدخول غير صحيح (${ct || "غير معروف"})`);
    }

    // 4) list the whole folder recursively via Storage API and enforce limits
    const listUrl = `${supaUrl}/storage/v1/object/list/game-files`;
    const walk = async (prefix: string, acc: Array<{ name: string; size: number }>) => {
      let offset = 0;
      // paginate defensively
      while (true) {
        const res = await fetch(listUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
            authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY!}`,
          },
          body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
        });
        if (!res.ok) throw new Error(`تعذّر التحقق من ملفات الأرشيف (${res.status})`);
        const items = (await res.json()) as Array<{ name: string; id: string | null; metadata: { size?: number } | null }>;
        if (!items.length) break;
        for (const it of items) {
          const full = `${prefix}/${it.name}`;
          if (it.id === null) {
            // subfolder
            if (BAD_PATH.test(it.name)) throw new Error(`مسار غير آمن: ${it.name}`);
            await walk(full, acc);
          } else {
            if (BAD_PATH.test(it.name)) throw new Error(`اسم ملف غير آمن: ${it.name}`);
            acc.push({ name: full, size: it.metadata?.size ?? 0 });
            if (acc.length > MAX_FILES) {
              throw new Error(`عدد الملفات يتجاوز الحد المسموح (${MAX_FILES})`);
            }
          }
        }
        if (items.length < 100) break;
        offset += 100;
      }
    };

    const files: Array<{ name: string; size: number }> = [];
    await walk(folderPath, files);

    if (!files.length) throw new Error("لم يتم رفع أي ملف داخل المجلد");
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      throw new Error(`الحجم الإجمالي ${(total / 1024 / 1024).toFixed(1)}MB أكبر من ${MAX_TOTAL_BYTES / 1024 / 1024}MB`);
    }
    const big = files.find((f) => f.size > MAX_FILE_BYTES);
    if (big) throw new Error(`ملف ${big.name.split("/").pop()} أكبر من ${MAX_FILE_BYTES / 1024 / 1024}MB`);
    const hasIndex = files.some((f) => /(^|\/)index\.html?$/i.test(f.name));
    if (!hasIndex) throw new Error("لا يوجد index.html داخل المجلد المرفوع");

    return { ok: true as const, count: files.length, totalBytes: total };
  });
