# STRIDE-Analyse Audit Report
## Security by Design - Password Manager Projekt

**Datum:** 14. Dezember 2025  
**Status:** Detaillierte Überprüfung durchgeführt  
**Analystin:** Security Review

---

## Inhaltsverzeichnis
1. [Executive Summary](#executive-summary)
2. [Konsistenz der Threats (STRIDE-Kategorien)](#konsistenz-der-threats)
3. [Fehlende/Unvollständige Dokumentation](#fehlende-unvollständige-dokumentation)
4. [Implementierungsstatus Überprüfung](#implementierungsstatus-überprüfung)
5. [Offene Risiken & Reklassifizierung](#offene-risiken--reklassifizierung)
6. [Neue Threats (Nicht dokumentiert)](#neue-threats-nicht-dokumentiert)
7. [Detaillierte Verbesserungen](#detaillierte-verbesserungen)
8. [Priorisierte Handlungsempfehlungen](#priorisierte-handlungsempfehlungen)

---

## Executive Summary

Die STRIDE-Analyse in der Dokumentation ist **grundsätzlich solide**, aber es gibt **signifikante Diskrepanzen zwischen Dokumentation und tatsächlicher Implementierung** sowie **mehrere fehlende oder unvollständig dokumentierte Threats**. 

### Kritische Erkenntnisse:
- ✅ **Rate Limiting:** IMPLEMENTIERT (dokumentiert als "Offen") - gehört reklassifiziert
- ✅ **CSRF Protection:** IMPLEMENTIERT mit Token-basiertem System (dokumentiert als "Teilweise")
- ✅ **Input Validation:** TEILWEISE implementiert (Passwortlängen, Email-Format, Nonce-Format)
- ⚠️ **Redis Memory Management:** OFFEN - `maxmemory` und Eviction Policy fehlen komplett
- ⚠️ **Request Size Limits:** NICHT IMPLEMENTIERT - kritisches DoS-Risiko
- ⚠️ **Race Conditions:** NICHT DOKUMENTIERT - Concurrency Issues möglich
- ⚠️ **Timeout-Konfiguration:** MINIMAL - nur Graceful Shutdown (5s)

---

## Konsistenz der Threats

### 1. Frontend SPA (React)

#### Spoofing (Phishing/UI Redressing)
- **Dokumentiert:** "Extern (User)"
- **Status:** ✅ KORREKT
- **Kommentar:** User-Education ist außerhalb des Scopes, aber technisch unterstützt

#### Tampering (XSS)
- **Dokumentiert:** "Teilweise (React Default aktiv, CSP/SRI fehlen)"
- **Status:** ⚠️ **KORREKT ABER UNVOLLSTÄNDIG**
- **Befunde:**
  - React Escaping: ✅ Implementiert (Standard)
  - CSP Headers: ❌ NICHT GEFUNDEN
  - SRI: ❌ NICHT GEFUNDEN
  - `dangerouslySetInnerHTML`: ❌ Wird nicht genutzt (GUTES ZEICHEN)

#### Tampering (Client-Code Manipulation)
- **Dokumentiert:** "Implementiert (TLS)"
- **Status:** ✅ KORREKT
- **Befunde:** HTTPS wird erzwungen

#### Information Disclosure (Unsichere Secrets)
- **Dokumentiert:** "Implementiert (Memory-only Design)"
- **Status:** ✅ KORREKT & VERIFIZIERT
- **Befunde:** 
  - Master-Passwort wird NICHT in localStorage gespeichert
  - Frontend-Crypto: `600.000 PBKDF2-Iterationen` (sehr sicher)
  - Secrets werden im RAM gehalten und bei Logout/Reload gelöscht

#### Information Disclosure (Cache/History)
- **Dokumentiert:** "Implementiert"
- **Status:** ✅ KORREKT
- **Befunde:** POST-Requests für sensible Daten

#### DoS (Client-Side Resource Exhaustion)
- **Dokumentiert:** "Offen"
- **Status:** ⚠️ **BLEIBT OFFEN** - keine Validierung gefunden
- **Fehlende Validierung:** Keine Checks für PBKDF2-Parameter-Grenzen (`iterations` limit)

#### Elevation of Privilege (CSRF)
- **Dokumentiert:** "Teilweise (`SameSite` Cookies genutzt)"
- **Status:** ⚠️ **REKLASSIFIZIERUNG EMPFOHLEN: "IMPLEMENTIERT"**
- **Befunde:**
  - ✅ `SameSite` Cookie-Attribute: Implementiert
  - ✅ CSRF Token-basiertes System: Implementiert (`X-CSRF-Token` Header)
  - Frontend ruft Token via `GET /api/auth/csrf` ab
  - Alle State-Changing Operations erfordern Token

---

### 2. Backend API (Go)

#### Spoofing (Service Impersonation)
- **Dokumentiert:** "Implementiert"
- **Status:** ✅ KORREKT
- **Befunde:** TLS-Zertifikate + HSTS konfiguriert

#### Tampering (Supply Chain)
- **Dokumentiert:** "Teilweise (`go.sum` vorhanden)"
- **Status:** ✅ KORREKT
- **Befunde:**
  - `go.sum`: Checksummen für alle Dependencies ✅
  - `package-lock.json`: Versionskontrolliert ✅
  - Distroless Images: Wird genutzt (Base-Images spezifisch versioniert) ✅

#### Repudiation (Insufficient Logging)
- **Dokumentiert:** "Implementiert (Audit-Service)"
- **Status:** ✅ KORREKT & VERIFIZIERT
- **Befunde:**
  - Zap Logger in Production-Mode
  - Strukturiertes Audit-Logging für Sicherheitsvorfälle
  - IP, User-Agent, Timestamp werden aufgezeichnet

#### Information Disclosure (Error Handling)
- **Dokumentiert:** "Implementiert"
- **Status:** ✅ KORREKT
- **Befunde:** Generische Fehlermeldungen im Response, detailliert nur in Logs

#### DoS (Resource Exhaustion)
- **Dokumentiert:** "Offen (Rate Limiting fehlt)"
- **Status:** ❌ **DOKUMENTATION IST FALSCH - SOLLTE "IMPLEMENTIERT" SEIN**
- **Befunde:**
  ```go
  // Global Rate Limiting
  router.Use(middleware.RateLimitMiddleware(redisClient, 
    cfg.RateLimit.RequestsPerMinute, "limiter_global"))
  
  // Auth-Endpoint spezifischer Limit
  router.Use(middleware.StrictRateLimitMiddleware(redisClient, 
    cfg.RateLimit.AuthRequestsPerMinute, "limiter_auth"))
  ```
  - ✅ Global: Rate Limiting via Redis
  - ✅ Auth-Endpoints: Strikte Limits
  - ❌ ABER: **Request-Size Limits fehlen** (siehe Neue Threats)
  - ❌ **Read-Timeouts fehlen** auf HTTP Server

#### Elevation of Privilege (Broken Access Control - IDOR)
- **Dokumentiert:** "Implementiert"
- **Status:** ✅ KORREKT & VERIFIZIERT
- **Befunde:**
  ```go
  // Ownership Check vor jeder Operation
  owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), 
    vaultID, userID)
  if err != nil || !owns {
    c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
    return
  }
  ```
  - Konsistent in: `Get`, `Update`, `Delete` Operationen
  - Vault Entries: Zusätzliche Validierung der Vault-Ownership

---

### 3. PostgreSQL Datenbank

#### Spoofing (Unauthorized Access)
- **Dokumentiert:** "Implementiert (Docker Network)"
- **Status:** ✅ KORREKT
- **Befunde:** Docker Network Isolation + Non-Root User (User 10001)

#### Tampering (Data Corruption)
- **Dokumentiert:** "Offen (Backup-Strategie fehlt)"
- **Status:** ⚠️ **KORREKT - BLEIBT OFFEN**
- **Befunde:** Keine Backup-Strategie implementiert

#### Repudiation (Admin Activity Hiding)
- **Dokumentiert:** "Akzeptiert (Vertrauen in Admin)"
- **Status:** ✅ AKZEPTABEL für MVP
- **Befunde:** Keine Remote-Logging-Konfiguration

#### Information Disclosure (Data at Rest)
- **Dokumentiert:** "Implementiert (Zero-Knowledge)"
- **Status:** ✅ KORREKT
- **Befunde:** 
  - Zero-Knowledge Architektur: Backend speichert nur Ciphertext
  - ✅ Keine Plain-Text-Passwörter in der DB
  - ✅ User-Passwörter: Argon2id gehasht
  - ✅ MFA-Secrets: AES-GCM verschlüsselt

#### DoS (Connection Exhaustion)
- **Dokumentiert:** "Implementiert"
- **Status:** ✅ KORREKT
- **Befunde:**
  ```go
  // sqlx Connection Pooling konfiguriert
  // Standard: Max 25 Connections
  ```

#### Elevation of Privilege (Privilege Escalation)
- **Dokumentiert:** "Implementiert (Docker Best Practices)"
- **Status:** ✅ KORREKT
- **Befunde:**
  - Container Non-Root User: ✅ 10001
  - Read-Only Root Filesystem: ✅
  - Seccomp Profile: ✅ RuntimeDefault
  - Capabilities Drop: ✅ ALL

---

### 4. Redis Cache

#### Spoofing (Unauthorized Access)
- **Dokumentiert:** "Implementiert"
- **Status:** ⚠️ **TEILWEISE**
- **Befunde:**
  - Network Isolation: ✅
  - Redis Passwort-Authentifizierung: ⚠️ **NICHT GEFUNDEN IN YAML**
  - `requirepass`: ❌ Nicht konfiguriert
  - Protected Mode: Status unbekannt

#### Tampering (Session Manipulation)
- **Dokumentiert:** "Implementiert (Zugriffsschutz)"
- **Status:** ✅ KORREKT
- **Befunde:** Zugriffsschutz via Network Policy

#### Repudiation (Lack of Audit Trail)
- **Dokumentiert:** "Akzeptiert (Network Isolation + starkes PW)"
- **Status:** ⚠️ **INKONSISTENT - KEIN STARKES PASSWORT KONFIGURIERT**

#### Information Disclosure (Session Leakage)
- **Dokumentiert:** "Implementiert (Zugriffsschutz)"
- **Status:** ✅ KORREKT

#### DoS (Memory Exhaustion)
- **Dokumentiert:** "Offen"
- **Status:** ❌ **BESTÄTIGT OFFEN**
- **Befunde:**
  - `maxmemory`: ❌ NICHT konfiguriert
  - `maxmemory-policy`: ❌ NICHT konfiguriert
  - **KRITISCHES RISIKO:** Redis kann OOM (Out of Memory) Fehler werfen
  - Sessions könnten unerwartet gelöscht werden unter Last

#### Elevation of Privilege (Container Escape)
- **Dokumentiert:** "Implementiert (Docker)"
- **Status:** ✅ KORREKT
- **Befunde:** Non-Root, Seccomp, Capabilities Drop

---

### 5. Datenfluss: User -> Frontend (Input)

| Threat | Status | Befund |
|--------|--------|--------|
| Spoofing (Impersonation) | ✅ Implementiert | Auto-Logout bei Inaktivität implementiert |
| Tampering (Keylogging) | ✅ Implementiert | MFA schützt vor fremdem Device-Zugriff |
| Repudiation | ✅ Implementiert | Confirmation Modals bei kritischen Aktionen |
| Information Disclosure | ✅ Implementiert | Passwort-Feld gemaskiert |
| DoS | ✅ Extern | Außerhalb der Kontrolle |
| Elevation of Privilege | ✅ Akzeptiert | A11y-APIs notwendig für Barrierefreiheit |

---

### 6. Datenfluss: Frontend -> Backend (HTTPS)

| Threat | Status | Befund |
|--------|--------|--------|
| Spoofing (MitM) | ✅ Implementiert | TLS 1.2/1.3 |
| Tampering (Replay) | ✅ Implementiert | TLS verhindert auf Netzwerkebene |
| Repudiation | ✅ Akzeptiert | Risiko minimiert durch Session-Schutz |
| Information Disclosure | ✅ Implementiert | HTTPS Everywhere + HSTS |
| DoS | ✅ Extern | Infrastructure-Level |
| Elevation of Privilege | ✅ Implementiert | TLS + Serverseitige Validierung |

---

### 7. Datenfluss: Backend -> PostgreSQL (SQL)

| Threat | Status | Befund |
|--------|--------|--------|
| Spoofing | ✅ Implementiert | mTLS + Passwort-Auth |
| Tampering (SQLi) | ✅ Implementiert | Prepared Statements via `sqlx` |
| Repudiation | ✅ Implementiert | WAL + Audit-Logs |
| Information Disclosure | ✅ Implementiert | Zero-Knowledge (Daten verschlüsselt) |
| DoS (Slow Queries) | ⚠️ Teilweise | Indizes gesetzt, aber keine Query-Timeouts |
| Elevation of Privilege (SQLi) | ✅ Implementiert | Prepared Statements |

---

### 8. Datenfluss: Backend -> Redis (Internal)

| Threat | Status | Befund |
|--------|--------|--------|
| Spoofing (MitM) | ⚠️ Teilweise | Network Policies ja, aber kein Redis-Passwort |
| Tampering (Command Injection) | ✅ Implementiert | Typsicherer Redis-Client |
| Repudiation | ✅ Akzeptiert | Performance-Tradeoff |
| Information Disclosure | ✅ Akzeptiert | Network Isolation |
| DoS (Connection Flooding) | ✅ Implementiert | Connection Pooling |
| Elevation of Privilege (Lua) | ❌ Offen | `EVAL` kann noch genutzt werden |

---

## Fehlende/Unvollständige Dokumentation

### 1. **Input Validation - FEHLENDE DOKUMENTATION**

#### Dokumentiert:
- Passwort-LängenvConstraint: `min=12, max=128`
- Email-Format: `binding:"required,email"`

#### NICHT dokumentiert aber implementiert:
- **Nonce-Format Validation:** `len=24` (Hex-encoded 12 bytes)
  ```go
  type VaultEntryCreateRequest struct {
    Nonce string `json:"nonce" binding:"required,len=24"`
  }
  ```
  
#### FEHLENDE Input-Validierungen:
1. **Vault Name Längengrenzen:** 
   - NICHT in Modelle dokumentiert
   - KEINE MAX-Längenbegrenzung in Code gefunden
   - **RISIKO:** Könnte zu großen Strings führen

2. **Encrypted Data Längengrenzen:**
   - KEINE Validierung auf maximale Größe
   - **RISIKO:** Könnte zu großen Payloads führen (DoS)

3. **Email-Länge Limitierung:**
   - EMAIL kann bis zu 255 Zeichen sein (erlaubt)
   - **Aber:** Keine MIN-Längenbegrenzung
   - RFC 5321 Minimum: 3 Zeichen

### 2. **Output Validation - NICHT DOKUMENTIERT**

#### Gefunden:
- Vault Entries werden als Hex-kodierte Strings zurückgegeben
- Nonces werden als Hex-Strings kodiert

#### Fehlend:
- **Keine JSON-Size-Limits** im Response
- **Keine Pagination** für Entry-Listings
- **RISIKO:** Großer Response könnte Clients überlasten

### 3. **Session Management - FEHLENDE DETAILS**

#### Dokumentiert:
- Auto-Logout bei Inaktivität: ✅

#### NICHT dokumentiert:
- Session-ID-Format (vermutlich 256-Bit UUID)
- CSRF Token-Generation Details (Server-seitig oder per Request?)
- Session-Concurrency-Limits (kann ein User mehrere Sessions haben?)

### 4. **Error Message Consistency - NICHT DOKUMENTIERT**

#### Gefunden:
- Authentifizierungsfehler: Generische "unauthorized" Messages
- Autorisierungsfehler: Generische "access denied" Messages
- **ABER:** Keine Dokumentation zu Error-Codes

#### FEHLEND:
- Dokumentierter Error-Response-Format
- HTTP Status Codes nicht in STRIDE dokumentiert

### 5. **Database-Level Constraints - TEILWEISE DOKUMENTIERT**

#### Dokumentiert in Code:
- Email UNIQUE Constraint: ✅
- Foreign Key Cascade Deletes: ✅
- Nonce-Längenbeschränkung: `CHECK (octet_length(nonce) = 12)` ✅
- Salt-Längenbeschränkung: `CHECK (octet_length(encryption_salt) = 32)` ✅

#### NICHT in STRIDE dokumentiert:
- Die Existence dieser Constraints
- Wie sie Tamper-Protection bieten

---

## Implementierungsstatus Überprüfung

### Rate Limiting - **DOKUMENTATIONSFEHLER**

| Aspekt | Dokumentiert | Implementiert | Befund |
|--------|--------------|---------------|--------|
| Global Rate Limit | ❌ "Offen" | ✅ JA | **SOLLTE "IMPLEMENTIERT" SEIN** |
| Auth Rate Limit | ❌ "Offen" | ✅ JA (strikte Limits) | **SOLLTE "IMPLEMENTIERT" SEIN** |
| Redis-basiert | ❌ Nicht erwähnt | ✅ JA | Perfekt für verteilte Systeme |
| Konfigurierbar | ✅ | ✅ JA | Über `cfg.RateLimit.*` |

**Code-Referenz:**
```go
// Global middleware
router.Use(middleware.RateLimitMiddleware(redisClient, 
  cfg.RateLimit.RequestsPerMinute, "limiter_global"))

// Auth spezifisch
auth.Use(middleware.StrictRateLimitMiddleware(redisClient, 
  cfg.RateLimit.AuthRequestsPerMinute, "limiter_auth"))
```

**EMPFEHLUNG:** 
- Dokumentation aktualisieren: Status zu "Implementiert" ändern
- Raten konfigurierbar machen (schon der Fall!)
- Beispiel-Konfiguration dokumentieren

---

### CSRF Protection - **TEILWEISE DOKUMENTATION UNGENAU**

| Aspekt | Dokumentiert | Implementiert | Befund |
|--------|--------------|---------------|--------|
| SameSite Cookies | ✅ JA | ✅ JA | Moderne Browser-Schutz |
| Anti-CSRF Tokens | ⚠️ "Für V2 geplant" | ✅ **JA - BEREITS IMPLEMENTIERT** | **DOKUMENTATION VERALTET** |
| Token im Header | ❌ Nicht erwähnt | ✅ JA (`X-CSRF-Token`) | |
| GET-Requests exempt | ✅ Beschrieben | ✅ JA | |

**Code-Referenz:**
```go
// CSRFMiddleware checks for valid CSRF token in headers
clientToken := c.GetHeader("X-CSRF-Token")
if clientToken == "" {
  c.JSON(http.StatusForbidden, gin.H{"error": "CSRF token missing"})
  c.Abort()
  return
}
```

**Token-Abruf:**
```
GET /api/auth/csrf -> returns { csrf_token: "..." }
```

**EMPFEHLUNG:**
- Dokumentation aktualisieren: "Teilweise" zu "Implementiert" ändern
- Token-Lebensdauer dokumentieren
- Token-Invalidierungsstrategie dokumentieren

---

### Redis Memory Management - **KRITISCH OFFEN**

| Aspekt | Konfiguriert | Kritikalität | Status |
|--------|--------------|--------------|--------|
| `maxmemory` | ❌ NEIN | 🔴 KRITISCH | OOM möglich |
| `maxmemory-policy` | ❌ NEIN | 🔴 KRITISCH | Sessions können gelöscht werden |
| `requirepass` | ❌ NEIN | 🔴 KRITISCH | Unauthentifizierte Zugriffe möglich |
| Connection Limits | ✅ JA (implizit via Connection Pool) | ⚠️ MITTEL | Aber nicht in Redis-Config |

**Gefundene Redis-Konfiguration (kubernetes/02-data.yaml):**
```yaml
command: ["redis-server", "--appendonly", "yes"]
# KEINE --maxmemory Parameter
# KEINE --requirepass Parameter
```

**KRITISCHE PROBLEME:**

1. **Memory Exhaustion (DoS):**
   - Ein User könnte absichtlich Millionen Fake-Sessions erzeugen
   - Redis würde OOM werfen und abstürzen
   - Alle Benutzer würden ausgeloggt

2. **Unauthorized Access:**
   - Jeder im Kubernetes-Cluster kann sich mit Redis verbinden
   - Keine Authentifizierung auf Redis-Ebene
   - Network Policy schützt nur vor Pod-External-Attacken

3. **Session Deletion unter Last:**
   - Ohne Eviction Policy werden Session-IDs einfach überschrieben
   - Benutzer werden unerwartet ausgeloggt

---

### Request Size Limits - **NICHT IMPLEMENTIERT (DoS-RISIKO)**

| Parameter | Status | Befund |
|-----------|--------|--------|
| Max Request Body Size | ❌ NICHT GESETZT | ⚠️ KEINE LIMITS |
| Max Header Size | ❌ NICHT GESETZT | ⚠️ KEINE LIMITS |
| Read Timeout | ❌ NICHT GESETZT | ⚠️ KANN HÄNGEN BLEIBEN |
| Write Timeout | ❌ NICHT GESETZT | ⚠️ KANN HÄNGEN BLEIBEN |

**Code (backend/cmd/api/main.go):**
```go
srv := &http.Server{
  Addr:    addr,
  Handler: router,
  // FEHLEN: ReadTimeout, WriteTimeout, MaxHeaderBytes
}
```

**DoS-SZENARIO:**
1. Angreifer sendet 1 GB POST mit `encrypted_data`
2. Server versucht, alles in RAM zu buffern
3. Server läuft OOM oder blockiert

---

## Offene Risiken & Reklassifizierung

### 1. **Rate Limiting: "Offen" → "Implementiert"** ✅

**Befunde:**
- ✅ Global Rate Limiting via Redis
- ✅ Auth-Endpoint spezifische Limits
- ✅ Konfigurierbar
- ✅ Ulule Limiter Framework

**Reklassifizierung:** ✅ EMPFOHLEN  
**Dokumentation sollte lesen:** "Implementiert"

---

### 2. **CSRF: "Teilweise" → "Implementiert"** ✅

**Befunde:**
- ✅ Token-basiertes System (nicht nur SameSite)
- ✅ Frontend ruft Token ab
- ✅ X-CSRF-Token Header wird validiert
- ✅ Alle State-Changing Operations geschützt

**Reklassifizierung:** ✅ EMPFOHLEN  
**Dokumentation sollte lesen:** "Implementiert"  
**Zusatz:** "Token-basierte Validierung + SameSite Cookies (Defense-in-Depth)"

---

### 3. **Client-Side DoS: "Offen" → "BLEIBT OFFEN"** ⚠️

**Grund:** Keine Validierung der PBKDF2-Iterationen auf Client gefunden

**Befund:** Frontend nutzt hardcodierte 600.000 Iterationen:
```javascript
iterations: 600000,
```

**ABER:** Keine Server-seitige Überprüfung auf Client-Anfragen

**Status:** Bleibt Offen, da:
- Benutzer das Frontend-Code nicht modifizieren sollte
- DoS-Risiko für einzelnen Client, nicht für Server
- Akzeptabel als "Benutzer trägt Verantwortung"

---

### 4. **Redis Memory: "Offen" → "MUSS IMPLEMENTIERT WERDEN"** 🔴

**Reklassifizierung:** NICHT OPTIONAL  
**Priorität:** 🔴 KRITISCH (vor Production)

**Notwendige Maßnahmen:**
```bash
# In Redis-Konfiguration hinzufügen:
redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
redis-server --requirepass "<STRONG_PASSWORD>"
```

---

### 5. **Request Size Limits: "Offen" → "MUSS IMPLEMENTIERT WERDEN"** 🔴

**Reklassifizierung:** NICHT OPTIONAL  
**Priorität:** 🔴 KRITISCH (vor Production)

**Notwendige Maßnahmen:**
```go
srv := &http.Server{
  Addr:           addr,
  Handler:        router,
  ReadTimeout:    15 * time.Second,
  WriteTimeout:   15 * time.Second,
  IdleTimeout:    60 * time.Second,
  MaxHeaderBytes: 1 << 20,  // 1 MB
}

// Zusätzlich: Gin MaxMultipartMemory
router.MaxMultipartMemory = 8 << 20  // 8 MB
```

---

### 6. **SQL Slow Query DoS: "Teilweise" → "TEILWEISE BLEIBT"** ⚠️

**Dokumentiert:** "Teilweise (DB-Indizes auf Fremdschlüsseln und Suchfeldern gesetzt)"

**Befunde:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vaults_user_id ON vaults(user_id);
CREATE INDEX idx_vault_entries_vault_id ON vault_entries(vault_id);
CREATE INDEX idx_mfa_secrets_user_id ON mfa_secrets(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**ABER FEHLEND:**
- Keine Query Timeouts im Backend
- Keine `EXPLAIN ANALYZE` Dokumentation
- Audit-Log-Partitionierung nicht implementiert

**Status bleibt:** "Teilweise" - Indizes vorhanden, aber Monitoring/Optimization fehlen

---

## Neue Threats (Nicht dokumentiert)

### 1. 🔴 **Request Size DoS (Backend)**

**STRIDE-Kategorie:** Denial of Service

**Bedrohung:**  
Ein Angreifer kann beliebig große Payloads senden und den Server zum OOM bringen.

**Beispiel-Angriff:**
```bash
curl -X POST http://api/vaults/abc/entries \
  -H "Content-Type: application/json" \
  -d '{"encrypted_data": "'"$(printf 'a%.0s' {1..1000000000})"'", 
       "nonce": "123456789012345678901234"}'
```

**Auswirkung:**  
- Server läuft OOM
- Alle Benutzer werden aus Sessions geworfen
- Authentifizierung fehlgeschlagen

**Gegenmaßnahme (FEHLEND):**
```go
router.MaxMultipartMemory = 8 << 20  // 8 MB max
// Und HTTP-Server-Level Limits
```

**Status:** ❌ **NICHT IMPLEMENTIERT - MUSS BEHOBEN WERDEN**

---

### 2. 🟡 **Race Conditions bei gleichzeitigen Operationen (Backend)**

**STRIDE-Kategorie:** Tampering / Elevation of Privilege

**Bedrohung:**  
Bei gleichzeitigen Requests auf dieselbe Ressource können Data-Races auftreten.

**Beispiel-Szenario:**
```
Request 1: UPDATE vaults SET name = 'Hacked' WHERE id = '123' AND user_id = '456'
Request 2: DELETE FROM vaults WHERE id = '123' AND user_id = '456'
```

Wenn beide quasi-gleichzeitig ausgeführt werden, könnte es zu:
- Dirty Reads kommen
- Inkonsistentem Status führen

**Gefundene Risiken:**
1. **Vault Update + Delete:**
   ```go
   // Keine Transaction Lock beim Update
   if err := h.vaultRepo.Update(c.Request.Context(), vaultID, req.Name)
   ```

2. **Session Invalidation Race:**
   - Session Check (Redis) → User-Action → Session wird gelöscht
   - Zwischen Check und Action könnte Session ungültig werden

3. **MFA Disabling Race:**
   ```go
   // Keine Transactional Consistency bei MFA-Operationen
   ```

**Gegenmaßnahme (FEHLEND):**
- Database-Level Locks
- Optimistic Concurrency Control (Version-Feld)
- Transactional Consistency mit `BEGIN ... COMMIT`

**Status:** ⚠️ **NICHT DOKUMENTIERT - RISIKO MEDIUM**

---

### 3. 🟡 **API Response Information Disclosure (Backend)**

**STRIDE-Kategorie:** Information Disclosure

**Bedrohung:**  
Unterschiedliche Error-Messages können zur Benutzerenumeration führen.

**Beispiel:**
```
POST /api/auth/login
Body: {"email": "alice@example.com", "password": "wrong"}

Response Option 1: "invalid credentials" (User könnte existieren)
Response Option 2: "email not found" (User existiert nicht)
```

**Gefundene Probleme:**
```go
// In auth_handler.go
if user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email); err != nil {
  // Message ist intentional generisch ("invalid credentials")
  c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
  // ABER: Code unterscheidet zwischen "user not found" und anderen Fehlern
}
```

**Gegenmaßnahme (VORHANDEN):**
- ✅ Generische "invalid credentials" Message
- ✅ Unterschiedliche Audit-Logs intern

**Status:** ✅ **KORREKT IMPLEMENTIERT - NICHT DOKUMENTIERT**

---

### 4. 🟡 **JWT/Token Leakage in Logs (Audit-Logging)**

**STRIDE-Kategorie:** Information Disclosure

**Bedrohung:**  
Session-IDs oder CSRF-Tokens könnten in Logs landen.

**Gefundene Analyse:**
```go
// In middleware/logging.go oder audit_repo.go
// Werden Session-IDs in Logs geschrieben?
// Werden CSRF-Tokens in Logs geschrieben?
```

**Befund:**  
- Audit-Logs speichern: `user_id`, `action`, `ip_address`, `user_agent`
- ✅ Session-ID wird NICHT geloggt
- ✅ CSRF-Token wird NICHT geloggt
- ✅ Password-Hashes werden NICHT geloggt

**Status:** ✅ **KORREKT IMPLEMENTIERT - NICHT DOKUMENTIERT**

---

### 5. 🟡 **Redis Eviction & Session Loss (Infrastructure)**

**STRIDE-Kategorie:** Denial of Service / Repudiation

**Bedrohung:**  
Ohne konfigurierte Eviction-Policy können valide Sessions gelöscht werden.

**Szenario:**
1. Redis füllt sich mit Sessions
2. Redis läuft aus Memory
3. Redis wählt zufällig Sessions zum Löschen (LRU)
4. Legale Benutzer werden ausgeloggt

**Impact:**
- User müssen sich neu anmelden
- Incomplete Operations gehen verloren
- Poor User Experience

**Gegenmaßnahme (FEHLEND):**
```yaml
command: ["redis-server", 
  "--maxmemory", "256mb",
  "--maxmemory-policy", "allkeys-lru",  # oder volatile-lru
  "--requirepass", "$REDIS_PASSWORD"]
```

**Status:** 🔴 **NICHT KONFIGURIERT - CRITICAL BEFORE PRODUCTION**

---

### 6. 🟡 **Privilege Escalation via MFA Bypass (Backend)**

**STRIDE-Kategorie:** Elevation of Privilege

**Bedrohung:**  
Wenn MFA-Verify fehlschlägt, kann ein Angreifer brute-force die MFA-Codes versuchen.

**Gefundene Code-Stellen:**
```go
// auth_handler.go - VerifyMFA
valid := totp.Validate(req.Code, string(secretBytes))
if !valid {
  c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid mfa code"})
  return
}
```

**Probleme:**
1. **Keine MFA-Attempt-Limits dokumentiert**
2. **Keine Backoff-Strategie**
3. **Rate Limiting auf Auth-Endpoint schützt, aber:**
   - Multiple Accounts testen möglich
   - Keine Account-spezifischen Limits

**Gegenmaßnahme (TEILWEISE):**
- ✅ Auth-Endpoint Rate Limiting existiert
- ❌ MFA-Attempt spezifische Limits fehlen
- ❌ Account-Lockout nach X failed Attempts fehlt

**Status:** ⚠️ **TEILWEISE GESCHÜTZT - NICHT DOKUMENTIERT**

---

### 7. 🟡 **Audit Log Tampering (Database Level)**

**STRIDE-Kategorie:** Repudiation

**Bedrohung:**  
Wenn jemand Datenbankzugriff hat, können Audit-Logs gelöscht werden.

**Gefundene Audit-Log-Implementierung:**
```sql
-- Note: This is an append-only table. No UPDATE or DELETE 
-- operations should be performed.
```

**ABER:**
```
Diese Notiz ist NICHT als Constraint implementiert!
```

**Gegenmaßnahme (FEHLEND):**
```sql
-- Option 1: PostgreSQL Immutable Table (PostgreSQL 15+)
ALTER TABLE audit_logs SET (append_only = on);

-- Option 2: Trigger zum Verhindern von Deletes/Updates
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'Audit logs are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();
```

**Status:** 🟡 **DOKUMENTIERT ABER NICHT ERZWUNGEN - SOLLTE BEHOBEN WERDEN**

---

### 8. 🟡 **Input Validation: Vault Name Length (Backend)**

**STRIDE-Kategorie:** Denial of Service / Tampering

**Bedrohung:**  
Kein Längenlimit auf Vault-Namen könnte zu extremem DB-Speicherverbrauch führen.

**Befund:**
```go
type VaultCreateRequest struct {
  Name string `json:"name" binding:"required"` // KEINE MAX-Länge!
}
```

**Risiko:**
- User erstellt Vault mit 10 MB Name
- Name wird in Database gespeichert
- DB-Speicher wird verschwendet

**Gegenmaßnahme (FEHLEND):**
```go
type VaultCreateRequest struct {
  Name string `json:"name" binding:"required,max=255"`
}
```

**Status:** 🟡 **NICHT VALIDIERT - SOLLTE BEHOBEN WERDEN**

---

### 9. 🟡 **CSP Header Fehlt (Frontend)**

**STRIDE-Kategorie:** Tampering (XSS)

**Bedrohung:**  
Ohne Content-Security-Policy können Inline-Scripts injiziert werden.

**Gefundene Konfiguration:**
- ✅ React Escaping vorhanden
- ✅ Kein dangerouslySetInnerHTML
- ❌ **CSP Header NICHT GESETZT**

**Beispiel CSP, der empfohlen wird:**
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' <API_DOMAIN>;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

**Status:** 🟡 **NICHT IMPLEMENTIERT - ABER OPTIONAL (MVP)**

---

### 10. 🔴 **API Route Listing/Discovery (Information Disclosure)**

**STRIDE-Kategorie:** Information Disclosure

**Bedrohung:**  
Die Swagger API-Dokumentation ist öffentlich zugänglich.

**Gefundener Endpoint:**
```go
router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
```

**Problem:**
- `GET /swagger/` zeigt alle Endpoints
- `GET /swagger/swagger.json` zeigt OpenAPI-Schema
- Ein Angreifer sieht alle API-Endpoints ohne Authentifizierung

**Beispiel Ausgabe (öffentlich sichtbar):**
```json
{
  "paths": {
    "/api/auth/register": {...},
    "/api/auth/login": {...},
    "/api/vaults": {...},
    ...
  }
}
```

**Gegenmaßnahme (SOLLTE HINZUGEFÜGT WERDEN):**
```go
// Nur in Development-Modus exponieren
if cfg.IsDevelopment() {
  router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
```

**Status:** 🟡 **SUBOPTIMAL - SOLLTE PRODUCTION-MODE SCHÜTZEN**

---

## Detaillierte Verbesserungen

### 🔴 KRITISCH (Vor Production)

#### 1. Redis Memory Management

**Datei zu ändern:** `infrastructure/02-data.yaml`

**Änderung:**
```yaml
# VOR:
command: ["redis-server", "--appendonly", "yes"]

# NACH:
command: [
  "redis-server",
  "--appendonly", "yes",
  "--maxmemory", "256mb",
  "--maxmemory-policy", "allkeys-lru",
  "--requirepass", "$(REDIS_PASSWORD)"
]
```

**Zusätzlich in Secret hinzufügen:**
```yaml
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: pwmanager-secrets
      key: REDIS_PASSWORD
```

**Begründung:**
- Verhindert OOM-Crashes
- Schützt vor Unauthorized Access
- Verhindert unerwartete Session-Deletionen

---

#### 2. HTTP Server Timeouts & Request Size Limits

**Datei zu ändern:** `backend/cmd/api/main.go`

**Änderung (Zeilen ~280-290):**

```go
// VOR:
srv := &http.Server{
  Addr:    addr,
  Handler: router,
}

// NACH:
srv := &http.Server{
  Addr:           addr,
  Handler:        router,
  ReadTimeout:    15 * time.Second,
  WriteTimeout:   15 * time.Second,
  IdleTimeout:    60 * time.Second,
  MaxHeaderBytes: 1 << 20,  // 1 MB max headers
}

// Gin MaxMultipartMemory setzen
router.MaxMultipartMemory = 8 << 20  // 8 MB
```

**Begründung:**
- Verhindert Slow-HTTP-DoS
- Begrenzt Payload-Größe
- Verhindert Connection-Hanging

---

#### 3. Input Validation für Vault Names

**Datei zu ändern:** `backend/internal/models/vault.go`

**Änderung:**
```go
// VOR:
type VaultCreateRequest struct {
  Name string `json:"name" binding:"required"`
}

// NACH:
type VaultCreateRequest struct {
  Name string `json:"name" binding:"required,max=255"`
}

type VaultUpdateRequest struct {
  Name string `json:"name" binding:"required,max=255"`
}
```

**Begründung:**
- Verhindert DB-Speichererschöpfung
- Konsistent mit Email-Längenbeschränkung
- SQL-Spalte ist auch VARCHAR(255)

---

### 🟡 WICHTIG (Vor MVP-Release)

#### 4. Audit Log Immutability

**Datei zu ändern:** `backend/migrations/000005_create_audit_logs.up.sql`

**Änderung hinzufügen (am Ende):**
```sql
-- Prevent accidental or malicious tampering with audit logs
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_tampering();
```

**Und Down-Migration anpassen:**
```sql
-- In 000005_create_audit_logs.down.sql hinzufügen:
DROP TRIGGER IF EXISTS audit_log_immutable ON audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_log_tampering();
```

**Begründung:**
- Verhindert Audit-Log-Tampering auf DB-Ebene
- Dokumentierte "Append-only" Policy wird erzwungen

---

#### 5. MFA Attempt Rate Limiting

**Datei zu ändern:** `backend/internal/handlers/auth_handler.go`

**Zusätzliche Struktur:**
```go
// MFA-Attempt-Tracking hinzufügen
const (
  MaxMFAAttempts = 5
  MFALockoutDuration = 15 * time.Minute
)

// In VerifyMFA:
func (h *AuthHandler) VerifyMFA(c *gin.Context) {
  // ... existing code ...
  
  // NEW: Check MFA lockout
  lockoutKey := fmt.Sprintf("mfa_lockout:%s", user.ID.String())
  lockoutVal, err := h.redisClient.Get(c.Request.Context(), lockoutKey).Result()
  
  if err == nil && lockoutVal == "locked" {
    c.JSON(http.StatusTooManyRequests, gin.H{
      "error": "Too many MFA attempts. Try again later.",
    })
    return
  }
  
  // ... verify MFA code ...
  
  // If failed, increment attempt counter
  if !valid {
    attemptKey := fmt.Sprintf("mfa_attempts:%s", user.ID.String())
    attempts, _ := h.redisClient.Incr(c.Request.Context(), attemptKey).Result()
    
    if attempts >= MaxMFAAttempts {
      h.redisClient.Set(c.Request.Context(), lockoutKey, "locked", 
        MFALockoutDuration)
    } else {
      // Set expiry on attempts counter (e.g., 5 minutes)
      h.redisClient.Expire(c.Request.Context(), attemptKey, 5*time.Minute)
    }
    
    c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid mfa code"})
    return
  }
  
  // Clear attempts on success
  h.redisClient.Del(c.Request.Context(), 
    fmt.Sprintf("mfa_attempts:%s", user.ID.String()))
}
```

**Begründung:**
- Verhindert Brute-Force auf MFA
- Account wird nach 5 Fehlversuchen für 15 Min gesperrt
- Audit-Log möglich: "MFA lockout initiated"

---

#### 6. Swagger in Production-Modus deaktivieren

**Datei zu ändern:** `backend/cmd/api/main.go`

**Änderung (Nach der Gin-Router-Initialisierung):**
```go
// Swagger Documentation (nur in Entwicklung)
if cfg.IsDevelopment() {
  router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
  logger.Info("Swagger documentation available at /swagger/index.html")
} else {
  logger.Info("Swagger documentation disabled in production mode")
}
```

**Begründung:**
- Information Disclosure Reduktion in Production
- Development-Debugging in Dev-Umgebung möglich

---

#### 7. CSP Header im Frontend

**Datei zu ändern:** `backend/internal/middleware/` (neue Datei: `security_headers.go`)

**Hinzufügen:**
```go
package middleware

import "github.com/gin-gonic/gin"

// SecurityHeadersMiddleware adds security headers to all responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
  return func(c *gin.Context) {
    // Content Security Policy
    c.Header("Content-Security-Policy", 
      "default-src 'self'; "+
      "script-src 'self' 'wasm-unsafe-eval'; "+
      "style-src 'self' 'unsafe-inline'; "+
      "img-src 'self' data: https:; "+
      "font-src 'self' data:; "+
      "connect-src 'self' "+os.Getenv("API_DOMAIN")+"; "+
      "frame-ancestors 'none'; "+
      "base-uri 'self'; "+
      "form-action 'self'")
    
    // Other security headers
    c.Header("X-Content-Type-Options", "nosniff")
    c.Header("X-Frame-Options", "DENY")
    c.Header("X-XSS-Protection", "1; mode=block")
    c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
    
    c.Next()
  }
}
```

**Und in main.go einfügen:**
```go
router.Use(middleware.SecurityHeadersMiddleware())
```

**Begründung:**
- XSS-Schutz verstärken
- Clickjacking-Schutz
- HTTPS-Erzwingung

---

### 🟢 OPTIONAL (Für V2)

#### 8. Concurrency Control via Optimistic Locking

**Für Vault-Updates hinzufügen:**

Vault-Modell aktualisieren:
```go
type Vault struct {
  ID              uuid.UUID `db:"id"`
  UserID          uuid.UUID `db:"user_id"`
  Name            string    `db:"name"`
  EncryptionSalt  []byte    `db:"encryption_salt"`
  Version         int       `db:"version"`  // NEW: für Optimistic Lock
  CreatedAt       time.Time `db:"created_at"`
  UpdatedAt       time.Time `db:"updated_at"`
}
```

Dann in Repository-Update:
```go
func (r *VaultRepository) Update(ctx context.Context, id uuid.UUID, 
  name string, expectedVersion int) error {
  
  result, err := r.db.ExecContext(ctx,
    "UPDATE vaults SET name = $1, version = version + 1 "+
    "WHERE id = $2 AND version = $3",
    name, id, expectedVersion)
  
  rowsAffected, _ := result.RowsAffected()
  if rowsAffected == 0 {
    return ErrVersionMismatch  // Conflict
  }
  return nil
}
```

**Begründung:**
- Verhindert Race Conditions bei Updates
- ABER: Nicht notwendig für MVP (single-user vault seitig)

---

#### 9. Query Timeout Implementation

```go
// In Repository Layer:
const QueryTimeout = 5 * time.Second

func (r *VaultRepository) GetByID(ctx context.Context, id uuid.UUID) 
  (*Vault, error) {
  
  // Timeout context
  queryCtx, cancel := context.WithTimeout(ctx, QueryTimeout)
  defer cancel()
  
  // Execute query
  vault := &Vault{}
  err := r.db.GetContext(queryCtx, vault, 
    "SELECT * FROM vaults WHERE id = $1", id)
  
  if err == context.DeadlineExceeded {
    return nil, ErrQueryTimeout
  }
  
  return vault, err
}
```

**Begründung:**
- Verhindert Slow-Query-DoS
- Verhindert Query-Hanging

---

## Priorisierte Handlungsempfehlungen

### Priority 1: 🔴 KRITISCH (Unmittelbar)

| # | Maßnahme | Komponente | Aufwand | Impact |
|---|----------|-----------|---------|--------|
| 1 | Redis `maxmemory` + `maxmemory-policy` konfigurieren | Infrastructure | 15 min | 🔴 KRITISCH |
| 2 | HTTP Server Timeouts setzen | Backend | 15 min | 🔴 KRITISCH |
| 3 | Request Size Limits implementieren | Backend | 20 min | 🔴 KRITISCH |
| 4 | Redis Passwort-Auth konfigurieren | Infrastructure | 15 min | 🔴 KRITISCH |

**Summe:** ~1 Stunde  
**Muss vor Production-Deployment erfolgen**

---

### Priority 2: 🟡 WICHTIG (Vor Release)

| # | Maßnahme | Komponente | Aufwand | Impact |
|---|----------|-----------|---------|--------|
| 5 | Vault Name Length Validation | Backend | 10 min | 🟡 MEDIUM |
| 6 | Audit Log Immutability Trigger | Database | 20 min | 🟡 MEDIUM |
| 7 | MFA Attempt Rate Limiting | Backend | 45 min | 🟡 MEDIUM |
| 8 | Security Headers (CSP etc.) | Backend | 30 min | 🟡 MEDIUM |
| 9 | Swagger in Prod deaktivieren | Backend | 5 min | 🟡 MEDIUM |

**Summe:** ~2 Stunden  
**Sollte vor MVP-Release erfolgen**

---

### Priority 3: 🟢 OPTIONAL (V2)

| # | Maßnahme | Komponente | Aufwand | Impact |
|---|----------|-----------|---------|--------|
| 10 | Optimistic Locking für Race Conditions | Backend | 2 hours | 🟢 LOW (single-user) |
| 11 | Query Timeouts | Backend | 1 hour | 🟢 LOW (Monitoring besser) |
| 12 | Audit Log Encryption | Database | 2 hours | 🟢 LOW (Zero-Knowledge OK) |

---

## Reklassifizierung Summary

### Status-Änderungen in STRIDE-Analyse erforderlich:

| Threat | Aktuell | Neu | Grund |
|--------|---------|-----|-------|
| Backend DoS (Rate Limiting) | "Offen" | "Implementiert" | Rate Limiting ist aktiv via Redis |
| Frontend CSRF | "Teilweise" | "Implementiert" | Token-basiertes System bereits implementiert |
| Redis Memory | "Offen" | "OFFEN (KRITISCH)" | Muss sofort behoben werden |
| Request Size DoS | (nicht dokumentiert) | "Offen" | Fehlende Limits = kritisches Risiko |
| Audit Log Tampering | (nicht dokumentiert) | "Akzeptiert (mit Trigger)" | Kann durch DB-Trigger erzwungen werden |

---

## Zusammenfassung: Compliance-Status

### ✅ Gut dokumentiert und implementiert:
- Authentifizierung & Session Management
- Autorisierung (IDOR-Schutz)
- SQL Injection Prevention
- Zero-Knowledge Architektur
- Audit Logging
- HTTPS/TLS
- Password Hashing (Argon2id)
- MFA-Unterstützung

### ⚠️ Implementiert aber nicht dokumentiert:
- Rate Limiting
- CSRF-Token-System
- Input Validation (Nonce-Format)
- Security Error Handling

### 🔴 Nicht implementiert (KRITISCH):
- Redis Memory Limits
- Redis Authentication
- HTTP Server Timeouts
- Request Body Size Limits

### 🟡 Partiell implementiert:
- Query Optimization (Indizes da, aber kein Monitoring)
- MFA Brute-Force (nur Global Rate Limit, kein Account-Lockout)
- Concurrency Control (keine Optimistic Locks)

---

## Code-Referenzen

### Rate Limiting (jetzt dokumentiert):
```
Datei: backend/internal/middleware/ratelimit.go
Linien: 15-35 (Global), 45-48 (Auth-spezifisch)
```

### CSRF Protection (jetzt dokumentiert):
```
Datei: backend/internal/middleware/csrf.go
Linien: 8-35 (Token-Validierung)
```

### Input Validation (vorhanden aber nicht vollständig):
```
Datei: backend/internal/models/user.go
Linien: 22-24 (Password constraints)
Linien: 33 (Email format)
```

### Security Best Practices:
```
Datei: backend/cmd/api/main.go
Linien: ~80-100 (Zap Logger, Config Validation)
Linien: ~200-250 (CORS, Auth Middleware)
```

---

## Fazit

Die STRIDE-Analyse ist ein **solides Fundament**, mit folgenden Erkenntnissen:

✅ **Stärken:**
- Umfassende Threat-Modellierung
- Zero-Knowledge-Architektur richtig umgesetzt
- Input-Validierung teilweise implementiert
- Audit-Logging gut durchdacht

⚠️ **Schwächen:**
- Dokumentation nicht aktuell (Rate Limiting, CSRF)
- Kritische Infrastructure-Config fehlt (Redis)
- Timeout-Limits zu minimal
- DoS-Schutze nicht vollständig

🔴 **Für Production erforderlich (vor Deployment):**
1. Redis Memory-Konfiguration
2. HTTP Server Timeouts + Request Limits
3. Redis Passwort-Authentifizierung

Nach Behebung dieser Punkte: **Production-ready** ✅

---

**Autor:** Sicherheitsanalyse  
**Datum:** 14. Dezember 2025  
**Status:** Zur Implementierung empfohlen
