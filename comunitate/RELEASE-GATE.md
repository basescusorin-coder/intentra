# INTENTRA Comunitate — gate de lansare pentru /comunitate/

**Actualizat:** 28 noiembrie 2026.  
**Commit candidat:** `022eb628ab8d685fa8c51f9022e12adb92810896`.  
**Stare:** automatizările locale și CI sunt verzi; gate-urile server-side și adresa de corespondență rămân deschise.

## Model Jobs aprobat și implementat

- Pagina Joburi este activă ca instrument gratuit de căutare a surselor, informare și redirecționare către site-uri externe.
- Utilizatorul inspectează oferta originală și aplică direct la angajator/portal.
- INTENTRA nu recrutează, selectează, colectează/transmite CV-uri, negociază contracte, expune candidați angajatorilor sau percepe comisioane. Nu importă integral anunțuri sau baze de date fără drept.
- Funcțiile interne de job ads, profiluri de candidat, candidaturi și transmitere de date rămân dezactivate; această limită nu dezactivează directorul de surse.
- SECO/AVV tratează funcționalitatea reală ca determinantă: platformele care reunesc candidați și angajatori, inclusiv prin conturi și vizibilitatea reciprocă a datelor, pot fi Arbeitsvermittlung. Clasificarea actualului director-only ca în afara funcțiilor de matching este o inferență, nu o decizie SECO. Orice monetizare sau funcție nouă de anunțuri/matching/contact cere o nouă verificare înainte de lansarea acelei funcții.

## Rezultate candidate curente

- `npm ci`: PASS; `npm test`: 29/29; `npm run test:jobs`: 9/9; `npm run test:rls:wasm`: 1/1; `npm run build`: PASS; `node comunitate/scripts/assemble-site.mjs --production`: PASS cu valori publice PROD.
- CI pe exact SHA include succes pentru JS, Jobs, DEV/Edge și staging package; staging layout a rulat în Chromium pe mobil și desktop.
- PROD catalog read-only: 22 relations, 77 coloane publice, 23 politici RLS, 22 trigger-e, 37 rutine, 74 constrângeri, 5 extensii, bucket foto privat; 0 utilizatori/postări/comentarii/rapoarte/imagini la verificarea capturată.
- MASTER BACKUP și restaurarea izolată sunt finalizate și testate pentru cod/schema; fără rânduri utilizator sau secrete.
- Variabilele repository Actions necesare PROD au fost adăugate (ref, URL, anon/public key, Turnstile site key). Pages rămâne branch/root până la închiderea porților.

## Porți încă obligatorii

1. Reconcilierea dovezilor PROD pentru OTP/SMTP, Turnstile pe intentra.ch, TOTP/AAL2 și flux controlat cu izolare între utilizatori, export și ștergere. Logurile consultate arată ultima eroare OTP `535` din 24 noiembrie și nicio verificare OTP în 25–28 noiembrie. Nu s-au inserat date de test în PROD.
2. Decizie documentată privind o adresă de corespondență publicabilă ori concluzie juridică individualizată asupra UWG art. 3(1)(s). Domiciliul personal nu se publică fără consimțământ.
3. Exact SHA aprobat să rămână nemodificat după verificare. Până la îndeplinirea celorlalte porți, PR #10 nu se integrează și workflow-ul Pages de producție nu se declanșează.
4. La finalizarea porților: Pages source GitHub Actions, workflow dispatch numai pe `main` și verificare externă independentă a root-ului existent și `/comunitate/`. DNS rămâne neschimbat.

Detaliile juridice și sursele oficiale sunt în [`docs/legal-audit-2026-11-28.md`](../docs/legal-audit-2026-11-28.md). Procedura de publicare/rollback este în [`docs/release-runbook-2026-11-28.md`](../docs/release-runbook-2026-11-28.md).
