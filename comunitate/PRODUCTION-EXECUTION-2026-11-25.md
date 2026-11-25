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

## Operator — alternative juridice (pentru decizia proprietarului)

Legea federală elvețiană privind protecția datelor cere comunicarea identității și datelor de contact ale operatorului. Pentru ofertele online de bunuri/servicii care intră sub art. 3 alin. 1 lit. s UWG, SECO cere identitate și adresă de contact, inclusiv e-mail. Aplicabilitatea UWG la funcțiile concrete ale unei comunități gratuite trebuie confirmată juridic înainte de lansare.

| Variantă | Cost nou | Adresă personală publică? | Potrivire pentru INTENTRA |
|---|---:|---|---|
| **Adresă c/o oferită gratuit de o persoană de încredere** | Posibil zero, numai dacă titularul o oferă fără cost | Poate evita afișarea domiciliului, dacă este acceptată ca adresă de corespondență și primește efectiv comunicările | Cea mai apropiată de constrângerile proprietarului; necesită acord scris și confirmarea autorității competente dacă se folosește drept domiciliu comercial. Pentru o entitate înregistrată, HRegV art. 117 cere declarația titularului când adresa c/o este domiciliul juridic. |
| **Operator persoană fizică / întreprindere individuală** | Fără capital minim; unele înregistrări/obligații pot costa | Numele legal nu poate fi ascuns; adresa de corespondență trebuie stabilită separat. Nu înscrie domiciliul personal ca adresă publică fără decizie | Poate fi cea mai simplă formă dacă activitatea și veniturile permit. Înscrierea devine obligatorie pentru activitate comercială cu venit anual peste CHF 100’000; denumirea firmei în registru include numele proprietarului, iar răspunderea este personală. |
| **Asociație** | Nu cere capital inițial; administrarea are totuși obligații | Asociația tot trebuie să aibă identitate și adresă de contact | Necesită cel puțin două persoane și un scop real neeconomic/de utilitate. Activitatea comercială poate finanța scopul neprofit, dar profitul nu poate fi scopul. Nu este o soluție potrivită dacă INTENTRA este operată ca afacere orientată spre profit; nu o recomand ca simplu paravan. |
| **GmbH** | Nu corespunde cerinței „zero cost”: capital minim CHF 20’000 plus notar și înregistrare | Publică identitatea entității și domiciliul ei; nu garantează anonimatul administratorului | Poate separa răspunderea societății, dar cere capital și costuri de constituire, deci nu este alternativa fără cost solicitată. |

**Evaluare preliminară:** dacă proprietarul dorește să evite un cost nou și să nu publice domiciliul, opțiunea de investigat prima este o adresă c/o gratuită, folosită transparent ca adresă reală de corespondență, împreună cu identitatea legală corectă a operatorului. Aceasta depinde de acordul titularului și de acceptarea adresei pentru forma concretă de operare. Un nume comercial, o adresă de e-mail sau un căsuță poștală singure nu înlocuiesc identitatea operatorului; un c/o nu garantează anonimat și nu înlocuiește verificarea cantonului/registrului.

Surse oficiale:
- [DSG/FADP, art. 19](https://www.fedlex.admin.ch/eli/cc/2022/491/en)
- [FDPIC — obligația de informare](https://www.edoeb.admin.ch/en/duty-to-provide-information)
- [SECO — comerț online și UWG](https://www.seco.admin.ch/de/onlinehandel)
- [HRegV, art. 117 — adresă c/o](https://www.fedlex.admin.ch/eli/cc/2007/686/de)
- [SECO — întreprindere individuală](https://www.kmu.admin.ch/en/legal-form-sole-proprietorships)
- [SECO — asociații și scop neeconomic](https://www.kmu.admin.ch/en/associations-another-type-of-business-structure)
- [SECO — costurile și capitalul unei GmbH](https://www.kmu.admin.ch/en/legal-form-limited-liability-company)

**Decizie necesară proprietarului înainte de publicarea documentelor finale:** există o adresă c/o non-rezidențială disponibilă gratuit, cu acord scris și primirea corespondenței? Proprietarul acceptă publicarea identității legale necesare? Până la completarea acestor elemente, documentele RO/DE/EN rămân proiecte și nu se colectează date reale pe Comunitatea publică. Domiciliul și telefonul personal nu sunt incluse în această notă.
