# INTENTRA Comunitate — stare PROD (2026-11-28)

## Verdict verificat

**NO-GO pentru publicarea Comunității.** Din browser extern, https://intentra.ch/ se încarcă, iar https://intentra.ch/comunitate/ afișează încă pagina de pregătire; aceasta nu permite înscrierea sau publicarea. PR #10 rămâne Draft, deschis și nemerged. Vercel Preview/READY nu este deploymentul public.

## Infrastructură PROD — verificare read-only

- Supabase PROD `jvtpmsabjjrvfuwnsckd`: `ACTIVE_HEALTHY`, regiunea `eu-west-1`.
- 14 migrări instalate; nouă tabele publice au RLS activ.
- Funcțiile `community-image-upload`, `delete-community-post` și `delete-community-account` sunt ACTIVE v3 cu `verify_jwt=true`.
- Security Advisor a returnat trei INFO `rls_enabled_no_policy` pentru `community_admins`, `community_rate_limits` și `community_settings`. Nu s-au schimbat granturi sau politici în această verificare.
- Nicio copie DEV→PROD, migrare nouă ori modificare de date PROD nu a fost executată.

## Porți PROD încă nevalidate

- SMTP/OTP: interogările logurilor pentru 27 și 28 noiembrie nu au găsit evenimente OTP/535; aceasta nu demonstrează livrarea. Nu a fost observată autentificare reușită în această sesiune.
- Turnstile pe hostname-ul public, înrolarea TOTP a moderatorului și verificarea AAL2 în PROD nu au o dovadă nouă.
- Fluxul PROD al unui utilizator: profil, anunț, editare, fotografie, comentariu, raportare/moderare, interdicție între utilizatori, export, ștergere cont și curățarea datelor sintetice nu a fost executat.
- Supabase advisor și SQL au confirmat structura/protecțiile, dar nu înlocuiesc acceptanța cap-coadă.

## Cod, Jobs și verificări

- Codul de Jobs oferă căutare de criterii și redirecționare către portaluri originale. INTENTRA nu recrutează, nu selectează candidați, nu colectează CV-uri și nu intermediază candidaturi/contracte. Job-uri UGC interne și CV-uri nu sunt disponibile.
- Documentele RO/DE/EN au fost actualizate în branch-ul PR: identificare operator Sorin Băsescu, contact contact@intentra.ch, reguli de Jobs pentru surse externe și informare privacy fără eroarea SMTP istorică.
- Workflow-urile CI rulează la fiecare commit al branch-ului. Pentru autorizarea release-ului trebuie folosite rezultatele de pe SHA-ul exact curent din PR #10: aplicație, Jobs, RLS WASM, Edge checks, build, asamblare staging și layout Chromium. Artifactul staging nu se publică.
- Pagina legală indică criterii de păstrare; configurațiile/termenele exacte ale furnizorilor rămân de verificat înainte de a colecta date de la utilizatori.

## Backup și publicare

- Un MASTER BACKUP restaurabil nu este confirmat. Artifactele staging anterioare nu includ singure baza de date/permisiunile și un restore izolat demonstrat.
- Settings Pages și variabilele Actions nu au fost citite/modificate prin instrumentele expuse în această sesiune. Workflow-ul oficial nu a fost declanșat.
- Pagina publică principală rămâne neatinsă; DNS nu a fost modificat.

**Decizie:** păstrează PR Draft și nu declara lansarea până când porțile PROD, backup/restore și verificările de release au dovezi pe exact SHA-ul aprobat.