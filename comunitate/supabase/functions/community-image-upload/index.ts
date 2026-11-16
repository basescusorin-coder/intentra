import { json, preflight, serviceClient, userClient, verifiedUser } from "../_shared/security.ts";
import { sanitizeImage } from "./image-sanitizer.js";

const MAX_FILE = 5 * 1024 * 1024;
const MAX_REQUEST = 16 * 1024 * 1024;

Deno.serve(async (request) => {
  const pre = preflight(request);
  if (pre) return pre;
  let service: ReturnType<typeof serviceClient> | null = null;
  const uploaded: string[] = [];
  try {
    const { client, token } = userClient(request);
    const user = await verifiedUser(client, token);
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_REQUEST) return json(request, { error: "request_too_large" }, 413);
    const form = await request.formData();
    const postId = form.get("post_id");
    const fileEntries = form.getAll("files");
    if (typeof postId !== "string" || !/^[0-9a-f-]{36}$/i.test(postId) || fileEntries.length < 1 || fileEntries.length > 3 || fileEntries.some((entry) => !(entry instanceof File))) return json(request, { error: "invalid_upload" }, 400);
    const files = fileEntries as File[];
    if (files.some((entry) => entry.size < 1 || entry.size > MAX_FILE)) return json(request, { error: "file_too_large" }, 413);
    // Authentication is required above; email verification is part of the OTP sign-in flow.
    // A second CAPTCHA here blocked legitimate uploads without protecting a public endpoint.
    // `author_id` is intentionally not selectable by clients. RLS returns an
    // owner's pending post here and only published posts belonging to others;
    // the status check rejects the latter before the service-role upload.
    const { data: post, error: postError } = await client.from("posts").select("id,status,author_id").eq("id", postId).maybeSingle();
    if (postError || !post || post.status !== "pending" || post.author_id !== user.id) return json(request, { error: "post_not_uploadable" }, 403);
    const { count, error: countError } = await client.from("post_images").select("id", { count: "exact", head: true }).eq("post_id", postId);
    if (countError || (count || 0) + files.length > 3) return json(request, { error: "image_limit_exceeded" }, 400);
    const cleanImages: ReturnType<typeof sanitizeImage>[] = [];
    for (const entry of files) {
      const input = new Uint8Array(await entry.arrayBuffer());
      try {
        const image = sanitizeImage(input);
        if (image.bytes.length > MAX_FILE) return json(request, { error: "file_too_large" }, 413);
        cleanImages.push(image);
      } catch {
        return json(request, { error: "unsupported_or_invalid_image" }, 415);
      }
    }
    service = serviceClient();
    const rows: { post_id: string; object_path: string; display_order: number }[] = [];
    for (const image of cleanImages) {
      const objectPath = `${crypto.randomUUID()}.${image.extension}`;
      const { error: uploadError } = await service.storage.from("community-images").upload(objectPath, image.bytes, { contentType: image.contentType, cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error("upload_failed");
      uploaded.push(objectPath);
      rows.push({ post_id: postId, object_path: objectPath, display_order: (count || 0) + rows.length });
    }
    const { error: rowError } = await client.from("post_images").insert(rows);
    if (rowError) throw new Error("image_limit_or_policy");
    uploaded.length = 0;
    return json(request, { ok: true }, 201);
  } catch (error) {
    if (service && uploaded.length) await service.storage.from("community-images").remove(uploaded);
    const message = error instanceof Error ? error.message : "request_failed";
    const status = message === "unauthorized" ? 401 : message === "server_not_configured" ? 503 : 400;
    return json(request, { error: status === 400 ? "request_failed" : message }, status);
  }
});

