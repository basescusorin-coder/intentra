# INTENTRA Comunitate — gate de lansare pentru /comunitate/

**Actualizat: 28 noiembrie 2026. Verdict curent: NO-GO.** Ruta publică /comunitate/ încă servește pagina de pregătire.

## Model Jobs aprobat

- Pagina Jobs funcționează ca instrument de căutare, informare și redirecționare către surse externe originale.
- Utilizatorul verifică oferta și aplică independent la angajator/portal.
- INTENTRA nu recrutează, selectează candidați, colectează/transmite CV-uri, negociază contracte, pune în legătură candidați și angajatori sau percepe comisioane de recrutare.
- Nu se importă feeduri sau texte integrale fără permisiune. Publicarea internă de job ads și candidaturi/CV-uri rămâne în afara funcțiilor actuale; aceasta nu dezactivează directorul extern Jobs.
- SECO indică autorizare pentru activitate regulată, contra cost, care conectează candidați și angajatori. AVV art. 1 are definiții mai largi, inclusiv publicații speciale și liste de adrese, iar art. 1a include internetul ca mediu. Încadrarea se face după funcția reală. Modelul actual de director/link extern este o inferență de risc redus, nu o excludere oficială garantată.

Surse: [SECO](https://www.seco.admin.ch/de/private-arbeitsvermittlung-und-personalverleih), [AVV art. 1 și 1a](https://www.fedlex.admin.ch/eli/cc/1991/408_408_408/de), [interpretarea SECO 2026](https://www.aim.arbeit.swiss/api/media/fileservice/sdweb-docs-prod-arbeitswiss-files/files/2026/05/25/6100561c-c357-4fc0-8a2f-f97c09f09b0d.pdf).

## Rezultate read-only confirmate

- Site root se încarcă extern; /comunitate/ nu este lansată.
- PR #10 este Draft, nemerged.
- Supabase PROD este ACTIVE_HEALTHY, 14 migrări, 9 tabele cu RLS, 3 Edge Functions active cu JWT obligatoriu.
- Security Advisor: 3 constatări INFO privind tabele interne RLS fără politici; nicio permisiune nu a fost lărgită.
- CI la release HEAD trebuie verificat după toate modificările; run-urile staging nu publică.
- Nu s-au scris date PROD, nu s-au copiat date DEV, DNS a rămas neschimbat.

## Gate-uri obligatorii înainte de workflow-ul public

1. Autentificare OTP reală pe intentra.ch confirmată, fără regenerarea nejustificată a parolei SMTP.
2. Turnstile pe hostname-ul public, MFA TOTP și AAL2 trecute în PROD.
3. Test sintetic complet PROD cu izolare între doi utilizatori și ștergere verificată a datelor proprii.
4. Privacy/rules/contact RO/DE/EN corecte pentru operator, scopuri, destinatari, transferuri și criterii de retenție; fără placeholder-e. FADP art. 19 cere identitatea și datele de contact ale operatorului. Nu indică expres o adresă poștală universală; pentru activități comerciale sau contracte electronice se reanalizează obligațiile aplicabile. Nu se publică domiciliul fără acord.
5. MASTER BACKUP incluzând cod, versiunea anterioară, schema/migrări/politici/functii și proceduri, plus restore izolat verificat.
6. Workflow-urile npm ci, npm test, test:jobs, test:rls:wasm, test:edge, build, assemble-site --production și layout final trec pe exact SHA release; artifact PROD inspectat pentru endpoint/key și fișierele site root.
7. Settings GitHub Pages confirmă sursa GitHub Actions, variabilele PROD valide și hostname păstrat. Nicio cheie secretă în bundle.
8. Integrare PR #10 și workflow-ul oficial de producție, apoi verificare externă a paginii principale și /comunitate/.

## Siguranță și rollback

Nu relaxa CAPTCHA, JWT, RLS ori limitările. Nu copia DEV în PROD și nu șterge date reale. La defect critic după publicare, revino frontend-ul la versiunea anterioară prin revert Git; nu restaura baza de date fără procedură de restore testată.