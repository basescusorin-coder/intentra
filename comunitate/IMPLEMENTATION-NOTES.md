# INTENTRA Comunitate — implementare și pregătire MVP

**Stare la 13.11.2026:** cele trei migrații Supabase sunt aplicate și înregistrate în proiectul de dezvoltare `intentra-comunitate-dev` din West EU (Irlanda), PostgreSQL 17.11. Testele RLS/MFA cu utilizatori sintetici au trecut direct în baza găzduită și în PGlite. Auth OTP este configurat pentru confirmare e-mail, cod de 6 cifre și expirare de 10 minute; MFA TOTP este activ. Nu există utilizatori reali, SMTP personalizat, widget Turnstile sau funcții Edge deployate. Site-ul nu a fost publicat. Aceasta nu este o aprobare juridică ori o declarație de securitate certificată. Dashboardul Supabase afișează eticheta ramurii `main PRODUCTION`; verificați izolarea proiectului înainte de orice colectare de date.

**Verificare Etapa 5:** proprietarul a indicat explicit proiectul DEV `wnmtrkheznrhrtpbenxh`; nu există integrare GitHub/deploy automat în proiect. Istoricul de migrații este în ordine, `job_publication_enabled=false`, iar toate cele 9 tabele comunitare verificate au RLS activ. Auth arată OTP cu 6 cifre/600 secunde și TOTP activ; nu există utilizatori în proiect. Supabase CLI 3.1.0 poate fi rulat prin `npx`, dar comenzile Management API se opresc cu `AccessTokenRequiredError`: nu există PAT disponibil în mediul securizat. Nu creați token în cod, GitHub sau conversație. Edge Functions rămân nepublicate și nu au fost testate prin HTTP. Fără cheia publică Turnstile, aplicația nu se configurează în client; fără SMTP particular, OTP nu poate fi folosit pentru membri externi.

## Ce există în repo

- `index.html`, `src/`, `vite.config.js`: aplicație Vite separată, mobile-first, tradusă RO/DE/EN. Pagina publică folosește proiecțiile feed/profil/comment fără e-mail, telefon sau UUID de autentificare. Căutarea existentă de la rădăcina site-ului nu a fost modificată.
- Supabase Auth: OTP e-mail, sesiune fără parolă, TOTP MFA pentru moderator și gate de moderare care cere AAL2.
- PostgreSQL: profil privat, feed public limitat, anunțuri/comentarii/rapoarte, export personal, ștergere, audit moderare, rate-limit per utilizator, Joburi blocate prin trigger și API/UI.
- Cod sursă Edge Functions (nepublicat): validarea și re-encodarea fotografiilor (JPEG/PNG/WebP, limite de dimensiune/dimensiuni, EXIF eliminat), ștergere postare și ștergere cont. Bucket privat cu acces condiționat de starea anunțului; upload direct din browser este revocat.
- `.env.example` conține doar nume de variabile și chei client publice. Service-role, SMTP și secretul Turnstile trebuie să rămână în secret managerul furnizorului/mediului de dezvoltare.
- `preview-stage1.html` păstrează prototipul static anterior; migrarea din `db/migrations` este păstrată, iar istoricul aplicabil Supabase este în `supabase/migrations`.

## Comenzi locale

```sh
cd comunitate
npm ci
npm test
npm run test:rls:wasm
npm run test:edge
npm run build
```

`test:rls:wasm` execută schema și cele două migrații într-un PostgreSQL WASM (PGlite), inclusiv reaplicarea migrațiilor și aserțiuni RLS/MFA. În plus, în proiectul Supabase găzduit au trecut 10 aserțiuni de izolare/RLS și 4 aserțiuni MFA/moderare, folosind exclusiv utilizatori sintetici într-o tranzacție anulată. Harnessul WASM simulează câteva interfețe Supabase (`auth`, roluri și storage); nu înlocuiește `supabase test db` sau testarea fluxurilor HTTP. `test:edge` verifică tipurile funcțiilor cu Deno. Nu au fost livrate OTP-uri, nu s-a testat Turnstile, iar funcțiile Edge și încărcarea fotografiilor nu au fost testate în proiectul găzduit.

## Infrastructură gratuită — limite și condiții

- Supabase Free: $0/lună; 50.000 MAU, 500 MB bază, 1 GB storage, 5 GB egress și maximum două proiecte active. Proiectele cu activitate redusă pot fi puse pe pauză după 7 zile. Nu include backup-uri automate descărcabile; operatorul trebuie să exporte regulat și să păstreze copii separat. Limitele se pot schimba. [Prețuri](https://supabase.com/pricing) · [pauză](https://supabase.com/docs/guides/platform/free-project-pausing) · [backup](https://supabase.com/docs/guides/platform/backups)
- Cloudflare Turnstile Free: $0, până la 20 widget-uri, provocări nelimitate și până la 10 hostnames/widget. Nu a fost creat/configurat widget. [Limite](https://developers.cloudflare.com/turnstile/plans/)
- Resend Free: $0, până la 3.000 e-mailuri/lună și 100/zi, în limitele/condițiile curente ale furnizorului. Nu există cont, chei sau domeniu expeditor configurate. [Prețuri](https://resend.com/pricing)
- SMTP-ul implicit Supabase este pentru testare: livrează doar către adrese autorizate ale organizației și are limită curentă de 2 e-mailuri/oră. OTP către membri reali cere un furnizor SMTP propriu și configurarea domeniului expeditor (DNS). [Documentație SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Estimarea recurentă pentru componentele menționate este **0 CHF/lună** dacă rămân în planurile gratuite. Taxele, depășirile, domeniul deja existent, timpul de moderare și consultanța juridică nu sunt incluse. Free nu înseamnă disponibilitate garantată, backup gestionat sau potrivire contractuală pentru date personale.

## Pași de configurare (proprietar)

1. Proiectul de dezvoltare indicat de proprietar este `wnmtrkheznrhrtpbenxh`; dashboardul îl afișează cu eticheta `main PRODUCTION`, iar integrarea GitHub este deconectată. Nu importați date reale și păstrați neschimbată configurația de deploy.
2. Auth este configurat cu confirmare e-mail obligatorie, OTP de 6 cifre cu expirare 10 minute, iar MFA TOTP este activ. Configurați un SMTP gratuit ales și domeniul/DNS expeditor (SPF/DKIM/DMARC) numai după aprobarea furnizorului și revizuirea condițiilor. Nu folosiți SMTP-ul implicit pentru înscrieri externe.
3. Creați Turnstile widget pentru hostname-urile DEV și puneți site key în build-ul de test și secret key în Edge Function secrets. Cheile nu se trimit prin conversație/GitHub.
4. Pentru deploy versionat, mediul are nevoie de un PAT Supabase introdus direct prin managerul securizat de variabile ca `SUPABASE_ACCESS_TOKEN`; nu îl trimiteți prin conversație. CLI-ul a fost verificat la versiunea 3.1.0. Pentru deploy, folosiți `npx --yes supabase@3.1.0 functions deploy <numele-funcției> --remote=wnmtrkheznrhrtpbenxh --use-api`. Lăsați confirmarea interactivă activă și păstrați verificarea JWT implicită. CLI-ul indică permisiunea `edge_functions_write`; pentru ramura principală poate fi necesară și `branching_production_read` (și, în funcție de verificările proiectului, `projects_read`). `--use-api` evită Docker la bundling.
5. Rulați `supabase start` și `supabase test db` într-un mediu local cu runtime container înaintea următoarei migrații. Migrațiile numerotate în `supabase/migrations` sunt deja aplicate; creați backup înainte de orice schimbare nouă.
6. Înrolați MFA TOTP pentru contul administrator, apoi acordați rolul prin procedura sigură de administrare. Moderatorul nu trebuie activat înainte de verificarea AAL2 în Supabase real.
7. Completați `SUPABASE_URL`, cheia anon publică și cheia publică Turnstile doar în `.env.local` ignorat de Git. Păstrați secretele Edge în secret managerul Supabase.
8. Efectuați testare HTTP de browser cu conturi sintetice, exercițiu de backup/restaurare și revizie juridică înainte de orice pilot.

Nu au fost create conturi externe, DNS sau secrete. Proiectul Supabase Free existent a fost folosit pentru migrații și teste cu utilizatori sintetici; nu a fost pornit niciun serviciu plătit.

## Riscuri și goluri înainte de pilot

- Auth settings au fost inspectate/configurate, însă OTP nu a fost trimis către o adresă reală. Funcțiile Edge, SMTP, CAPTCHA, uploadul Storage și ștergerea contului nu au fost testate end-to-end împotriva API-urilor găzduite.
- Rate limit-urile aplicației sunt per cont în baza de date; nu există limiter distribuit suplimentar pe IP pentru funcțiile de postare/comentariu. Auth are propriile limite. Codul client cere Turnstile pentru a activa aplicația; funcția de upload respinge cererile dacă tokenul/secretul Turnstile lipsesc.
- Politica de retenție, răspunsul operațional la rapoarte, apelurile la moderare, alertarea, rotația secretelor și accesul la backup trebuie stabilite de operator.
- Planul gratuit Supabase nu furnizează backup automat descărcabil; nu era configurat niciun backup înainte de migrare. Exportul și restaurarea trebuie efectuate și demonstrate de proprietar înainte de pilot. Procedura propusă: `OPERATIONS.md`.
- Regiunea proiectului este West EU (Irlanda), dar DPA-urile, subprocessatorii și transferurile internaționale nu au fost verificate juridic pentru Supabase, SMTP și CAPTCHA.
- Înainte de lansare trebuie clarificate operatorul juridic și datele de contact, aplicabilitatea GDPR, DSG/FADP, obligațiile vânzătorilor, conținutul ilegal, moderarea și AVG/AVV. Categoria Joburi este blocată până la clarificarea AVG/AVV.

## Documente de revizuit

`PRIVACY-AND-RULES-DRAFT.md`, `SECURITY-LEGAL-MVP.md` și `OPERATIONS.md` sunt proiecte tehnice/juridice pentru revizie, nu documente aprobate sau consultanță juridică.

## Surse pentru limitele gratuite

Verificate la 13.11.2026: [Supabase pricing](https://supabase.com/pricing), [Supabase pauză](https://supabase.com/docs/guides/platform/free-project-pausing), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Cloudflare Turnstile plans](https://developers.cloudflare.com/turnstile/plans/), [Resend pricing](https://resend.com/pricing).
