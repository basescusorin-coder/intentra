# INTENTRA Comunitate — gate de lansare pentru /comunitate/

Status la 2026-11-20: **NO-GO pentru publicare PROD**.

## Arhitectură și schimbări confirmate

- Site-ul public `intentra.ch` este GitHub Pages din branch `main`; aplicația Comunitate este sursă Vite sub `comunitate/`.
- `node comunitate/scripts/assemble-site.mjs` pregătește pachetul `site-release/`; nu publică automat.
- Supabase PROD `jvtpmsabjjrvfuwnsckd` are schema instalată și migrația de hardening RPC aplicată separat. Nu s-au copiat date DEV.
- Preview Vercel READY este numai preview; nu certifică OTP, Turnstile, operațiile aplicației sau PROD.
- În această verificare, frontend-ul a respins un PNG valid de 83 bytes înainte de request, deoarece browserul nu a furnizat tip MIME acceptat. Validatorul a fost modificat să accepte MIME gol/octet-stream numai pentru extensiile JPEG/PNG/WebP permise; Edge Function continuă să verifice semnătura și să re-encodeze fișierul. Commituri: `cca73c6b237c2cf5c39a75bd283c32a9d06e07e2` și `d39f69dd0ed67576e050314b38e882470c0e7a7d`. Testul real post-fix încă nu a rulat: preview-ul cere autentificare și fluxul Turnstile trebuie activat/testat.

## PASS confirmate anterior

- Teste unitare site/Comunitate, RLS WASM, build și staging la commitul verificat anterior au trecut.
- Interfața principală a fost testată RO/DE/EN și căutările în cele șase categorii; nu se repetă acum fără un nou defect observat.

## Constatare PROD actuală

- Auth Email este activ cu confirmare obligatorie. **SMTP custom este OFF** în dashboard; livrarea OTP către utilizatori externi nu este PASS. Adresa contact@intentra.ch funcționează pentru corespondență, dar SMTP nu este configurat în Supabase.
- În Supabase Auth > Attack Protection, **CAPTCHA protection este Disabled** la momentul verificării. Turnstile PROD nu este PASS și nu este sigur să se deschidă signup-ul public.
- Nu am introdus ori expus credențiale. Infomaniak SMTP: host `mail.infomaniak.com`, port `587` cu STARTTLS, username adresa completă; parola trebuie introdusă direct de operator în dashboard. Activarea custom SMTP poate modifica limitele de trimitere Supabase.
- Corecția PNG este încă NEVALIDATĂ end-to-end pe noul preview. Vechiul test s-a oprit în browser înainte de orice request Supabase. Nicio înregistrare de test nu a fost creată.
- Funcțiile de publicare/comentarii/ștergere nu au fost rulate în acest nou preview/proiect PROD în această sesiune; datele de test existente nu au fost șterse.
- Documentul privacy a fost actualizat cu furnizorii/locațiile și retenția observabilă. Rămân obligatorii identificarea legală a operatorului, intervalele necontrolate de aplicație și aprobarea juridică a versiunilor RO/DE/EN.

## Gate-uri încă obligatorii înainte de publicare

1. Configurați și testați SMTP OTP în PROD, cu parola de mailbox introdusă numai direct în Supabase dashboard; confirmați livrarea, expirarea OTP și redirect-ul.
2. Activați CAPTCHA/Turnstile cu site key pentru `intentra.ch` și secret în setarea server-side; testați fluxul fără ocolirea challenge-ului.
3. După sesiune autentificată și Turnstile validat, testați într-o secvență controlată postare → fotografie upload/afișare/ștergere → comentariu → ștergere postare/cont, apoi confirmați curățarea strict a datelor de test proprii. Rulați testele efective în PROD numai după configurarea acesteia.
4. Confirmați URL redirect, origin CORS exact `https://intentra.ch`, chei client PROD și separarea completă DEV/PROD.
5. Demonstrați backup/restore și procedură de rollback; nu copiați date DEV.
6. Înainte de publicare juridică: completați numele/identitatea legală a operatorului și o adresă poștală de serviciu conformă, definiți retenția pentru raportări/loguri și obțineți aprobarea juridică RO/DE/EN. Nu publica domiciliul sau telefonul personal. Contact email singur poate fi insuficient pentru cerințele de identificare.
7. Build distinct cu config PROD, inspectarea artifactului, PASS la testele esențiale și doar apoi integrare/publicare `/comunitate/` pe `main`.

## Date și rollback

Nu copia membri, sesiuni OTP, anunțuri, fotografii sau comentarii din DEV în PROD. Folosește exclusiv date temporare noi, identificabile ca test, și curăță numai rândurile/obiectele create de test după verificarea rezultatului. Dacă o rută publicată nu trece smoke check, retrage ruta Comunității fără a face rollback neanalizat al schemei PROD.