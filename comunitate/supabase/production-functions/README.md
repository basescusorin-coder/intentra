# Production Edge Function bundle

This directory records the production-specific deployment source for the three
Community Edge Functions. Keep the DEV bundle under `supabase/functions/`.

- All functions retain `verify_jwt: true`.
- The production shared security module accepts only `https://intentra.ch` and
  `https://www.intentra.ch` origins and Turnstile hostnames.
- The upload handler checks the authenticated user's post ownership through the
  service client before writing any object to Storage.
- The function-local `deno.json` files pin the Supabase JS import map to 2.119.0.
- No service-role key, SMTP password, or Turnstile secret is stored here.

On 2026-11-24 these sources were deployed to Supabase PROD as version 2 for all
three functions. Do not deploy the DEV shared security module to PROD unchanged.
