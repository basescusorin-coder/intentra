# INTENTRA Comunitate — implementare și pregătire MVP

**Stare la 13.11.2026:** codul aplicației și migrațiile sunt pregătite pentru testare locală. Nu există proiect Supabase conectat, cont de e-mail/CAPTCHA configurat sau publicare. Nu s-au folosit date reale. Aceasta nu este o aprobare juridică ori o declarație de securitate certificată.

## Ce există în repo

- `index.html`, `src/`, `vite.config.js`: aplicație Vite separată, mobile-first, tradusă RO/DE/EN. Pagina publică folosește proiecțiile feed/profil/comment fără e-mail, telefon sau UUID de autentificare. Căutarea existentă de la rădăcina site-ului nu a fost modificată.
- Supabase Auth: OTP e-mail, sesiune fără parolă, TOTP MFA pentru moderator și gate de moderare care cere AAL2.
- PostgreSQL: profil privat, feed public limitat, anunțuri/comentarii/rapoarte, export personal, ștergere, audit moderare, rate-limit per utilizator, Joburi blocate prin trigger și API/UI.
- Edge Functions: validarea și re-encodarea fotografiilor (JPEG/PNG/WebP, limite de dimensiune/dimensiuni, EXIF eliminat), ștergere postare și ștergere cont. Bucket privat cu acces condiționat de starea anunțului; upload direct din browser este revocat.
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

`test:rls:wasm` execută schema și cele două migrații într-un PostgreSQL WASM (PGlite), inclusiv reaplicarea migrațiilor și aserțiuni RLS/MFA. Harnessul simulează câteva interfețe Supabase (`auth`, roluri și storage); prin urmare **nu** înlocuiește `supabase test db`, un proiect Supabase real sau testarea Auth/Storage end-to-end. `test:edge` verifică tipurile funcțiilor cu Deno. Nu sunt incluse teste reale de livrare OTP, Turnstile sau upload la furnizor.

## Infrastructură gratuită — limite și condiții

- Supabase Free: $0/lună; 50.000 MAU, 500 MB bază, 1 GB storage, 5 GB egress și maximum două proiecte active. Proiectele cu activitate redusă pot fi puse pe pauză după 7 zile. Nu include backup-uri automate descărcabile; operatorul trebuie să exporte regulat și să păstreze copii separat. Limitele se pot schimba. [Prețuri](https://supabase.com/pricing) · [pauză](https://supabase.com/docs/guides/platform/free-project-pausing) · [backup](https://supabase.com/docs/guides/platform/backups)
- Cloudflare Turnstile Free: $0, până la 20 widget-uri, provocări nelimitate și până la 10 hostnames/widget. Nu a fost creat/configurat widget. [Limite](https://developers.cloudflare.com/turnstile/plans/)
- Resend Free: $0, până la 3.000 e-mailuri/lună și 100/zi, în limitele/condițiile curente ale furnizorului. Nu există cont, chei sau domeniu expeditor configurate. [Prețuri](https://resend.com/pricing)
- SMTP-ul implicit Supabase este pentru testare: livrează doar către adrese autorizate ale organizației și are limită curentă de 2 e-mailuri/oră. OTP către membri reali cere un furnizor SMTP propriu și configurarea domeniului expeditor (DNS). [Documentație SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Estimarea recurentă pentru componentele menționate este **0 CHF/lună** dacă rămân în planurile gratuite. Taxele, depășirile, domeniul deja existent, timpul de moderare și consultanța juridică nu sunt incluse. Free nu înseamnă disponibilitate garantată, backup gestionat sau potrivire contractuală pentru date personale.

## Pași de configurare (proprietar)

1. Decideți dacă doriți un proiect Supabase separat pentru dezvoltare; verificați regiunea, DPA/subprocesatorii, transferurile și setările de facturare astfel încât să rămână pe Free. Nu importați date reale.
2. Configurați SMTP gratuit ales, domeniul și DNS expeditor (SPF/DKIM/DMARC), apoi setările de OTP: confirmare e-mail obligatorie, 6 cifre, expirare 10 minute, rate limits. Nu folosiți SMTP-ul implicit pentru înscrieri externe.
3. Creați Turnstile widget pentru hostname-urile de test și puneți site key în build local și secret key în Edge Function secrets. Cheile nu se trimit prin conversație/GitHub.
4. Rulați `supabase start` și `supabase test db` într-un mediu local cu CLI/Docker, apoi aplicați în proiect de dezvoltare numai după backup și revizuirea migrațiilor. Migrațiile CLI sunt numerotate în `supabase/migrations`.
5. Înrolați MFA TOTP pentru contul administrator, apoi acordați rolul prin procedura sigură de administrare. Moderatorul nu trebuie activat înainte de verificarea AAL2 în Supabase real.
6. Completați `SUPABASE_URL`, cheia anon publică și cheia publică Turnstile doar în `.env.local` ignorat de Git. Păstrați secretele Edge în secret managerul Supabase.
7. Efectuați testare de browser cu conturi sintetice, exercițiu de backup/restaurare și revizie juridică înainte de orice pilot.

Nu s-au creat conturi, proiecte, DNS sau secrete în această etapă. Niciun serviciu extern nu a fost pornit.

## Riscuri și goluri înainte de pilot

- Funcțiile Supabase Auth, SMTP, CAPTCHA, Storage și delete nu au fost testate end-to-end împotriva unui proiect furnizor.
- Rate limit-urile aplicației sunt per cont în baza de date; nu există limiter distribuit suplimentar pe IP pentru funcțiile de postare/comentariu. Auth are propriile limite. CAPTCHA este opțional până la configurarea widget-ului.
- Politica de retenție, răspunsul operațional la rapoarte, apelurile la moderare, alertarea, rotația secretelor și accesul la backup trebuie stabilite de operator.
- Planul gratuit Supabase nu furnizează backup automat descărcabil; exportul și restaurarea trebuie efectuate și demonstrate de proprietar. Procedura propusă: `OPERATIONS.md`.
- Nu au fost verificate transferuri internaționale, DPA-urile sau regiunea aleasă; trebuie analizate pentru Supabase, SMTP și CAPTCHA.
- Înainte de lansare trebuie clarificate operatorul juridic și datele de contact, aplicabilitatea GDPR, DSG/FADP, obligațiile vânzătorilor, conținutul ilegal, moderarea și AVG/AVV. Categoria Joburi este blocată până la clarificarea AVG/AVV.

## Documente de revizuit

`PRIVACY-AND-RULES-DRAFT.md`, `SECURITY-LEGAL-MVP.md` și `OPERATIONS.md` sunt proiecte tehnice/juridice pentru revizie, nu documente aprobate sau consultanță juridică.

## Surse pentru limitele gratuite

Verificate la 13.11.2026: [Supabase pricing](https://supabase.com/pricing), [Supabase pauză](https://supabase.com/docs/guides/platform/free-project-pausing), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Cloudflare Turnstile plans](https://developers.cloudflare.com/turnstile/plans/), [Resend pricing](https://resend.com/pricing).
