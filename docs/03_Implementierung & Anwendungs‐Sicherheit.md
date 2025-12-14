# 3. Implementierung und Anwendungs-Sicherheit

## 3.1. Erklärung der Anwendung mit allen Sicherheitsfeatures

### 3.1.1. Backend – Secure Coding & App-Security

#### 3.1.1.1. Authentifizierung und Autorisierung

*   **3.1.1.1.1. Implementierung der gültigen Anmeldung**
    Der Anmeldeprozess wird im `AuthHandler.Login` gesteuert. Zunächst wird die Existenz des Benutzers über `userRepo.GetByEmail` geprüft. Um "User Enumeration" zu verhindern, wird bei nicht vorhandenem Benutzer lediglich ein interner Audit-Log (`user_not_found`) erstellt, dem Client jedoch eine generische Fehlermeldung zurückgegeben.
    Die Passwortüberprüfung erfolgt mittels **Argon2id** (`crypto.VerifyPassword`). Erst nach erfolgreicher Validierung des primären Faktors wird der Status der Multi-Faktor-Authentifizierung (MFA) geprüft.
    Bei erfolgreicher Authentifizierung generiert der `SessionManager` mittels `crypto/rand` eine kryptografisch sichere Session-ID. Diese wird zusammen mit Metadaten (User-ID, Erstellungszeitpunkt, Last-Seen) in einem **Redis**-Store (Hash-Map) abgelegt. Die Session-ID wird anschließend als `HttpOnly`-Cookie an den Client übermittelt.

*   **3.1.1.1.2. Autorisierungsstrategie (RBAC, ABAC)**
    Die Anwendung implementiert eine strikte **Resource-Based Access Control**.
    *   **Authentifizierung:** Die `AuthMiddleware` extrahiert die Session-ID aus dem Cookie und validiert deren Existenz und Gültigkeit (Timeout) direkt gegen den Redis-Store (`sessionManager.GetSession`).
    *   **Autorisierung:** In den Handlern (z.B. `VaultHandler`, `EntryHandler`) findet eine explizite Besitzprüfung statt. Methoden wie `vaultRepo.CheckOwnership` stellen sicher, dass Operationen nur auf Ressourcen ausgeführt werden können, die der authentifizierten `UserID` zugeordnet sind. Es existieren keine globalen Admin-Rollen oder privilegierten Zugriffe im Applikationscode ("Least Privilege").

*   **3.1.1.1.3. Umsetzung von MFA**
    Die Zwei-Faktor-Authentifizierung basiert auf dem **TOTP**-Standard (Time-based One-Time Password) und nutzt die Bibliothek `github.com/pquerna/otp`.
    *   **Speicherung:** Das TOTP-Secret wird bei der Einrichtung generiert und **verschlüsselt** (AES-GCM) in der Datenbanktabelle `mfa_secrets` abgelegt.
    *   **Verifizierung:** Bei der Anmeldung entschlüsselt das Backend das Secret temporär im Arbeitsspeicher unter Verwendung des `MasterEncryptionKey` und validiert den vom Benutzer eingegebenen 6-stelligen Code mittels `totp.Validate`.

#### 3.1.1.2. Daten- und Protokollsicherheit

*   **3.1.1.2.1. TLS-Readiness**
    Der Go-Server ist für native TLS-Terminierung vorbereitet. In der `main.go` wird die Konfiguration `TLS.Enabled` ausgewertet. Ist diese aktiv, startet der `http.Server` mittels `ListenAndServeTLS` und lädt das Zertifikat sowie den privaten Schlüssel von den konfigurierten Pfaden (`CertPath`, `KeyPath`). Dies erlaubt den sicheren Betrieb auch ohne vorgeschalteten Reverse-Proxy.

*   **3.1.1.2.2. Eingabevalidierung und Schutz vor Injections**
    *   **Deklarative Validierung:** Das `gin`-Framework nutzt Struct-Tags für die Validierung eingehender JSON-Payloads. Beispiele sind `binding:"required,email"` für E-Mail-Adressen oder `min=12,max=128` für Passwörter.
    *   **Typsicherheit & Formatprüfung:** Kritische Parameter wie kryptografische Salts oder Nonces werden explizit auf ihr Hex-Format und die korrekte Byte-Länge geprüft (z.B. 32 Bytes für Salts, 12 Bytes für Nonces), bevor sie verarbeitet werden.
    *   **SQL-Injection Schutz:** Die Datenbankinteraktion erfolgt über die Bibliothek `sqlx`. Alle SQL-Abfragen nutzen parametrisierte Queries (Prepared Statements mit `$1`, `$2` Platzhaltern), wodurch SQL-Injection systembedingt ausgeschlossen wird.

*   **3.1.1.2.3. Kryptografie**
    Die Anwendung setzt auf moderne, von der Industrie anerkannte Algorithmen:
    *   **Passwort-Hashing:** Benutzerpasswörter werden ausschließlich als **Argon2id**-Hashes gespeichert. Die Parameter sind konservativ gewählt: 64 MB Memory, 3 Iterationen, 4 Parallelism Threads, 16 Byte Salt.
    *   **Serverseitige Verschlüsselung:** Sensible Systemdaten (wie MFA-Secrets) werden mit **AES-GCM** (256-Bit Key) verschlüsselt.
    *   **Clientseitige Verschlüsselung (Zero-Knowledge):** Tresor-Einträge werden bereits im Browser verschlüsselt. Hierfür wird aus dem Master-Passwort und dem Vault-Salt mittels **PBKDF2** (SHA-256, **600.000 Iterationen**) ein Schlüssel abgeleitet. Die eigentliche Datenverschlüsselung erfolgt ebenfalls via **AES-GCM**. Das Backend speichert nur die verschlüsselten Blobs (`EncryptedData`) und Nonces.

*   **3.1.1.2.4. Saubere Fehlerbehandlung**
    Um "Information Disclosure" zu vermeiden, implementiert das Backend eine zweistufige Fehlerbehandlung:
    *   **Intern:** Technische Details (Stacktraces, SQL-Fehler) werden strukturiert mit dem `zap`-Logger (Uber) erfasst.
    *   **Extern:** Die API antwortet stets mit generischen HTTP-Statuscodes und Nachrichten (z.B. 500 "internal server error", 401 "invalid credentials"), die keine Rückschlüsse auf die interne Architektur oder den genauen Fehlergrund zulassen.

#### 3.1.1.3. Secret-Management

*   **3.1.1.3.1. Maßnahmen zur Secret-Hygiene**
    Der Quellcode ist frei von hartcodierten Geheimnissen. Alle sensiblen Parameter (Datenbank-Credentials, Redis-URL, Session-Secrets, Master-Encryption-Key) werden zur Laufzeit über Umgebungsvariablen (`.env` Datei oder Container-Environment) mittels `godotenv` geladen.

*   **3.1.1.3.2. Verwaltung von Secrets zur Laufzeit**
    Die Konfiguration wird beim Start der Anwendung einmalig in eine zentrale `Config`-Struktur geparst. Der Zugriff auf kritische Schlüssel (wie den `EncryptionKey` für MFA) ist auf die Komponenten beschränkt, die diese zwingend benötigen (`AuthHandler`), und erfolgt rein im Arbeitsspeicher.

---

### 3.1.2. Frontend – Secure Coding & Features

#### 3.1.2.1. Schutz vor Web-Angriffen

*   **3.1.2.1.1. Schutzmechanismen gegen XSS**
    Das Frontend wurde mit **React** entwickelt. Durch das automatische Escaping von Werten in JSX-Komponenten wird Cross-Site-Scripting (XSS) standardmäßig unterbunden. Auf die Nutzung von `dangerouslySetInnerHTML` wurde im gesamten Projekt verzichtet.

*   **3.1.2.1.2. Schutzmechanismen gegen CSRF**
    *   **Cookie-Attribute:** Session-Cookies werden mit dem `HttpOnly`-Flag gesetzt. Das `Secure`-Flag ist konfigurierbar (für Produktion vorgesehen).
    *   **CORS-Policy:** Die `CORSMiddleware` im Backend prüft strikt den `Origin`-Header eingehender Requests gegen eine Whitelist (`AllowedOrigins`). Credentials (Cookies) werden nur für vertrauenswürdige Ursprünge akzeptiert (`Access-Control-Allow-Credentials: true`).

*   **3.1.2.1.3. Content Security Policy (CSP)**
    In der `index.html` wird eine strikte CSP via Meta-Tag durchgesetzt:
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...`
    Dies beschränkt das Laden von Ressourcen (Skripte, Styles, Bilder) ausschließlich auf die eigene Origin und verhindert effektiv das Nachladen von Schadcode oder das Exfiltrieren von Daten an fremde Server.

#### 3.1.2.2. Daten- und Sitzungssicherheit

*   **3.1.2.2.1. Sichere Handhabung von Sitzungs- und Authentifizierungsdaten**
    *   **Storage:** Die Session-ID verlässt niemals den geschützten `HttpOnly`-Cookie-Container und ist somit für clientseitiges JavaScript nicht auslesbar.
    *   **Inaktivitäts-Timeout:** Der `AutoLogoutContext` und der Hook `useSession.js` überwachen Benutzerinteraktionen (Mausbewegungen, Tastatureingaben). Nach **15 Minuten** Inaktivität wird automatisch der Logout-Prozess angestoßen, der die Session im Backend invalidiert und lokale States bereinigt.

*   **3.1.2.2.2. API-Kommunikation**
    Die gesamte Kommunikation zwischen Frontend und Backend ist für die Nutzung über HTTPS ausgelegt. Sensible Daten (wie Passwörter) werden niemals als URL-Parameter, sondern ausschließlich im JSON-Body von POST-Requests übertragen.

---

## 3.2. Erklärung aller nicht-sicheren Parts & Begründung

*   **Abhängigkeit von Client-Side Encryption (Trust on First Use):**
    *   **Status:** Die Sicherheit der Tresor-Daten steht und fällt mit der Integrität des vom Server ausgelieferten JavaScript-Codes (`crypto.js`).
    *   **Begründung:** Dies ist ein fundamentales architektonisches Risiko webbasierter End-to-End-verschlüsselter Anwendungen. Ein kompromittierter Server könnte manipulierten Code ausliefern, der das Master-Passwort abgreift. Dieses Risiko wird durch CSP und strikte Server-Sicherheit minimiert, lässt sich aber ohne native Client-Applikation nicht vollständig eliminieren.

*   **Server-Side Encryption Key im Speicher:**
    *   **Status:** Der `MasterEncryptionKey` zur Entschlüsselung der MFA-Secrets liegt zur Laufzeit im Arbeitsspeicher des Servers.
    *   **Begründung:** Dies ist notwendig, um die TOTP-Verifizierung durchzuführen. Eine sicherere Alternative wäre der Einsatz eines Hardware Security Modules (HSM) oder eines externen Key Management Services (KMS), was jedoch die Komplexität und Kosten für dieses Projekt unverhältnismäßig steigern würde.

*   **Zentrales Session-Management via Redis:**
    *   **Status:** Sessions werden stateful in Redis gespeichert, statt stateless JWTs zu verwenden.
    *   **Begründung:** Dies ist eine bewusste Sicherheitsentscheidung. Stateful Sessions ermöglichen im Gegensatz zu JWTs eine **sofortige Invalidierung** (Revocation) bei Sicherheitsvorfällen oder Logout. Der minimale Performance-Overhead durch den Redis-Lookup wird zugunsten der höheren Sicherheit in Kauf genommen.

