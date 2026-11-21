import { corsHeaders, isTurnstileResultValid, preflight } from "../supabase/functions/_shared/security.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}

const PREVIEW_ORIGIN = "https://intentra-comunitate-preview.vercel.app";

Deno.test("Turnstile accepts successful challenges only for explicitly allowed hostnames", () => {
  assertEquals(isTurnstileResultValid({ success: true, hostname: "localhost" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "127.0.0.1" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "intentra.ch" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "www.intentra.ch" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "intentra-comunitate-preview-git-featur-620154-basescusorin-7695.vercel.app" }), true);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "intentra-comunitate-preview-evil.vercel.app" }), false);
  assertEquals(isTurnstileResultValid({ success: true, hostname: "localhost.evil.example" }), false);
  assertEquals(isTurnstileResultValid({ success: false, hostname: "localhost" }), false);
  assertEquals(isTurnstileResultValid(null), false);
});

Deno.test("edge functions accept explicitly allowed DEV and production origins", () => {
  const accepted = preflight(new Request("https://example.supabase.co/functions/v1/test", {
    method: "OPTIONS",
    headers: { origin: PREVIEW_ORIGIN },
  }));
  assertEquals(accepted?.status, 204);
  assertEquals(accepted?.headers.get("Access-Control-Allow-Origin"), PREVIEW_ORIGIN);

  const production = preflight(new Request("https://example.supabase.co/functions/v1/test", {
    method: "OPTIONS",
    headers: { origin: "https://intentra.ch" },
  }));
  assertEquals(production?.status, 204);
  assertEquals(production?.headers.get("Access-Control-Allow-Origin"), "https://intentra.ch");

  const otherPreview = preflight(new Request("https://example.supabase.co/functions/v1/test", {
    method: "OPTIONS",
    headers: { origin: "https://intentra-comunitate-preview-attacker.vercel.app" },
  }));
  assertEquals(otherPreview?.status, 403);
});
