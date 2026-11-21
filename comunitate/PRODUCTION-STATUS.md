# INTENTRA Comunitate — stare PROD (2026-11-20)

## Infrastructură verificată

- Supabase PROD: `intentra-comunitate-prod`, ref `jvtpmsabjjrvfuwnsckd`, `ACTIVE_HEALTHY`, regiunea `eu-west-1` (Ireland).
- PROD are schema Comunității instalată: 9 tabele publice, politici RLS, bucket-ul de fotografii și 3 Edge Functions active cu verificarea JWT activată. Migrațiile instalate sunt în istoricul remote Supabase; istoricul curent conține 12 intrări.
- PROD a fost inițializat fără rânduri de membri, anunțuri, comentarii sau fotografii provenite din DEV. Nicio copie de date DEV nu a fost efectuată.
- La 2026-11-20, hardening-ul RPC pentru PROD a mutat 8 implementări privilegiate în schema `community_private` și a lăsat în `public` numai wrapper-e `SECURITY INVOKER`. Verificarea catalogului a confirmat că acești wrapper-e nu sunt executabili de `anon`, sunt executabili de `authenticated`, iar avertismentul advisor privind funcții `SECURITY DEFINER` accesibile utilizatorilor autentificați a dispărut.
- Advisor mai raportează 3 elemente INFO `rls_enabled_no_policy` pentru tabele interne de setări/administrare/limitare. Accesul acestora este intenționat prin funcții controlate; nu reprezintă o constatare de severitate ridicată.
- Migrația aplicată PROD este păstrată separat, în `supabase/production-migrations/20261120095939_production_rpc_private_hardening.sql`; nu se execută automat în lanțul de migrații DEV.

## Ce nu este încă certificat pentru lansare

- Nu a fost creat un cont real de utilizator în PROD și nu au fost trimise OTP-uri de test; configurarea și livrarea SMTP/OTP, redirect-urile și limitele Auth nu sunt validate end-to-end.
- Nu a fost validată end-to-end asocierea cheii site Turnstile cu hostname-ul de producție și secretul verificat server-side.
- Nu au fost rulate în PROD scenariile de publicare, upload/ștergere fotografie, comentarii, ștergerea contului și verificarea RLS între doi utilizatori. Nu se folosesc date DEV pentru aceste teste.
- Nu există încă bundle-ul public `/comunitate/` configurat și validat pentru proiectul PROD. Preview-ul Vercel este doar mediu de verificare și nu este un deployment public.
- Documentele juridice rămân proiecte neaprobate și conțin câmpuri lipsă pentru operator, contact, termene de păstrare, furnizori/transferuri, proceduri și versiuni RO/DE/EN.
- Backup/restore, MFA pentru administrator și procesul complet de raportare/contestație trebuie demonstrate înainte de lansare.

## Decizie

**NO-GO pentru publicare la 2026-11-20.** Lansarea rămâne condiționată de trecerea verificărilor esențiale PROD și completarea/aprobarea documentelor juridice. Statusul Vercel `READY` nu este criteriu suficient de lansare.
