# INTENTRA — integrare și lansare (18.11.2026)

## Obiectiv autorizat
Un singur site intentra.ch, cu 7 secțiuni (Mașini, Locuințe, Hoteluri, Locuri de muncă, Produse, Asigurări, Comunitate), fără pierderea designului existent. Lansare autorizată de proprietar, condiționată de verificările tehnice și de securitate.

## Constatări verificate prin conectori
- GitHub branch `feature/comunitate-mvp`: `index.html` include deja navigație către `/comunitate/` și păstrează interfața colorată.
- Vercel `intentra-comunitate-preview`: ultima versiune raportată READY, branch `feature/comunitate-mvp`; proiectul are SSO protection pentru preview.
- Supabase DEV `wnmtrkheznrhrtpbenxh`: 11 tabele publice, RLS activ; 3 Edge Functions active.
- Supabase PROD `jvtpmsabjjrvfuwnsckd`: proiect ACTIVE_HEALTHY, **0 tabele publice și 0 Edge Functions**. Nu este gata pentru trafic real.

## Condiții obligatorii înainte de lansare
1. Versionarea și aplicarea controlată a migrărilor în PROD, fără copierea conturilor și anunțurilor de test din DEV; verificarea RLS și a drepturilor.
2. Deploy Edge Functions în PROD și configurarea secretelor distincte, Turnstile, Auth redirect, SMTP și storage; niciun secret în Git.
3. Integrarea rutării `/comunitate/` cu hostingul domeniului, păstrând cele șase categorii și SEO; verificarea navigației retur.
4. Teste end-to-end pe PROD pentru OTP, creare/editare/ștergere anunț, imagine JPEG/PNG/WebP, comentarii, filtrare, export/ștergere date, moderare și securitate.
5. Revizuirea paginilor legale și a operatorului de date; eliminarea mențiunilor «proiect DEV» din paginile publice numai după completarea informațiilor reale.
6. Verificarea funcțiilor de căutare: linkurile externe sunt permise; nu prezenta agregarea joburilor ca feed live fără surse/licențe validate.
7. Verificarea limitelor de cost; nicio activare cu plată fără aprobare.
8. Confirmarea stării de producție, a domeniului și a rollbackului înainte de schimbarea DNS/hosting.

**Decizie:** NU se declară lansare completă cât timp PROD nu are schema și funcțiile necesare și nu sunt trecute testele finale. Acest document nu modifică `main`, DNS sau producția.
