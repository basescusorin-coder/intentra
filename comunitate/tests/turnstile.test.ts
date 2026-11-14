import { isTurnstileResultValid } from "../supabase/functions/_shared/security.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}


Deno.test("Turnstile accepts successful challenges only for local DEV hosts", () => {
  assertEquals(isTurnstileResultValid({ success: true, hostname: "localhost" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "127.0.0.1" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "intentra.ch" }), false);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "localhost.evil.example" }), false);
  assertEquals(isTurnstileResultValid({ success: false, hostname: "localhost" }), false);
  assertEquals(isTurnstileResultValid(null), false);
});
