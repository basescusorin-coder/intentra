# INTENTRA Comunitate: contract de configurare PROD

Document de configurare, nu fișier de mediu. Nu introduce credențiale în commituri.

Backend-ul PROD existent este Supabase `intentra-comunitate-prod`, project ref `jvtpmsabjjrvfuwnsckd`, API origin `https://jvtpmsabjjrvfuwnsckd.supabase.co`. Projectul DEV `wnmtrkheznrhrtpbenxh` este separat și runtime-ul de producție îl respinge.

## Valori necesare pentru build-ul public

- `VITE_COMMUNITY_MODE=production` — obligatoriu în build-ul public.
- `VITE_COMMUNITY_PRODUCTION_PROJECT_REF=jvtpmsabjjrvfuwnsckd`.
- `VITE_SUPABASE_URL=https://jvtpmsabjjrvfuwnsckd.supabase.co`.
- `VITE_SUPABASE_ANON_KEY` — numai cheie publică publishable/anon a PROD; niciodată `service_role` sau `sb_secret_`.
- `VITE_TURNSTILE_SITE_KEY` — cheie publică Turnstile autorizată pentru hostname-ul `intentra.ch`.
- `COMMUNITY_RELEASE_APPROVED=yes` — se setează numai în workflow-ul de release după PASS la gate-uri.
- Secretul Turnstile rămâne server-side în configurarea Edge Function; nu se pune în nicio variabilă `VITE_`.

Aceste valori nu sunt încă verificate într-un build public. Configurarea preview Vercel este doar pentru DEV și nu trebuie folosită drept configurație PROD.

## Build și publicare

De la rădăcina repository-ului, după `npm ci` în `comunitate/` și după testele de release:

```bash
node comunitate/scripts/assemble-site.mjs --production
```

Scriptul respinge configurația greșită, lipsa documentelor aprobate `comunitate/public/privacy.html` și `rules.html`, sau lipsa aprobării explicite de release. Creează `site-release/index.html` și `site-release/comunitate/index.html`; nu face deployment.

Build-ul credential-free de staging este:

```bash
node comunitate/scripts/assemble-site.mjs
```

Workflow-ul `.github/workflows/community-staging.yml` produce un artifact de verificare. Nu publică pe GitHub Pages. În repository nu există încă workflow automat de release PROD; publicarea se face numai după validarea bundle-ului și aprobarea gate-urilor.

## Gate înainte de deployment

1. Confirma configurarea OTP/SMTP, redirect-urile Auth, limitele și Turnstile pentru domeniul exact `https://intentra.ch`; rulează testele fără ocolirea protecțiilor.
2. Rulează în PROD fluxurile autorizate pentru autentificare, RLS cu doi utilizatori, anunț, fotografie, comentariu, raportare, export și ștergere, fără a importa conținut din DEV.
3. Obține și publică versiunile aprobate RO/DE/EN ale regulilor și informării de confidențialitate, cu operator, contact, furnizori/transferuri, retenție și proceduri completate.
4. Demonstrează MFA administrator, backup/restore, protecție imagini, moderare/abuz și rollback.
5. Construiește, inspectează și testează artifactul de producție cu proiectul PROD și Turnstile; apoi publică numai fișierele din `site-release/` pe GitHub Pages.
6. Verifică direct `https://intentra.ch/comunitate/` după publicare. Adaugă ruta în sitemap numai după PASS.

Nu publica codul Vite sursă direct în GitHub Pages root și nu publica chei DEV, sesiuni sau conturi de test.
