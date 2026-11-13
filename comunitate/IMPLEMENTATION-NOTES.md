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

Nu se pornește niciun serviciu plătit prin acest branch. Verificare orientativă la 13.11.2026, în USD: Supabase Free este $0 pentru dezvoltare, dar proiectele free pot fi puse pe pauză după o săptămână de inactivitate; Supabase Pro pornește de la $25/lună/proiect. Resend afișează Free $0 până la 3.000 e-mailuri/lună și Pro $20/lună pentru 50.000. Cloudflare Turnstile are plan gratuit. Așadar, infrastructura unui pilot poate începe la aproximativ **$25/lună** (Supabase Pro + limitele gratuite ale celorlalte componente) ori **$45/lună** cu Resend Pro, înainte de depășiri, taxe, stocare/egress suplimentar sau suport. GitHub Pages rămâne hostingul static existent; nu presupune că acesta poate furniza backend-ul.

Prețurile nu confirmă că furnizorii/regiunile lor sunt adecvate pentru datele comunității. Înainte de pilot, verifică oferta curentă și contractele de prelucrare, regiunea bazei, e-mail, backup și acces suport. Costurile de consultanță juridică, eventuale permise, moderare umană și gestionare incidente nu sunt incluse și trebuie cerute separat; nu le pot estima fără furnizor, volum și scop convenite.

Surse oficiale de preț: [Supabase](https://supabase.com/pricing), [Resend](https://resend.com/pricing), [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/plans/).

## Surse juridice oficiale de pornire

- [Legea elvețiană DSG/FADP, inclusiv art. 7, 9, 16 și 24 (Fedlex)](https://www.fedlex.admin.ch/eli/cc/2022/491/en)
- [EDÖB: transferuri transfrontaliere de date](https://www.edoeb.admin.ch/en/cross-border-transfer-of-personal-data)
- [EDÖB: externalizarea prelucrării](https://www.edoeb.admin.ch/en/outsourcing-of-data-processing)
- [SECO: plasarea privată și personal leasing conform AVG](https://www.seco.admin.ch/de/private-arbeitsvermittlung-und-personalverleih)
- [Comisia Europeană: aplicabilitatea GDPR pentru entități din afara UE](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en)

Sursele sunt punct de plecare pentru revizuire, nu concluzie juridică aplicată proiectului.
