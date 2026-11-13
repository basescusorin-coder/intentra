import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const allowedOrigins = new Set([
  "https://intentra.ch",
  "https://www.intentra.ch",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

export function corsHeaders(origin: string | null): HeadersInit {
  const accepted = origin && allowedOrigins.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": accepted,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

export function json(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request.headers.get("origin")), "Content-Type": "application/json; charset=utf-8" },
  });
}

export function preflight(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin");
    if (!origin || !allowedOrigins.has(origin)) return json(request, { error: "origin_not_allowed" }, 403);
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) return json(request, { error: "origin_not_allowed" }, 403);
  return null;
}

export function userClient(request: Request): { client: SupabaseClient; token: string } {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+([\w.-]+)$/i.exec(authorization);
  if (!match) throw new Error("unauthorized");
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("server_not_configured");
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });
  return { client, token: match[1] };
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) throw new Error("server_not_configured");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function verifiedUser(client: SupabaseClient, token: string) {
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  return data.user;
}

export async function verifyTurnstile(token: string, request: Request): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}
