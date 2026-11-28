# INTENTRA Comunitate — stare PROD

**Verificat:** 28 noiembrie 2026.  
**Commit candidat verificat:** `9c799bcac407ef03f8378701c2bd7e4c31036fd7` (acest update sincronizează documentația, fără schimbări de aplicație).
**Stare publică:** pagina principală existentă răspunde; `/comunitate/` încă afișează pagina de pregătire.

## Operațiuni efectuate în această sesiune

- Documente Privacy, Rules și Terms RO/DE/EN actualizate; pagina separată de termeni adăugată; contactul public este contact@intentra.ch, fără domiciliu sau telefon personal.
- Joburi păstrat activ ca director de căutare/redirecționare către portaluri originale; fără candidaturi, CV-uri sau matching intern.
- Patru variabile repository Actions de producție au fost create și reverificate în UI; includ project ref, URL și chei publice Supabase/Turnstile. Niciun secret de server nu este inclus.
- PR #10 conține commitul candidat. CI pe exact SHA a trecut: Jobs DEV tests, Community DEV checks (inclusiv Edge checks), Community staging package (inclusiv Chromium 320/390/mobile și desktop) și JS checks.
- Local pe SHA: `npm ci`, `npm test` (29/29), `npm run test:jobs` (9/9), `npm run test:rls:wasm` (1/1), `npm run build` și asamblarea explicită `--production` au trecut. Pachetul a fost generat local fără deployment.
- MASTER BACKUP conține istoric Git, sursa candidatului, sursa publică anterioară, catalogul PROD și tipurile DB, configurația fără secrete și instrucțiuni rollback/restore. Tarballul de 7,445,930 bytes are SHA-256 `ba8d6a48482aa66acc009a965066521fe91881ce291a5cc7bbd3f3653fcda7dd`; manifestul intern a fost verificat. Clonarea izolată la SHA candidat, `npm ci` și testul RLS WASM au trecut. Nu conține rânduri personale sau secrete; nu este dump de date Supabase.

## Dovezi server-side și protecții

- Supabase PROD `jvtpmsabjjrvfuwnsckd` este ACTIVE_HEALTHY, 14 migrări, 9 tabele publice cu RLS și trei Edge Functions ACTIVE v3 cu `verify_jwt=true`.
- Ultimul auth log vizibil pentru OTP este SMTP `535`/HTTP 500 din 24 noiembrie; în intervalele consultate 25–28 noiembrie nu au fost evenimente OTP. Logurile consultate nu demonstrează livrarea OTP, Turnstile pe hostname-ul public, MFA/AAL2 sau fluxul CRUD complet. Confirmarea anterioară a proprietarului este reținută, dar nu a putut fi asociată cu o dovadă server-side nouă în această sesiune. Nu s-au creat date sintetice și nu s-a schimbat PROD.
- Security Advisor are trei constatări INFO `rls_enabled_no_policy` pentru tabele interne fără granturi publice relevante; niciun grant/policy nu a fost relaxat.
- Cloudflare dashboard necesită autentificare suplimentară; hostname-urile validate anterior nu au putut fi reexaminate din UI în această sesiune.

## Blocaje reale rămase înainte de publicare

1. Lipsesc dovezi server-side accesibile pentru OTP reușit, Turnstile public, MFA/TOTP+AAL2 și traseul controlat PROD cu ștergere verificată. OTP nu a fost retrimis și nu s-au făcut scrieri în PROD.
2. Auditul juridic identifică o întrebare deschisă privind adresa de corespondență: FADP art. 19 permite identificarea/contactul prin date de contact, dar UWG art. 3(1)(s) și ghidul SECO pentru e-commerce pot cere adresă de contact completă. Nu există o adresă publicabilă verificată, iar domiciliul nu va fi expus.
3. PR #10 rămâne deschis până la rezolvarea porților; Pages este încă configurat pe branch/root. Schimbarea la GitHub Actions și workflow-ul producție nu au fost declanșate pentru a evita o publicare fără aceste porți.

**Verdict:** no-go pentru publicarea publică în această stare. Acest lucru descrie lipsa dovezilor/deciziei de adresă, nu un eșec al testelor automatizate sau al Joburi.
