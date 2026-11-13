# Comunitate — procedură operațională propusă

**Proiect de lucru.** Nu există backend operațional; proprietarul trebuie să aleagă persoanele responsabile, intervalele și locația backup-urilor înainte de pilot.

## Backup și restaurare

Planul Supabase Free nu include backup-uri automate descărcabile. Înainte de orice schimbare de schemă și cel puțin săptămânal după lansare:

1. Exportați baza cu versiunea CLI compatibilă: `supabase db dump --db-url "$COMMUNITY_DB_URL" -f backup.sql`.
2. Arhivați separat obiectele din bucket-ul `community-images` cu utilitarul Supabase Storage/API; dump-ul SQL nu conține fișierele.
3. Criptați exporturile local, verificați că nu sunt accesibile public și păstrați-le într-o locație separată cu acces minim. Definiți perioadă de retenție și ștergere documentată.
4. Într-un mediu izolat, restaurați baza (`psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f backup.sql`), restaurați eșantion de obiecte și verificați referințele, RLS, autentificarea și funcțiile. Nu restaurați peste producție în test.
5. Înregistrați data, operatorul, versiunea CLI, rezultatul, erorile și timpul de restaurare. Nu marcați backup-ul ca verificat până când restaurarea efectivă reușește.

Variabilele de conexiune nu trebuie introduse în Git sau transmise în conversație. Fișierul de backup poate conține date personale: limitați accesul, criptați-l și aplicați retenția stabilită. Backup-ul periodic nu este disponibil încă automatizat/testat în această implementare.

## Incident de securitate sau scurgere de date

1. Persoana care observă problema notează timpul, sistemul, simptomul și impactul cunoscut; nu copiază inutil date personale în tichete sau e-mail.
2. Responsabilul tehnic limitează accesul afectat: dezactivează sesiuni/chei, izolează funcția sau bucket-ul și păstrează logurile relevante cu acces restricționat.
3. Evaluează datele și persoanele afectate, perioada, destinatarii și posibilitatea de abuz; păstrează dovezile și jurnalul deciziilor.
4. Operatorul juridic decide fără întârziere dacă și cui trebuie notificat conform DSG/FADP și, unde se aplică, GDPR. Termenele și pragurile trebuie validate juridic pentru incidentul concret.
5. Remediază cauza, rotește secretele compromise, verifică controalele și documentează lecțiile înainte de reactivare.

Contacte, responsabil titular, serviciu în afara programului, termene interne și template-ul de notificare: `[DE DEFINIT înainte de pilot]`. Acest document nu înlocuiește evaluarea juridică ori obligațiile legale de notificare.
