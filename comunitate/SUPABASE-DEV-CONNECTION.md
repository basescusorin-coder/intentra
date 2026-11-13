# Conectare sigură la Supabase DEV

Acest ghid este pentru testare locală în proiectul `wnmtrkheznrhrtpbenxh`. Nu activează înscrieri publice, nu publică funcții Edge și nu conectează site-ul public.

## Separarea acreditărilor

Sunt două seturi diferite de valori:

1. **Client web local** — URL-ul proiectului DEV, cheia `anon`/`publishable` și cheia publică Turnstile. Acestea sunt valori vizibile clientului și pot fi puse numai în `comunitate/.env.local`, fișier ignorat de Git. Nu pune aici chei `service_role`, `sb_secret_*`, parole DB sau PAT-uri.
2. **Management API / Supabase CLI** — `SUPABASE_ACCESS_TOKEN` este un secret administrativ, separat complet de variabilele `VITE_*`. Nu se pune în `.env.local`, cod, GitHub Actions sau bundle-ul web.

## Configurarea clientului local

1. Proprietarul obține din dashboard-ul proiectului DEV URL-ul și cheia publică `anon`/`publishable`; nu folosește cheia `service_role`.
2. În `comunitate/`, creează local `.env.local` pornind de la `.env.example` și completează valorile pentru URL, cheie publică și Turnstile Site Key.
3. Pornește numai serverul local Vite pe `http://127.0.0.1:5173` sau `http://localhost:5173`.
4. Clientul se conectează doar dacă originea este una dintre cele două adrese locale și URL-ul este exact `https://wnmtrkheznrhrtpbenxh.supabase.co`. Preview-ul GitHub Pages și `intentra.ch` rămân în mod demonstrativ, chiar dacă cineva construiește accidental cu variabilele DEV.
5. Șterge `.env.local` după testare. Verifică înainte de commit că `git status` nu listează acest fișier.

Cheia publică web va fi vizibilă în browser și nu este un secret. Siguranța datelor depinde de RLS și de funcțiile server-side. Înainte de autentificare, proprietarul trebuie să confirme că OTP, confirmarea e-mailului și CAPTCHA sunt setate pentru proiectul DEV. Lipsa unui furnizor SMTP/Turnstile funcțional înseamnă că testul extern se oprește; nu se ocolește verificarea CAPTCHA.

## Accesul CLI read-only

Work-ul curent nu expune un manager de secrete sau o metodă de injectare sigură a variabilelor în executor. Nu există `SUPABASE_ACCESS_TOKEN` în mediu, iar autentificarea CLI read-only a eșuat cu `AccessTokenRequiredError`.

Până când Work oferă o integrare autorizată pentru secrete, proprietarul poate rula inspecțiile dintr-un terminal propriu, de încredere, conectat la un keyring sau manager de secrete. Tokenul trebuie creat în Supabase cu domeniul limitat la proiectul DEV și numai permisiuni **Read** necesare pentru Project Settings, Database, Migrations, Auth Config, Edge Functions și Storage. Nu acorda acces de scriere, API Key Secrets sau acces general la organizație pentru inspecția inițială. Expune tokenul procesului CLI numai prin managerul local de secrete ca `SUPABASE_ACCESS_TOKEN`; nu îl introduce în comandă, chat, GitHub, fișier `.env*` sau log.

Supabase CLI poate citi `SUPABASE_ACCESS_TOKEN` din mediul procesului. Nu utiliza fluxul `supabase login` dacă stocarea nativă nu este confirmată: documentația CLI menționează fallback la un fișier text când keyring-ul nu este disponibil.

Un test de deployment sau migrare ar necesita o autorizare separată, explicită și temporară, cu drepturi de scriere strict necesare. Acest ghid nu o acordă și nu autorizează deploy.
