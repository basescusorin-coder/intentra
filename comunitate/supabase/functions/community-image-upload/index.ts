import { ImageMagick, initializeImageMagick, MagickFormat } from "@imagemagick/magick-wasm";
import { json, preflight, serviceClient, userClient, verifiedUser, verifyTurnstile } from "../_shared/security.ts";

const wasmBytes = await Deno.readFile(new URL("magick.wasm", import.meta.resolve("@imagemagick/magick-wasm")));
await initializeImageMagick(wasmBytes);
const MAX_FILE = 5 * 1024 * 1024;
const MAX_REQUEST = 16 * 1024 * 1024;
const MAX_PIXELS = 12_000_000;

function dimensions(bytes: Uint8Array, type: "jpeg" | "png" | "webp"): [number, number] | null {
  const u32be = (at: number) => new DataView(bytes.buffer, bytes.byteOffset + at, 4).getUint32(0, false);
  if (type === "png") return bytes.length >= 24 ? [u32be(16), u32be(20)] : null;
  if (type === "webp") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X" && bytes.length >= 30) return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
    if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return [((bytes[27] << 8) | bytes[26]) & 0x3fff, ((bytes[29] << 8) | bytes[28]) & 0x3fff];
    if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      const b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
      return [1 + (((b1 & 0x3f) << 8) | bytes[21]), 1 + (((b1 & 0xc0) >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10))];
    }
    return null;
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return [bytes[i + 7] * 256 + bytes[i + 8], bytes[i + 5] * 256 + bytes[i + 6]];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = bytes[i + 2] * 256 + bytes[i + 3];
    if (length < 2) return null;
    i += length + 2;
  }
  return null;
}

function detect(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return "png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "webp";
  return null;
}

function sanitize(input: Uint8Array): Uint8Array {
  const output = ImageMagick.read(input, (image) => {
    if (image.width < 1 || image.height < 1 || image.width * image.height > MAX_PIXELS) throw new Error("image_too_large");
    image.autoOrient();
    image.thumbnail(1920, 1920);
    image.strip();
    image.format = MagickFormat.Jpeg;
    image.quality = 82;
    return image.write(MagickFormat.Jpeg, (data) => data);
  });
  if (!(output instanceof Uint8Array) || output.length < 4 || output.length > MAX_FILE) throw new Error("image_rejected");
  return output;
}

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
    const captcha = form.get("captcha_token");
    const fileEntries = form.getAll("files");
    if (typeof postId !== "string" || !/^[0-9a-f-]{36}$/i.test(postId) || fileEntries.length < 1 || fileEntries.length > 3 || fileEntries.some((entry) => !(entry instanceof File))) return json(request, { error: "invalid_upload" }, 400);
    const files = fileEntries as File[];
    if (files.some((entry) => entry.size < 1 || entry.size > MAX_FILE)) return json(request, { error: "file_too_large" }, 413);
    if (typeof captcha !== "string" || !(await verifyTurnstile(captcha, request))) return json(request, { error: "captcha_failed" }, 403);
    // `author_id` is intentionally not selectable by clients. RLS returns an
    // owner's pending post here and only published posts belonging to others;
    // the status check rejects the latter before the service-role upload.
    const { data: post, error: postError } = await client.from("posts").select("id,status").eq("id", postId).maybeSingle();
    if (postError || !post || post.status !== "pending") return json(request, { error: "post_not_uploadable" }, 403);
    const { count, error: countError } = await client.from("post_images").select("id", { count: "exact", head: true }).eq("post_id", postId);
    if (countError || (count || 0) + files.length > 3) return json(request, { error: "image_limit_exceeded" }, 400);
    const cleanImages: Uint8Array[] = [];
    for (const entry of files) {
      const input = new Uint8Array(await entry.arrayBuffer());
      const type = detect(input);
      if (!type) return json(request, { error: "unsupported_image" }, 415);
      const dims = dimensions(input, type);
      if (!dims || dims[0] < 1 || dims[1] < 1 || dims[0] * dims[1] > MAX_PIXELS) return json(request, { error: "invalid_image_dimensions" }, 415);
      cleanImages.push(sanitize(input));
    }
    service = serviceClient();
    const rows: { post_id: string; object_path: string; display_order: number }[] = [];
    for (const output of cleanImages) {
      const objectPath = `${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await service.storage.from("community-images").upload(objectPath, output, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
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
