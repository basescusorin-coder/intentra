# INTENTRA Comunitate — arhitectură și verificări înainte de pilot

**Status:** prototip vizual și migrare SQL pregătită; dezvoltare nepublicată. Nu este conectat la un backend și nu colectează date.

## Arhitectură propusă

- `comunitate/index.html`: aplicație statică separată de căutarea existentă. Oferă în română/germană/engleză navigare, căutare/filtre și exemple marcate fictive. Butoanele de cont/publicare/raportare explică faptul că acțiunile nu trimit date.
- Supabase Auth pentru OTP e-mail, configurat cu expirare, throttling, sender verificat și MFA obligatoriu pentru conturi administrative.
- PostgreSQL cu RLS și pseudonim public separat de e-mail/telefon. `comunitate/db/migrations/20261113_security_and_features.sql` adaugă proiecția profilului public, localitate, tabele de moderare/audit și funcții MFA pentru moderare.
- Fotografii: încărcarea nu este activă. Înainte de implementare: bucket privat, limită de bytes/dimensiuni, allowlist MIME cu verificare magic bytes, decodare și re-encodare pe server, eliminare EXIF, nume aleatoriu, antivirus/conținut și politică de acces pe autor/anunț.
- Joburi: setarea inițială este `false`; funcția de moderare refuză publicarea categoriei `job` până la o activare deliberată după evaluarea AVG/AVV.
- Căutarea curentă rămâne la `/`; Comunitatea este izolată în subdirector și nu modifică scripturile, CSS-ul sau datele produsului actual.

## Configurare necesară, fără secrete în browser sau repository

1. Creează un proiect Supabase de dezvoltare separat, cu regiunea și subprocessatorii validați contractual. Nu reutiliza o bază cu date personale existente.
2. Rulează schema de bază revizuită și apoi migrarea pe o bază locală/de test; confirmă versiunea PostgreSQL, grants și rolurile Supabase. Migrarea din acest branch este draft și nu a fost executată.
3. Activează OTP e-mail, expirare scurtă, limită de încercări, protecție anti-abuz și MFA TOTP pentru administratori; configurează SMTP dedicat și domeniu expeditor verificat.
4. Administrează URL-ul Supabase și cheia `anon` prin build/configurație la runtime. Cheia publică anon nu acordă privilegiile service-role, însă accesul trebuie protejat prin RLS. Secretul service-role și cheile SMTP/CAPTCHA rămân exclusiv în secret manager/funcții server-side.
5. Adaugă server/edge functions pentru rate limiting distribuit, CAPTCHA adaptiv, raportare, acces/export/ștergere cont și upload sigur. Nu activa publicarea client-side directă pentru status, audit sau roluri.
6. Configurează alertare, rotația cheilor, backup criptat, retenție, acces administrativ și restaurare testată. Fără acestea nu porni pilotul.

## Matrice minimă de teste RLS și abuz

Rulați într-un proiect local/de test cu utilizatori sintetici A, B și moderator cu MFA AAL2; nu folosiți conturi reale.

| Caz | Rezultat așteptat |
|---|---|
| Vizitator anonimizat citește anunțuri aprobate și profiluri publice | vede numai conținut aprobat și pseudonim/canton/limbă; nu vede telefon sau e-mail |
| Vizitator citește anunț pending, respins, șters, comentariu pending, rapoarte ori audit | zero rânduri / refuz |
| Utilizator A citește profilul său și propriul conținut pending | permis numai câmpurile sale; nu citește profilul privat ori conținutul pending al lui B |
| Utilizator A încearcă inserare în numele lui B sau cu status publicat | refuz de RLS/check constraint |
| Utilizator A încearcă să actualizeze/șteargă status, rol, audit sau raport | refuz |
| A raportează de două ori același anunț | a doua inserare refuzată de constrângerea unică |
| Moderator fără `aal2` cheamă moderarea | refuz `admin_mfa_required` |
| Moderator MFA aprobă anunț/ascunde comentariu | schimbare permisă și eveniment audit cu actor, stare, timp și notă |
| Moderator încearcă să publice un anunț Job cu setarea falsă | refuz; setarea rămâne oprită |
| Autorul încearcă script HTML/XSS, markup și Unicode de control | text tratat ca text simplu, limită server-side; niciun HTML executat |
| OTP, raportări, postări și încărcări peste limită / replay / CAPTCHA eșuat | limitare server-side și eroare fără scurgere de informații |
| Cerere acces/ștergere cont și recuperare din backup | export minimizat; ștergere/anonymizare verificată; expirarea din backup documentată |

Acestea sunt criterii de test, nu rezultate executate. Nicio verificare RLS sau restore nu a fost posibilă fără proiect Supabase de test.

## Porți juridice și operaționale

- Identifică operatorul, scopurile/temeiurile, datele, destinatarii, transferurile, locațiile, retenția, drepturile și canalul pentru cereri/incidente. Completează proiectul de confidențialitate, traduce și revizuiește juridic.
- Semnează/validează contractele de prelucrare cu fiecare furnizor și verifică subprocessatorii, regiunea datelor, transferuri, acces suport, backupuri și ștergere.
- Stabilește dacă produsul țintește rezidenți UE/SEE și ce obligații GDPR suplimentare se aplică.
- Revizuiește Termenii de utilizare pentru anunțuri ilegale, bunuri interzise, vânzători comerciali/privați, drepturi consumator, taxe, moderare, apel, raportări și răspunderea platformei.
- Nu activa Joburi și nu potrivi angajatori cu candidați până la determinarea scrisă a aplicabilității Legii elvețiene privind serviciile de plasare (AVG/AVV), autorizării și obligațiilor aferente.
- Definește responsabilul de moderare, timpul de reacție, escaladări urgente, apel, retenția probelor, politica împotriva fraudelor și acoperirea în afara programului.

## Estimare de cost

Nu se pornește niciun serviciu plătit prin acest branch. Costul depinde de regiunea aleasă, trafic, volum imagini, e-mailuri OTP, backup și instrumente de moderare. Înainte de pilot, obține prețuri scrise pentru instanța Supabase/hosting, SMTP, stocare/CDN și eventual CAPTCHA/scanare imagini. Include și costul revizuirii juridice, administrării, moderării și răspunsului la incidente; acestea pot depăși costul tehnic.
