import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdminCtx(ctx: { supabase: any; userId: string }) {
  const [a, s] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
  ]);
  return !!(a.data || s.data);
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  if (!(await isAdminCtx(ctx))) throw new Error("Forbidden");
}

export const createSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; description: string; image_path?: string | null; link_url?: string | null }) => {
    const title = (d?.title ?? "").trim();
    const description = (d?.description ?? "").trim();
    if (!title) throw new Error("Title required");
    if (!description) throw new Error("Description required");
    if (title.length > 200) throw new Error("Title too long");
    if (description.length > 5000) throw new Error("Description too long");
    const link = (d.link_url ?? "").trim();
    if (link && !/^https?:\/\/[^\s]+$/i.test(link)) throw new Error("Invalid link");
    return {
      title, description,
      image_path: d.image_path?.trim() || null,
      link_url: link || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("suggestions")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        image_url: data.image_path,
        link_url: data.link_url,
      })
      .select("id, title")
      .single();
    if (error) throw new Error(error.message);

    // Fetch author name
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
    const authorName = prof?.name || "مستخدم";

    // Notify all admins/super_admins using service role
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin"]);
    const adminIds = Array.from(new Set((adminRoles ?? []).map((r: any) => r.user_id))).filter((id) => id !== userId);
    if (adminIds.length) {
      const rows = adminIds.map((uid) => ({
        user_id: uid,
        type: "suggestion",
        title: `اقتراح جديد من ${authorName} • New suggestion from ${authorName}`,
        message: inserted.title,
        reference_id: inserted.id,
        reference_type: "suggestion",
      }));
      await supabaseAdmin.from("notifications").insert(rows);
    }

    return { ok: true, id: inserted.id };
  });

export const signSuggestionImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => {
    if (!d?.path) throw new Error("path required");
    return { path: d.path };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const owner = data.path.split("/")[0];
    if (owner !== userId && !(await isAdminCtx(context))) throw new Error("Forbidden");
    const { data: signed, error } = await supabase.storage
      .from("suggestion-images")
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const getUserSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("suggestions")
      .select("id,title,description,image_url,link_url,status,admin_response,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAllSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; search?: string; page?: number; limit?: number }) => ({
    status: d?.status && ["new", "reviewed", "resolved", "rejected"].includes(d.status) ? d.status : undefined,
    search: (d?.search ?? "").trim().slice(0, 100) || undefined,
    page: Math.max(1, Number(d?.page) || 1),
    limit: Math.min(50, Math.max(5, Number(d?.limit) || 20)),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    let q = supabaseAdmin
      .from("suggestions")
      .select("id,user_id,title,description,image_url,link_url,status,admin_response,seen_by_admin,created_at,updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.or(`title.ilike.%${data.search}%,description.ilike.%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    let profileMap = new Map<string, { name: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id,name").in("id", ids);
      profileMap = new Map((profs ?? []).map((p: any) => [p.id, { name: p.name }]));
    }
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, author_name: profileMap.get(r.user_id)?.name ?? null })),
      total: count ?? 0,
      page: data.page,
      limit: data.limit,
    };
  });

export const getSuggestionById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // mark seen
    await supabaseAdmin.from("suggestions").update({ seen_by_admin: true }).eq("id", data.id);
    const { data: row, error } = await supabaseAdmin
      .from("suggestions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    const { data: prof } = await supabaseAdmin.from("profiles").select("name").eq("id", row.user_id).maybeSingle();
    return { ...row, author_name: prof?.name ?? null };
  });

export const updateSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string; admin_response?: string | null }) => {
    if (!d?.id) throw new Error("id required");
    if (!["new", "reviewed", "resolved", "rejected"].includes(d.status)) throw new Error("Invalid status");
    return {
      id: d.id,
      status: d.status,
      admin_response: (d.admin_response ?? "").trim() || null,
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("suggestions")
      .select("user_id,title,status,admin_response")
      .eq("id", data.id)
      .maybeSingle();
    if (!prev) throw new Error("Not found");
    const { error } = await context.supabase
      .from("suggestions")
      .update({ status: data.status, admin_response: data.admin_response })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const statusChanged = prev.status !== data.status;
    const responseChanged = (prev.admin_response ?? null) !== (data.admin_response ?? null) && !!data.admin_response;
    if ((statusChanged || responseChanged) && prev.user_id !== context.userId) {
      const statusMapAr: Record<string, string> = { new: "جديد", reviewed: "قيد المراجعة", resolved: "تم", rejected: "مرفوض" };
      const statusMapEn: Record<string, string> = { new: "New", reviewed: "Reviewed", resolved: "Resolved", rejected: "Rejected" };
      let title = "";
      if (statusChanged && responseChanged) {
        title = `تحديث على اقتراحك: ${statusMapAr[data.status]} • Update on your suggestion: ${statusMapEn[data.status]}`;
      } else if (statusChanged) {
        title = `تغيّرت حالة اقتراحك إلى ${statusMapAr[data.status]} • Status changed to ${statusMapEn[data.status]}`;
      } else {
        title = `رد جديد من الإدارة على اقتراحك • New admin response on your suggestion`;
      }
      await supabaseAdmin.from("notifications").insert({
        user_id: prev.user_id,
        type: "suggestion_update",
        title,
        message: prev.title,
        reference_id: data.id,
        reference_type: "suggestion",
      });
    }
    return { ok: true };
  });

export const deleteSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("suggestions").select("image_url").eq("id", data.id).maybeSingle();
    if (row?.image_url) {
      await supabaseAdmin.storage.from("suggestion-images").remove([row.image_url]).catch(() => {});
    }
    await supabaseAdmin.from("notifications")
      .delete().eq("reference_id", data.id).eq("reference_type", "suggestion");
    const { error } = await supabaseAdmin.from("suggestions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
