# INTENTRA Comunitate — gate de lansare pentru /comunitate/

Status la 2026-11-20: **NO-GO pentru publicare PROD**.

## Arhitectură și schimbări confirmate

- Site-ul public `intentra.ch` este GitHub Pages din branch `main`; aplicația Comunitate este sursă Vite sub `comunitate/`.
- `node comunitate/scripts/assemble-site.mjs` creează local pachetul complet în `site-release/`, cu homepage și `/comunitate/`; nu publică.
- Supabase PROD `jvtpmsabjjrvfuwnsckd` are schema instalată și a primit migrația de hardening RPC din 2026-11-20. Nu s-au copiat date DEV.
- Branch `feature/comunitate-mvp` conține corecția selectorului de limbă accesibil și unic, traducerile UI, query-uri de căutare păstrate în fallback-uri portal și testele asociate.
- Ultimul artifact Vercel este preview, nu deployment public; `READY` singur nu validează produsul sau backend-ul PROD.

## PASS locale/CI observate

- Testele unitare ale paginii principale și Comunității trec local; testele RLS prin PGlite trec local.
- Build-ul Vite și asamblarea pachetului de staging au trecut; pachetul nu a fost publicat.
- Pagina principală a fost testată în RO/DE/EN și pentru căutările pe 6 categorii; selector unic. Comunitatea schimbă traducerile RO/DE/EN și categoriile.
- Testul desktop/mobile GitHub Actions trebuie să treacă și pe commitul curent înainte ca remedierea overflow-ului să fie considerată verificată.
- Testele Deno/Edge Functions nu au rulat local: accesul la registry npm a fost refuzat în runner-ul curent. Rezultatul este BLOCKED, nu PASS.

## Gate-uri rămase obligatorii

1. Validare end-to-end OTP/SMTP și redirect-uri în PROD; flux test în DEV numai cu adresă de test autorizată, fără a repeta OTP-uri neaprobate.
2. Validare Turnstile end-to-end pentru origin-ul public exact și verificarea secretului server-side; fără dezactivarea protecției.
3. E2E funcțional pentru publicare, fotografie (încărcare/afișare/ștergere), comentarii și ștergerea înregistrării de test; verificarea RLS între utilizatori, export/ștergere cont și moderarea MFA.
4. Confirmarea Auth/OTP, CORS exact `https://intentra.ch`, variabilele client-side PROD și separarea cheii anonime de secretele server-side.
5. Backup/restore testat și procedură de rollback.
6. Publicarea paginilor legale aprobate RO/DE/EN. Lipsesc identitatea operatorului, contactul public, termenele de retenție, inventarul furnizorilor/transferurilor și procedurile aprobate; proiectul actual nu poate fi folosit ca informare finală.
7. Build PROD cu configurația distinctă jvtpmsabjjrvfuwnsckd; verificarea bundle-ului și testarea rutei publice după deployment.
8. Integrarea pe `main` și publicarea `/comunitate/` numai după PASS la toate gate-urile esențiale și confirmarea că nu există costuri noi.

## Date și rollback

Nu copia membri, sesiuni OTP, anunțuri, fotografii sau comentarii din DEV în PROD. Folosește exclusiv date temporare create pentru un test explicit și curăță doar înregistrările identificate de test după verificarea rezultatului. Dacă ruta publică nu trece verificările, retrage/hidește ruta Comunității din site și revino la artifactul GitHub Pages anterior; păstrează backend-ul și analizează schema înainte de orice rollback DB.
