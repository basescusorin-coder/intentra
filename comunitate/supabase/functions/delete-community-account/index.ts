import { json, preflight, serviceClient, userClient, verifiedUser } from "../_shared/security.ts";

Deno.serve(async (request) => {
  const pre = preflight(request);
  if (pre) return pre;
  try {
    const { client, token } = userClient(request);
    const user = await verifiedUser(client, token);
    const body = await request.json();
    if (body?.confirm !== true) return json(request, { error: "confirmation_required" }, 400);
    const service = serviceClient();
    const { data: posts, error: postsError } = await service.from("posts").select("id").eq("author_id", user.id);
    if (postsError) return json(request, { error: "delete_failed" }, 500);
    const postIds = (posts || []).map((post) => post.id);
    if (postIds.length) {
      const { data: images, error: imageError } = await service.from("post_images").select("object_path").in("post_id", postIds);
      if (imageError) return json(request, { error: "delete_failed" }, 500);
      const paths = (images || []).map((image) => image.object_path);
      if (paths.length) {
        const { error } = await service.storage.from("community-images").remove(paths);
        if (error) return json(request, { error: "delete_failed" }, 500);
      }
    }
    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) return json(request, { error: "delete_failed" }, 500);
    return json(request, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    const status = message === "unauthorized" ? 401 : message === "server_not_configured" ? 503 : 400;
    return json(request, { error: status === 400 ? "request_failed" : message }, status);
  }
});
