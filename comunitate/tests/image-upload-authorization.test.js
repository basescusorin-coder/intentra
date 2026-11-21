import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../supabase/functions/community-image-upload/index.ts", import.meta.url), "utf8");

test("image upload verifies authenticated author before storage", () => {
  assert.match(source, /const user = await verifiedUser\(client, token\)/);
  assert.match(source, /service\.from\("posts"\)[\s\S]*?\.select\("author_id,status"\)/);
  assert.match(source, /post\.author_id !== user\.id/);
  const ownerGuard = source.indexOf("post.author_id !== user.id");
  const upload = source.indexOf('.storage.from("community-images").upload(');
  assert.ok(ownerGuard >= 0 && upload > ownerGuard, "ownership check must precede upload");
});

test("image upload retains size and file-count constraints", () => {
  assert.match(source, /const MAX_FILE = 5 \* 1024 \* 1024/);
  assert.match(source, /fileEntries\.length > 3/);
  assert.match(source, /\(count \|\| 0\) \+ files\.length > 3/);
});
