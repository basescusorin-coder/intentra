# INTENTRA Comunitate — verificare operațională și opțiune pentru operator

**Data:** 25 noiembrie 2026  
**Stare:** notă internă pentru proprietar; nu este opinie juridică și nu aprobă lansarea.

## SMTP — verificare fără rotirea parolei

- În Supabase Auth PROD este activ SMTP personalizat. Formularul afișează expeditorul și utilizatorul SMTP ca `contact@intentra.ch`, host `mail.infomaniak.com`, port `587`; parola este păstrată și mascată. Captura de stare arată „Save changes” dezactivat. Nu s-au salvat schimbări și parola nu a fost citită, expusă sau regenerată.
- Infomaniak Manager listează un singur mailbox, `contact@intentra.ch`, asociat utilizatorului proprietar.
- Jurnalele Supabase Auth au șase evenimente HTTP 500 / `unexpected_failure` cu mesajul de autentificare „invalid login or password”; intervalul observat: 24.11.2026 14:49:20–21:18:02 UTC. Nu există confirmare de livrare OTP.
- Valorile neparolă verificate coincid cu setările oficiale Infomaniak. Ghidul Infomaniak cere numele complet al mailboxului, parola generată pentru acea adresă, `mail.infomaniak.com`, port 587 cu STARTTLS și autentificare SMTP. Eroarea 535 dovedește refuzul autentificării SMTP, însă jurnalele nu disting între parola/dispozitivul SMTP, asocierea drepturilor dispozitivului și o eroare tranzitorie de autentificare a furnizorului.
- Paginile individuale de dispozitive/securitate din Manager și conținutul Mail web nu s-au încărcat în sesiunea de verificare. Nu s-a putut confirma existența dispozitivului `INTENTRA-SMTP-PROD`, asocierea lui la mailbox/utilizator, dreptul de trimitere SMTP sau starea sa activă. Acesta este testul rămas în Infomaniak; nu genera o parolă nouă înainte de verificarea înregistrării existente.

Surse Infomaniak:
- [Porturi și protocoale](https://www.infomaniak.com/en/support/faq/468/understanding-mail-server-ports-and-protocols)
- [Depanarea erorii 535](https://www.infomaniak.com/en/support/faq/2218/troubleshooting-email-issues-softwareemail-client)
- [Administrarea parolelor de dispozitiv](https://www.infomaniak.com/en/support/faq/1321/add-a-device-create-a-mail-password-from-the-mail-service)

## Cod, CI, PROD și publicare

- PR #10 este încă Draft; `main` rămâne la `8127bd22cb1fe8f12ab12318d97209936d32f04f`; ramura PR verificată la `226f2a4d1caa002c45b47301ca03c57a0e7dcd8d`.
- Pentru acest head au trecut workflow-urile GitHub: Community DEV checks, staging package și Jobs DEV tests. Community checks au inclus teste aplicație/configurație, RLS WASM, type-check și teste Edge, build Vite și asamblarea pachetului. Artifactul staging `intentra-community-staging-site` a fost încărcat de CI (1,183,735 bytes; SHA-256 `d1eda1a3b413725413502315345877f378424f380c56d2595ca46a42531252a7`); acesta nu a fost publicat.
- Supabase PROD este `ACTIVE_HEALTHY`, are 14 migrări, nouă tabele Comunitate cu RLS și trei Edge Functions ACTIVE v3 cu `verify_jwt=true`. Tabelele utilizatorilor, profilurilor, anunțurilor, comentariilor, rapoartelor și imaginilor nu conțin date de utilizator.
- Auditorul de securitate nu raportează probleme majore. Cele trei avertismente INFO pentru tabele interne fără politici corespund unor tabele fără granturi `anon`/`authenticated` (deny-by-default). Advisor-ul de performanță semnalează șase indexuri nefolosite (baza fără volum de utilizatori, deci neconcludent) și trei grupuri de politici RLS SELECT permisive multiple. Nu s-au șters indexuri și nu s-au consolidat politici fără un test de echivalență a permisiunilor.
- Ultima verificare publică din 25.11 a găsit pagina `/comunitate/` în starea „Pregătim lansarea publică”; nu există flux OTP public. CI/build nu reprezintă test E2E PROD.
- Nu s-a făcut merge, deploy public, migrare nouă sau copiere de date DEV în PROD.

## Operator — opțiune fără domiciliul personal și fără taxă nouă

Legea federală elvețiană privind protecția datelor cere informarea persoanei despre identitatea și datele de contact ale operatorului (DSG/FADP art. 19). SECO arată, pentru ofertele online de bunuri/servicii care intră sub art. 3 alin. 1 lit. s UWG, obligația de a indica identitatea și o adresă de contact, inclusiv e-mail; aplicabilitatea exactă la un panou comunitar gratuit trebuie confirmată juridic înainte de lansare.

O variantă de verificat este un **c/o pentru corespondență**, oferit gratuit de o persoană de încredere, cu acord scris al titularului și cu acceptarea reală a corespondenței legale și a cererilor utilizatorilor. Pentru o entitate înscrisă în registrul comerțului, HRegV art. 117 recunoaște o adresă c/o ca domiciliu juridic, cu declarația titularului adresei. Aceasta nu transformă automat orice adresă informală într-un domiciliu comercial valid și nu garantează că operatorul poate rămâne anonim: identitatea juridică trebuie declarată.

SECO precizează că o întreprindere individuală nu cere capital minim; înscrierea în registrul comerțului devine obligatorie când activitatea are formă comercială și venitul anual depășește CHF 100'000, iar denumirea include numele proprietarului. Forma implică răspundere personală nelimitată și pot exista obligații AHV/fiscale. Aceste condiții trebuie verificate în raport cu activitatea efectivă INTENTRA; nu se afirmă că înregistrarea sau operarea sunt automat gratuite.

Surse oficiale:
- [DSG/FADP, art. 19](https://www.fedlex.admin.ch/eli/cc/2022/491/en)
- [SECO — comerț online și UWG](https://www.seco.admin.ch/de/onlinehandel)
- [HRegV, art. 117 — c/o](https://www.fedlex.admin.ch/eli/cc/2007/686/de)
- [SECO — întreprindere individuală](https://www.kmu.admin.ch/en/legal-form-sole-proprietorships)

**Decizie necesară proprietarului înainte de publicarea documentelor finale:** există o adresă c/o non-rezidențială disponibilă gratuit, cu acord scris și primirea corespondenței? Proprietarul acceptă publicarea identității legale necesare? Până la completarea acestor elemente, documentele RO/DE/EN rămân proiecte și nu se colectează date reale pe Comunitatea publică. Domiciliul și telefonul personal nu sunt incluse în această notă.
