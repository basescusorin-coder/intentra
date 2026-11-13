import { json, preflight, serviceClient, userClient, verifiedUser } from "../_shared/security.ts";

Deno.serve(async (request) => {
  const pre = preflight(request);
  if (pre) return pre;
  try {
    const { client, token } = userClient(request);
    const user = await verifiedUser(client, token);
    const body = await request.json();
    const postId = typeof body?.post_id === "string" ? body.post_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(postId)) return json(request, { error: "invalid_request" }, 400);
    const service = serviceClient();
    // The author UUID is private and not selectable through PostgREST. Verify
    // ownership with the service client before deleting any stored objects.
    const { data: post, error: postError } = await service.from("posts").select("author_id").eq("id", postId).maybeSingle();
    if (postError || !post || post.author_id !== user.id) return json(request, { error: "not_found" }, 404);
    const { data: images, error: imageError } = await service.from("post_images").select("object_path").eq("post_id", postId);
    if (imageError) return json(request, { error: "delete_failed" }, 500);
    const paths = (images || []).map((image) => image.object_path);
    if (paths.length) {
      const { error } = await service.storage.from("community-images").remove(paths);
      if (error) return json(request, { error: "delete_failed" }, 500);
    }
    const { error: deleteError } = await client.from("posts").delete().eq("id", postId);
    if (deleteError) return json(request, { error: "delete_failed" }, 500);
    return json(request, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    const status = message === "unauthorized" ? 401 : message === "server_not_configured" ? 503 : 400;
    return json(request, { error: status === 400 ? "request_failed" : message }, status);
  }
});
