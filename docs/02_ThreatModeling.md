# 2. Komponenten und Sicherheitsanalyse (Threat Modeling)

## 2.1. Komponentenbeschreibung

Das System folgt einer klassischen Client-Server-Architektur mit einem starken Fokus auf "Security by Design" durch clientseitige Verschlüsselung (Zero-Knowledge-Architektur).

### 2.1.1. Backend-Services
Das Backend ist als monolithische Go-Anwendung (basierend auf dem Gin-Framework) implementiert, die RESTful APIs bereitstellt.
*   **API-Layer**: Zentraler Einstiegspunkt für alle Anfragen. Implementiert Middleware für Authentifizierung (Session-basiert), CORS-Richtlinien und strukturiertes Logging.
*   **Auth-Service**: Verwaltet Identitäten, Registrierung und Anmeldung. Passwörter werden serverseitig mittels Argon2id gehasht. Unterstützt Multi-Faktor-Authentifizierung (MFA), wobei TOTP-Secrets und Backup-Codes serverseitig verschlüsselt (AES-GCM) gespeichert werden.
*   **Vault-Service**: Zuständig für die Verwaltung von Tresoren und Passworteinträgen. Wichtig: Dieser Service verarbeitet und speichert ausschließlich *verschlüsselte* Blobs (Ciphertext) und hat keinen Zugriff auf die Klartextdaten oder den Master-Key.
*   **Audit-Service**: Protokolliert sicherheitsrelevante Ereignisse (z.B. Anmeldeversuche, Datenzugriffe) unveränderbar in der Datenbank, um Nachvollziehbarkeit zu gewährleisten.

### 2.1.2. Frontend-Komponenten
Das Frontend ist eine React-basierte Single Page Application (SPA), die im Browser des Benutzers ausgeführt wird. Sie übernimmt die kritische Aufgabe der kryptographischen Operationen.
*   **Crypto-Engine (utils/crypto.js)**: Kernkomponente für die Sicherheit. Führt die Schlüsselableitung (PBKDF2) aus dem Master-Passwort durch und verschlüsselt/entschlüsselt Daten lokal mittels AES-GCM. Das Master-Passwort verlässt niemals den Browser-Kontext.
*   **Session Management**: Verwaltet den Authentifizierungsstatus und implementiert Sicherheitsmechanismen wie Auto-Logout bei Inaktivität (AutoLogoutContext).
*   **UI-Komponenten**: Stellt Formulare für Authentifizierung und Tresorverwaltung bereit, wobei sensitive Eingaben (wie das Master-Passwort) isoliert verarbeitet werden.

### 2.1.3. Infrastruktur-Komponenten
Die Infrastruktur wird containerisiert (Docker/Kubernetes) betrieben und trennt strikt zwischen Datenhaltung und Verarbeitung.
*   **Ingress Controller (Traefik)**: Fungiert als Reverse Proxy und Load Balancer. Er terminiert TLS-Verbindungen und routet Anfragen an Frontend oder Backend.
*   **PostgreSQL Datenbank**: Relationale Datenbank zur persistenten Speicherung von Benutzerdaten (gehasht), verschlüsselten Tresor-Daten und Audit-Logs. Sie läuft in einem isolierten Netzwerksegment.
*   **Redis Cache**: In-Memory Key-Value Store. Wird primär für das schnelle Speichern und Abrufen von Session-Informationen verwendet, um die Zustandsbehaftung des Backends zu minimieren.

---

## 2.2. Threat Modeling

### 2.2.1. Systemmodell mit Data Flow Diagram (DFD)
<img width="1103" height="695" alt="DataFlowDiagram" src="https://github.com/user-attachments/assets/8979a576-944c-4620-9387-bb1e910e9bdb" />

### 2.2.2. Erklärung der Datenflüsse
### User <--> Application

1. User sendet verschlüsselte Anfrage an Traefik.
2. Traefik leitet Anfrage an Frontend Pods weiter.
3. Traefik leitet API-Anfragen an Backend Pods weiter.
4. Frontend Pods liefern statische Assets zurück an Traefik.
5. Backend prüft Gültigkeit der Session in Redis. 
6. Redis liefert Session-Data zurück an das Backend.
7. Backend führt Datenbank-Operationen auf PostgreSQL aus.
8. PostgreSQL liefert Abfrageergebnisse zurück an das Backend.
9. Backend sendet API-Antworten an Traeffik zurück.
10. Traefik leitet verschlüsselte Antwort zurück an den User.

### Developer <--> Kubernetes

11. Developer pusht Code-Änderungen zu GitHub.
12. GitHub benachrichtigt CI/CD über neuen Commit.
13. CI/CD erstellt Docker-Images aus dem Code.
14. CI/CD lädt Images in Registry hoch.
15. Kubernetes zieht neue Images aus der Registry.
16. CI/CD deployed aktualisierte Pods in Kubernetes.

---

## 2.3. Detaillierte STRIDE-Analyse pro Komponente

### 2.3.1. Komponente: Frontend SPA (React)

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Phishing / UI Redressing | Angreifer täuscht die Benutzeroberfläche vor, um das Master-Passwort abzugreifen. | Angreifer hostet eine identisch aussehende Seite unter einer ähnlichen Domain (Typosquatting). | Benutzer ruft falsche URL auf. | Schulung der Benutzer, Verwendung von Lesezeichen, Browser-Sicherheitsindikatoren (TLS). | Extern (User) |
| **T**ampering | Cross-Site Scripting (XSS) | Einschleusen von bösartigem JavaScript, das im Kontext der Anwendung ausgeführt wird. | Angreifer speichert ein Skript in einem geteilten Notizfeld, das beim Rendern ausgeführt wird und das Master-Passwort aus dem Speicher liest. | Schwachstelle im Rendering oder in einer Abhängigkeit (Supply Chain). | React Escaping (automatisch), Content Security Policy (CSP), Subresource Integrity (SRI), Regelmäßige Dependency-Audits (`npm audit`). | Teilweise (React Default aktiv, CSP/SRI fehlen) |
| **T**ampering | Manipulation des Client-Codes | Veränderung des ausgelieferten JavaScript-Bundles (Man-in-the-Middle oder Server-Compromise). | Angreifer modifiziert `crypto.js` während der Übertragung, um eine Hintertür einzubauen. | Kontrolle über Netzwerk oder CDN/Server. | HTTPS (TLS), Subresource Integrity (SRI) für externe Skripte. | Implementiert (TLS) |
| **I**nformation Disclosure | Unsichere Speicherung von Secrets | Speicherung des Master-Passworts oder abgeleiteter Schlüssel im LocalStorage/SessionStorage. | Malware auf dem PC liest `localStorage` aus und stiehlt den Key. | Physischer Zugriff oder XSS. | Secrets nur im flüchtigen Speicher (RAM) halten. Löschen bei Logout/Reload. | Implementiert (Memory-only Design) |
| **I**nformation Disclosure | Leaking via Browser Cache/History | Sensible Daten verbleiben im Browser-Cache oder in der URL-History. | Master-Passwort wird als URL-Parameter übergeben (`?pw=...`) und landet in der History. | Zugriff auf Browser-History. | POST-Requests für sensible Daten, `Cache-Control: no-store` Header, keine sensiblen Daten in URL. | Implementiert |
| **D**enial of Service | Client-Side Resource Exhaustion | Überlastung des Browsers durch rechenintensive Operationen. | Angreifer manipuliert PBKDF2-Parameter (z.B. 100 Mio. Iterationen), sodass der Browser einfriert. | Manipulation der Konfiguration vom Server. | Validierung der Krypto-Parameter im Client (Obergrenzen). | Offen |
| **E**levation of Privilege | Cross-Site Request Forgery (CSRF) | Angreifer zwingt den Browser des Benutzers zu ungewollten Aktionen im authentifizierten Kontext. | Angreifer-Seite sendet POST-Request zum Löschen eines Tresors. | Benutzer ist eingeloggt, keine CSRF-Protection. | `SameSite=Lax/Strict` Cookies, Anti-CSRF Tokens (für State-Changing Operations). | Teilweise (`SameSite` Cookies genutzt) |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Denial of Service (Offen):** Client-seitige Ressourcenlimits sind schwer durchzusetzen. Der Fokus liegt auf Server-Stabilität.
*   **Tampering (Teilweise):** CSP und SRI sind komplexe Themen, die für das MVP zurückgestellt wurden, aber für V2 geplant sind.
*   **Elevation of Privilege (Teilweise):** `SameSite=Lax` bietet bereits guten Schutz gegen CSRF in modernen Browsern. Vollständige Token-Validierung erhöht die Komplexität signifikant.

### 2.3.2. Komponente: Backend API (Go)

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Service Impersonation | Ein bösartiger Service gibt sich als Backend-API aus. | Angreifer leitet DNS um oder übernimmt IP, um Credentials abzufangen. | Netzwerk-Kontrolle, fehlende Server-Authentifizierung. | TLS-Zertifikate (Server Identity), HSTS. | Implementiert |
| **T**ampering | Dependency Confusion / Supply Chain | Kompromittierte Go-Module oder Docker-Base-Images. | Einschleusen von Schadcode über eine manipulierte Library (`go.mod`). | Zugriff auf Public Repos oder Build-Pipeline. | Dependency Pinning (`go.sum`), Vulnerability Scanning (Trivy), Minimal Base Images (Distroless). | Teilweise (`go.sum` vorhanden) |
| **R**epudiation | Insufficient Logging | Fehlende Protokollierung von Sicherheitsvorfällen verhindert Forensik. | Angreifer probiert Passwörter durch (Brute Force), ohne dass es bemerkt wird. | Logging deaktiviert oder unzureichend. | Strukturiertes Audit-Logging (wer, was, wann), zentrales Log-Management. | Implementiert (Audit-Service) |
| **I**nformation Disclosure | Error Handling Leaks | Stacktraces oder interne Pfade werden bei Fehlern ausgegeben. | API gibt bei DB-Fehler den SQL-Query und Tabellennamen zurück. | Debug-Modus aktiv, schlechtes Error-Handling. | Generische Fehlermeldungen an Client, detaillierte Logs nur intern (Zap Logger). | Implementiert |
| **D**enial of Service | Resource Exhaustion | Überlastung von CPU/RAM durch komplexe Anfragen. | Angreifer sendet riesige JSON-Payloads oder initiiert viele TLS-Handshakes. | Kein Rate Limiting, keine Ressourcen-Limits. | Request Size Limits, Timeouts, Rate Limiting (Middleware/Ingress). | Offen (Rate Limiting fehlt) |
| **E**levation of Privilege | Broken Access Control | Zugriff auf Ressourcen anderer Benutzer durch ID-Manipulation (IDOR). | Ändern der `vault_id` in der URL, um fremden Tresor zu lesen. | Fehlende Autorisierungsprüfung im Handler. | Strikte Besitzprüfung (`CheckOwnership`) bei jedem Zugriff. | Implementiert |
| **S**poofing | Brute Force Attack | Direkter Angriff auf Login-Endpoint mit vielen Passwort-Kombinationen. | Automatische Requests mit Passwort-Liste gegen /api/auth/login. | Keine Rate Limiting, kein Account Lockout. | Rate Limiting pro IP/User, Exponential Backoff, Account Lockout nach N Versuchen. | Teilweise (Audit-Logging implementiert, Rate Limiting fehlt) |
| **T**ampering | Input Validation Bypass | Ungültige oder zu lange Eingaben als JSON-Parameter. | Senden großer Payloads um Memory zu erschöpfen. | Fehlende Input-Length Validierung. | Struct-Tags mit max-Bindung, Request Size Limit. | Implementiert |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Tampering (Teilweise):** `go.sum` verhindert Änderungen an direkten Abhängigkeiten. Ein vollständiger Supply-Chain-Schutz (z.B. Sigstore) würde den Rahmen des Projekts sprengen.
*   **Denial of Service (Offen):** Rate Limiting erfordert eine verteilte State-Verwaltung (Redis), was die Komplexität erhöht. Für das MVP wird das Risiko akzeptiert.

*   **Spoofing - Brute Force Attack (Teilweise):** Rate Limiting würde den Angriff erheblich verlangsamen, ist aber komplex zu implementieren ohne verteilten State (Redis). Die Audit-Logs ermöglichen aber Nachverfolgung von Brute-Force-Versuchen nach dem Angriff.
*   **Tampering - Input Validation Bypass (Implementiert):** Go Struct-Tags mit `binding:"max=5000"` begrenzen die Payload-Größe. Zusätzliche Request-Size-Limits könnten auf Ingress-Ebene konfiguriert werden.
### 2.3.3. Komponente: PostgreSQL Datenbank

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Unauthorized Access | Zugriff auf DB ohne gültige Credentials. | Angreifer verbindet sich direkt mit Port 5432. | DB-Port öffentlich exponiert, schwaches Passwort. | DB im privaten Subnetz, Zugriff nur via Backend erlaubt (Network Policies), starke Passwörter. | Implementiert (Docker Network) |
| **T**ampering | Data Corruption | Löschen oder Verändern von Daten durch Malware oder Fehlkonfiguration. | Ransomware verschlüsselt DB-Files. | Zugriff auf Filesystem oder DB-Admin-Rechte. | Regelmäßige Backups, Least Privilege für DB-User. | Offen (Backup-Strategie fehlt) |
| **R**epudiation | Admin Activity Hiding | DB-Admin manipuliert Daten und löscht Spuren. | Admin löscht User-Tabelle und deaktiviert Logging. | Admin-Rechte auf DB. | Remote Logging (Logs an separaten Server senden), 4-Augen-Prinzip. | Akzeptiert (Vertrauen in Admin) |
| **I**nformation Disclosure | Data Theft at Rest | Diebstahl der Datenbank-Dateien oder Backups. | Angreifer kopiert Volume-Daten vom Host. | Zugriff auf Host-System. | Encryption at Rest (Filesystem-Level oder DB-Level), Zero-Knowledge (Daten sind eh verschlüsselt). | Implementiert (Zero-Knowledge) |
| **D**enial of Service | Connection Exhaustion | Überlasten der DB | Backend öffnet zu viele Connections ohne sie zu schließen (Leak). | Schlechtes Connection Pooling. | Connection Pooling (in `sqlx` konfiguriert), Max Connections Limit. | Implementiert |
| **E**levation of Privilege | Privilege Escalation | Ausnutzen von DB-Schwachstellen für Host-Zugriff. | Exploit in Postgres-Funktion erlaubt Shell-Execution. | Ungepatchte DB-Version. | Regelmäßige Updates, Container als Non-Root User ausführen. | Implementiert (Docker Best Practices) |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Tampering (Offen):** Eine umfassende Backup-Strategie (Offsite-Backups, Restore-Tests) ist operativ aufwendig und für die Entwicklungsumgebung nicht priorisiert.
*   **Repudiation (Akzeptiert):** Das Risiko, dass ein Datenbank-Administrator Logs manipuliert, wird akzeptiert, da dieser ohnehin vollen Zugriff auf die Infrastruktur hat ("Trusted Admin").

### 2.3.4. Komponente: Redis Cache

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Unauthorized Access | Zugriff auf Redis ohne Authentifizierung. | Angreifer liest alle Session-Keys aus. | Redis oft standardmäßig ohne Passwort ("Protected Mode" aus), Port offen. | Redis Passwort setzen (`requirepass`), Network Isolation. | Implementiert |
| **T**ampering | Session Manipulation | Verändern von Session-Daten (z.B. `user_id` ändern). | Angreifer ändert seine Session, um Admin zu werden. | Schreibzugriff auf Redis. | Redis Auth, Integritätsschutz (schwer in Redis, daher Zugriffsschutz priorisieren). | Implementiert (Zugriffsschutz) |
| **R**epudiation | Lack of Audit Trail | Änderungen im Cache werden nicht protokolliert. | Angreifer löscht Sessions anderer User (DoS), keine Spur. | Zugriff auf Redis. | Redis Monitor (Performance-Impact!), Zugriffsschutz priorisieren. | Akzeptiert (Network Isolation + starkes PW) |
| **I**nformation Disclosure | Session Leakage | Auslesen aller aktiven Sessions. | Angreifer dumpt Keyspace. | Lesezugriff auf Redis. | TLS für Redis-Traffic (optional), Zugriffsschutz. | Implementiert (Zugriffsschutz) |
| **D**enial of Service | Memory Exhaustion | Füllen des Speichers, bis Redis abstürzt (OOM). | Erzeugen von Millionen Fake-Sessions. | Keine Eviction Policy, kein Memory Limit. | `maxmemory` Limit konfigurieren, `allkeys-lru` Eviction Policy. | Offen |
| **E**levation of Privilege | Container Escape | Ausbruch aus dem Redis-Container auf den Host. | Exploit in Redis Lua Engine. | Ungepatchte Version, Container als Root. | Non-Root User, Seccomp Profile, Updates. | Implementiert (Docker) |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Repudiation (Akzeptiert):** Redis ist ein flüchtiger Speicher. Ein Audit-Trail für jeden Cache-Zugriff würde die Performance massiv beeinträchtigen.
*   **Denial of Service (Offen):** Eine strikte Memory-Eviction-Policy muss sorgfältig konfiguriert werden, um keine validen Sessions zu löschen. Dies erfordert Lasttests.

### 2.3.5. Datenfluss: User -> Frontend (Input)

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Impersonation | Unbefugte Nutzung eines unbeaufsichtigten Geräts. | Kollege nutzt offenen Laptop, während User Kaffee holt. | Physischer Zugriff, Session noch aktiv. | Kurze Session-Timeouts, Auto-Logout bei Inaktivität. | Implementiert (AutoLogoutContext) |
| **T**ampering | Keylogging | Aufzeichnen der Tastatureingaben (Master-Passwort). | Hardware-Keylogger oder Malware auf Client-PC. | Kompromittiertes Endgerät. | Virtuelle Tastatur (begrenzt hilfreich), 2FA/MFA (schützt vor Login auf neuem Gerät, aber nicht vor lokaler Session-Übernahme). | Implementiert (MFA) |
| **R**epudiation | Bestreiten von UI-Interaktionen | Benutzer führt eine Aktion aus und behauptet später, dies nicht getan zu haben. | "Ich habe den 'Löschen'-Button nicht geklickt, der Eintrag ist einfach verschwunden." | Fehlende Bestätigungsdialoge. | Erzwungene Bestätigung bei kritischen Aktionen (Modal/Popup), Korrelation mit Backend-Audit-Logs. | Implementiert (UI-Modals) |
| **I**nformation Disclosure | Shoulder Surfing | Beobachten der Passworteingabe. | Person schaut über die Schulter. | Physische Nähe. | Passwort-Feld maskieren (`type="password"`), Sichtschutzfolien (User-Verantwortung). | Implementiert (UI) |
| **D**enial of Service | Input Blocking | Malware blockiert Eingabefelder oder überlagert UI. | Overlay-Attacke verhindert Login. | Malware auf Client. | Antivirus, OS-Sicherheitsmechanismen. | Extern (User Device) |
| **E**levation of Privilege | Accessibility Abuse | Malware nutzt A11y-APIs um Rechte zu erlangen/Daten zu lesen. | Screenreader-Malware liest Passwort-Feld. | Malware auf Client. | OS-Permissions prüfen (Mobile), schwer im Web zu verhindern. | Akzeptiert |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Denial of Service (Extern):** Gegen Malware auf dem Endgerät des Benutzers kann die Webanwendung technisch nichts ausrichten.
*   **Elevation of Privilege (Akzeptiert):** Accessibility-APIs sind notwendig für Barrierefreiheit. Missbrauch durch Malware auf dem Client liegt außerhalb der Kontrolle der Webanwendung.

### 2.3.6. Datenfluss: Frontend -> Backend (HTTPS)

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | DNS Hijacking | Der DNS-Name des Backends wird auf einen bösartigen Server aufgelöst. | Angreifer vergiftet DNS-Cache oder übernimmt Nameserver. | Netzwerk-Position zum Ausführen von DNS-Spoofing. | HSTS Preload, DNSSEC (optional), DNS Validation. | Implementiert (HSTS Header) |
| **S**poofing | Man-in-the-Middle (MitM) | Angreifer klinkt sich in Verbindung ein. | ARP-Spoofing im öffentlichen WLAN. | Fehlende oder schwache Verschlüsselung. | TLS 1.2/1.3 erzwingen, Starke Cipher-Suites. | Implementiert |
| **T**ampering | Replay Attack | Wiederholtes Senden einer abgefangenen (verschlüsselten) Anfrage. | Angreifer fängt "Create Vault"-Request ab und sendet ihn erneut. | Keine Replay-Protection (Nonces/Timestamps). | TLS (verhindert Replay auf Netzwerkebene), Nonces in API-Design (optional). | Implementiert (TLS) |
| **R**epudiation | Bestreiten der Urheberschaft | Ein Benutzer bestreitet, einen bestimmten API-Request (z.B. "Lösche Tresor") gesendet zu haben. | Angreifer nutzt gestohlene Session-ID, um Requests zu senden; Opfer behauptet glaubhaft, es nicht gewesen zu sein. | Session-Hijacking möglich. | IP-Logging, User-Agent Logging, kurze Session-Lifetimes. | Akzeptiert (Risiko durch Session-Schutz minimiert) |
| **I**nformation Disclosure | Traffic Sniffing | Mitlesen von sensiblen Daten (Session-Cookie, Ciphertext). | Wireshark im unverschlüsselten Netz. | Kein HTTPS. | HTTPS Everywhere, HSTS, Secure Cookies. | Implementiert |
| **D**enial of Service | Flooding / DDoS | Überfluten der Application. | Volumetrische Angriffe auf den Ingress. | Ausreichende Bandbreite beim Angreifer. | Upstream DDoS Protection (Cloudflare, AWS Shield). | Extern (Infrastruktur) |
| **E**levation of Privilege | Parameter Tampering | Manipulation von Parametern im Transit. | Ändern von `{"role": "user"}` zu `{"role": "admin"}` im Body. | Kein Integritätsschutz (TLS fehlt). | TLS (Integrität), Serverseitige Validierung. | Implementiert |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Repudiation (Akzeptiert):** Client-Zertifikate (mTLS) sind für Endanwender-Anwendungen unpraktikabel (UX). Das Risiko wird durch andere Auth-Mechanismen mitigiert.
*   **Denial of Service (Extern):** DDoS-Schutz ist Aufgabe der Infrastruktur (Provider), nicht der Applikationslogik.

### 2.3.7. Datenfluss: Backend -> PostgreSQL (SQL)

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Connection Spoofing | Angreifer verbindet sich als Backend zur DB. | IP-Spoofing im internen Netz. | Schwache Netzwerkkontrollen. | mTLS zwischen App und DB, Passwort-Auth. | Implementiert (Passwort) |
| **T**ampering | SQL Injection | Manipulation der SQL-Query durch User-Input. | Eingabe von `' OR 1=1; --` im Login-Feld. | Unsichere String-Konkatenation im Code. | Prepared Statements / Parameterized Queries (`sqlx`). | Implementiert |
| **R**epudiation | Transaction Denial | DB oder App leugnen Transaktion. | Inkonsistenz zwischen App-Log und DB-Daten. | Fehlende Transaktionslogs. | WAL (Write Ahead Log) in Postgres, App-Audit-Logs. | Implementiert |
| **I**nformation Disclosure | Logging of Sensitive Data | SQL-Queries mit Parametern landen im Log. | DB-Log enthält Klartext-Daten (hier nur Ciphertext/Hashes, aber trotzdem unschön). | Logging-Level zu hoch (Debug). | Logging konfigurieren (keine Parameter loggen), Zero-Knowledge (Daten sind eh verschlüsselt). | Implementiert |
| **D**enial of Service | Slow Queries | Ausführen extrem aufwendiger Queries. | Angreifer triggert Suche, die Full-Table-Scan auslöst. | Fehlende Indizes. | DB-Indizes auf Fremdschlüsseln und Suchfeldern setzen. | Teilweise |
| **E**levation of Privilege | SQL Injection (EoP) | Nutzung von SQLi zur Rechteausweitung. | `UNION SELECT` um Admin-Passwort-Hash zu lesen. | SQLi-Lücke. | Prepared Statements. | Implementiert |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Denial of Service (Teilweise):** Datenbank-Indizes sind gesetzt, aber eine umfassende Query-Optimierung und Timeouts für alle möglichen Queries fehlen noch.

### 2.3.8. Datenfluss: Backend -> Redis (Internal)

| STRIDE | Bedrohung | Beschreibung | Beispielangriff | Vorraussetzungen | Gegenmaßnahmen | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S**poofing | Internal MitM | Abfangen der Verbindung im Container-Netzwerk. | Kompromittierter Nachbar-Container sniffed Traffic. | Flaches Netzwerk, ARP-Spoofing möglich. | TLS für Redis (oft Overhead), Network Policies (Isolation). | Teilweise (Isolation) |
| **T**ampering | Command Injection | Einschleusen von Redis-Befehlen. | CRLF Injection wenn Input ungefiltert an Redis geht. | Unsichere Redis-Library Nutzung. | Nutzung typsicherer Redis-Clients (go-redis). | Implementiert |
| **R**epudiation | No Audit | Keine Logs über Cache-Zugriffe. | Siehe oben. | - | - | Akzeptiert |
| **I**nformation Disclosure | Unencrypted Transport | Session-IDs werden im Klartext übertragen (intern). | Siehe oben. | Kein TLS intern. | Risikoakzeptanz im privaten Cluster-Netzwerk oder mTLS (Service Mesh). | Akzeptiert |
| **D**enial of Service | Connection Flooding | Überlastung der Redis-Verbindungen. | Loop öffnet tausende Connections. | Bug oder Angriff. | Connection Pooling, Max Clients Limit. | Implementiert |
| **E**levation of Privilege | Lua Sandbox Escape | Ausbruch aus Redis via Lua. | Bösartiges Lua-Skript. | `EVAL` Rechte für User. | `EVAL` deaktivieren oder einschränken (rename-command). | Offen |

**Begründung für nicht/teilweise umgesetzte Maßnahmen:**
*   **Spoofing (Teilweise):** Im internen Docker-Netzwerk wird auf strikte Netzwerk-Isolation vertraut. TLS für Redis-Traffic ist ein Performance-Tradeoff.
*   **Repudiation (Akzeptiert):** Siehe Redis-Komponente oben (Performance).
*   **Information Disclosure (Akzeptiert):** Siehe Spoofing. Vertrauen in die Isolation des Container-Netzwerks.
*   **Elevation of Privilege (Implementiert):** Container-Sicherheit ist durch Non-Root User, Seccomp Profile und regelmäßige Updates implementiert. Die Lua-Sandbox ist in neueren Redis-Versionen verbessert worden. Gefährliche EVAL-Befehle sollten in Production deaktiviert werden.

---

## 2.4. Attack Tree (Worst Case: "Compromise Backend")
Das Szenario betrachtet den Fall, dass ein Angreifer volle Kontrolle über den Backend-Container erlangt (z.B. durch RCE).

**Ziel:** Entschlüsselung der Tresore aller Benutzer.

Der Attack Tree ist aufgrund Darstellungsproblemen unter https://github.com/user-attachments/assets/d645b8ad-3c56-4a53-8cce-1fc076d731fe zu finden.

### 2.4.1. Branch-Details
Hier werden die Gegenmaßnahmen gegen die Bedrohungen der einzelnen Branches im Detail beschrieben.

---

#### 2.4.1.1. Branch 1: Master Password Stealing
##### 2.4.1.1.1. XSS-Angriff zur Extraktion des Master-Passworts

**Bedrohung:** Ein Angreifer injiziert bösartigen JavaScript-Code, um das Master-Passwort abzufangen, das der Benutzer eingibt.

**Gegenmaßnahme:** 
- Das Frontend nutzt React, das standardmäßig HTML-Escaping für JSX-Content durchführt
- Benutzer-Input wird durch React automatisch escaped, bevor er gerendert wird
- Keine direkten `innerHTML` oder `dangerouslySetInnerHTML`-Operationen für Benutzerdaten
- Das Passwort-Eingabefeld verwendet `type="password"` mit nativen Browser-Schutzfunktionen
- Das Passwort wird sofort nach Eingabe client-seitig mit PBKDF2 deriviert und der Klartext wird nicht persistent gespeichert

##### 2.4.1.1.2. Keylogger auf User-Gerät installiert

**Bedrohung:** Malware auf dem Client-Gerät erfasst das Master-Passwort während der Eingabe.

**Gegenmaßnahme:**
- Das Master-Passwort wird nur lokal verarbeitet und verlässt das Client-Gerät nie im Klartext
- Das Passwort-Eingabefeld nutzt HTML5 `type="password"`, das vom Browser vor vielen Angriffsformen schützt
- Die PBKDF2-Derivation erfolgt sofort nach Eingabe in `frontend/src/handlers/authHandlers.ts`
- Der Klartext wird nicht persistent gespeichert; nur der abgeleitete Schlüssel wird zum Server übertragen
- Selbst wenn ein Keylogger das Passwort abfängt, müsste der Angreifer zusätzlich die PBKDF2-Derivation (100.000 Iterationen) durchführen

##### 2.4.1.1.3. Phishing zur Erkennung des Master-Passworts

**Bedrohung:** Ein Angreifer erstellt eine gefälschte Kopie der Anwendung und leitet Benutzer dorthin, um das Master-Passwort zu stehlen.

**Gegenmaßnahme:**
- Die Anwendung ist für HTTPS/TLS konfiguriert in `backend/internal/config/config.go`
- TLS kann aktiviert werden mit Zertifikat-Pfaden: `c.TLS.Enabled`, `c.TLS.CertPath`, `c.TLS.KeyPath`
- Ein gültiges SSL/TLS-Zertifikat von einer vertrauenswürdigen Zertifizierungsstelle muss installiert sein
- HTTP->HTTPS-Redirect wird implementiert, um Benutzer zu sicheren Verbindungen zu leiten
- Der HSTS-Header kann gesetzt werden, um Browser zu zwingen, nur HTTPS-Verbindungen zu verwenden

---

#### 2.4.1.2. Branch 2: Session Hijacking
##### 2.4.1.2.1. CSRF-Attacke (Cross-Site Request Forgery)

**Bedrohung:** Ein Angreifer verleitet einen authentifizierten Benutzer, eine böse Website zu besuchen, die versteckte Anfragen an die API sendet.

**Gegenmaßnahme:**
- CORS-Konfiguration mit Origin-Whitelist wird eingesetzt
- Nur Anfragen von konfigurierten Origins werden akzeptiert: `Access-Control-Allow-Origin` wird restriktiv gesetzt
- `Access-Control-Allow-Credentials: true` wird nur bei authentifizierten Requests gesetzt
- `Access-Control-Allow-Methods` wird auf notwendige HTTP-Verben beschränkt (POST, PUT, DELETE, GET)
- Anfragen von unerwarteten Origins werden blockiert

##### 2.4.1.2.2. Session-Cookie-Theft

**Bedrohung:** Ein Angreifer stiehlt die Session-Cookie eines Benutzers (z.B. durch XSS oder MITM) und verwendet sie, um sich auszugeben.

**Gegenmaßnahme:**
- Session-Cookies werden mit `HttpOnly`-Flag gesetzt, wodurch JavaScript nicht auf die Cookie zugreift (XSS-Prävention)
- Session-Cookies werden mit `Secure`-Flag gesetzt, das nur HTTPS-Übertragung erlaubt
- Session-IDs werden kryptographisch sicher generiert 
- Sessions werden server-seitig in Redis gespeichert (nicht im Cookie)
- Session-IDs haben automatische Timeouts und werden nach Inaktivität gelöscht
- Beim Laden von Sessions wird ein Validierungsmechanismus durchgeführt

##### 2.4.1.2.3. Man-in-the-Middle (MITM) auf HTTPS

**Bedrohung:** Ein Angreifer auf dem Netzwerk versucht, HTTPS-Verbindungen zu manipulieren oder abzufangen.

**Gegenmaßnahme:**
- Die Anwendung erzwingt HTTPS/TLS für alle sensitiven Datenübertragungen
- Ein gültiges SSL/TLS-Zertifikat von einer vertrauenswürdigen Zertifizierungsstelle ist erforderlich
- Das Backend unterstützt TLS 1.2+ Konfiguration
- HTTP->HTTPS-Redirect wird durchgeführt (301 oder 308), um Benutzer zu sicheren Verbindungen zu leiten
- Session-Cookies haben das `Secure`-Flag, das nur HTTPS-Übertragung erlaubt
- Alle sensitive Daten (Passwörter, Session-Token) werden nur über verschlüsselte Verbindungen übertragen

---

#### 2.4.1.3. Branch 3: Database Breach
##### 2.4.1.3.1. SQL-Injection auf die Backend-API

**Bedrohung:** Ein Angreifer injiziert SQL-Code über API-Parameter, um die Datenbank zu kompromittieren.

**Gegenmaßnahme:**
- Durchgehend werden parameterisierte Queries mit dem `sqlx`-Framework verwendet
- Benutzer-Input wird nie direkt in SQL-Strings konkateniert
- sqlx führt automatisch Escaping durch und validiert Eingaben
- Dies verhindert SQL-Injection-Angriffe vollständig

##### 2.4.1.3.2. Direkter Zugriff auf PostgreSQL-Datenbank

**Bedrohung:** Ein Angreifer erhält direkten Zugriff auf PostgreSQL (Port 5432) und kann beliebige SQL-Befehle ausführen.

**Gegenmaßnahme:**
- PostgreSQL ist in Docker/Kubernetes nur über interne Netzwerke erreichbar, nicht öffentlich exponiert
- In `docker-compose.backend.yml` ist PostgreSQL nur im internen Netzwerk konfiguriert
- Datenbankzugriffe erfolgen ausschließlich über die Anwendung
- Die Datenbankverbindung wird von der Anwendung verwaltet
- Datenbank-Credentials werden nicht im Code gespeichert, sondern über Environment-Variablen injiziert
- Alle Datenbankzugriffe erfolgen über authentifizierte API-Endpoints mit Session-Validierung
- Benutzer können nur ihre eigenen Vaults und Einträge abrufen

##### 2.4.1.3.3. Redis-Session-Cache-Bruch

**Bedrohung:** Ein Angreifer erhält Zugriff auf Redis und kann Session-Daten manipulieren oder stehlen.

**Gegenmaßnahme:**
- Redis ist in Docker/Kubernetes nur über interne Netzwerke erreichbar, nicht öffentlich exponiert
- Redis ist nicht auf der öffentlichen IP-Adresse konfiguriert
- Session-Daten werden server-seitig in Redis gespeichert, aber Session-IDs sind kryptographisch sicher und nicht vorhersehbar
- Sessions haben automatische TTL (Time-To-Live) und Timeouts
- Session-IDs können nicht einfach manipuliert werden, da sie nur als zufällige Referenzen gespeichert werden
- Die Session-ID ist nur eine zufällige 256-Bit-Zahl, die auf Server-Seite validiert wird

---

#### 2.4.1.4. Branch 4: Supply Chain Attack
##### 2.4.1.4.1. Dependency-Poisoning

**Bedrohung:** Ein Angreifer kompromittiert eine Dependency, die das Projekt verwendet, mit bösartigem Code.

**Gegenmaßnahme:**
- Go: `go.mod` und `go.sum` sind versionskontrolliert
  - `go.sum` enthält automatisch Checksummen für alle Dependencies
  - Genau spezifizierte Versionen werden verwendet (keine `^` oder `~`)
- npm: `package-lock.json` ist versionskontrolliert
  - `package-lock.json` enthält Integrität-Checksummen für alle Dependencies
- Dependencies werden nur aus vertrauenswürdigen Quellen bezogen (pkg.go.dev, npm.org, Maven Central)
- Änderungen an Checksummen in `go.sum` oder `package-lock.json` werden sofort bemerkt

##### 2.4.1.4.2. Kompromittiertes Docker-Base-Image

**Bedrohung:** Das Docker-Base-Image enthält Malware, Backdoors oder Anfälligkeit.

**Implementierte Gegenmaßnahme:**
- Base-Images werden nur von vertrauenswürdigen Quellen bezogen (Docker Hub Official Images)
- In `backend/Dockerfile` und `frontend/Dockerfile` werden spezifische Image-Versionen verwendet, nicht `latest`
- Beispiele aus den Dockerfiles:
  - Backend: Go Official Image mit spezifischer Version (z.B. `golang:1.21`)
  - Frontend: Node Official Image mit spezifischer Version (z.B. `node:20`)
- Minimale Base-Images reduzieren die Attack-Surface
- Secrets werden nicht im Dockerfile oder Image eingebunden, sondern über Environment-Variablen injiziert
- Nur notwendige Dependencies werden installiert (keine zusätzliche Software)

**Fazit:** Durch das Zero-Knowledge-Design ist das Backend selbst kein "Single Point of Failure" für die Vertraulichkeit der gespeicherten Daten, solange der Client-Code vertrauenswürdig bleibt. Der kritische Pfad verlagert sich auf die Integrität der Frontend-Auslieferung (Supply Chain Attack).
