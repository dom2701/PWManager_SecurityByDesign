# Security Requirements

**Projekt:** Passwort Manager  
**Version:** 1.0  
**Stand:** Oktober 2025

---

## Übersicht

Dieses Dokument definiert die verbindlichen Sicherheitsanforderungen für den Passwort-Manager. Alle Anforderungen sind als **MUSS-Kriterien** zu verstehen und müssen in der Implementierung vollständig erfüllt werden.

Die Anforderungen basieren auf dem **STRIDE-Bedrohungsmodell** und adressieren folgende Bedrohungskategorien:
- **S** - Spoofing (Identitätsfälschung)
- **T** - Tampering (Manipulation)
- **R** - Repudiation (Nicht-Abstreitbarkeit)
- **I** - Information Disclosure (Informationsoffenlegung)
- **D** - Denial of Service (Dienstverweigerung)
- **E** - Elevation of Privilege (Rechteausweitung)

---

## SR-1: Verschlüsselung der Secrets at Rest

### Anforderung

Alle gespeicherten Secrets (Passwörter, API-Keys) **MÜSSEN** in der Datenbank mit **AES-256-GCM** verschlüsselt werden. 

Der Encryption-Key darf **NICHT** im Code oder in der Datenbank selbst gespeichert sein, sondern **MUSS** aus dem User-Master-Password abgeleitet werden (z.B. via **PBKDF2** mit mindestens **100.000 Iterationen**).

### Technische Details

| Parameter | Spezifikation |
|-----------|---------------|
| **Verschlüsselungsalgorithmus** | AES-256-GCM |
| **Key-Derivation-Funktion** | PBKDF2 |
| **Minimale Iterationen** | 100.000 |
| **Salt** | Unique per Vault, mindestens 32 Bytes |
| **Key-Speicherung** | Niemals im Code oder in der Datenbank |

### Begründung

Schutz vor **Information Disclosure** bei DB-Compromise.

**STRIDE-Kategorie:** I (Information Disclosure)

### Validierung

- [ ] Verschlüsselungsalgorithmus ist AES-256-GCM
- [ ] Key-Derivation verwendet PBKDF2 mit ≥100.000 Iterationen
- [ ] Keys werden niemals persistent gespeichert
- [ ] Jeder Vault hat einen eindeutigen Salt
- [ ] Unit Tests für Verschlüsselung/Entschlüsselung vorhanden

---

## SR-2: Secrets-at-Transit Verschlüsselung

### Anforderung

Die gesamte Kommunikation zwischen Client und Server **MUSS** über **TLS 1.3** (mindestens TLS 1.2) erfolgen. 

TLS-Zertifikate **MÜSSEN** von einer eigenen CA ausgestellt werden. Weak Ciphers (z.B. RC4, 3DES) **MÜSSEN** deaktiviert sein. 

Der **HSTS-Header** (HTTP Strict Transport Security) **MUSS** gesetzt werden (`max-age=31536000`). Certificate Pinning ist optional im Frontend.

### Technische Details

| Parameter | Spezifikation |
|-----------|---------------|
| **Protokoll** | TLS 1.3 (minimal TLS 1.2) |
| **Zertifikat** | Eigene CA |
| **HSTS** | `max-age=31536000` (1 Jahr) |
| **Verbotene Ciphers** | RC4, 3DES, MD5, SHA-1 |
| **Certificate Pinning** | Optional (empfohlen) |

### Begründung

Schutz vor **Man-in-the-Middle-Angriffen**.

**STRIDE-Kategorien:** T (Tampering), I (Information Disclosure)

### Validierung

- [ ] TLS 1.3 ist konfiguriert (Fallback: TLS 1.2)
- [ ] Eigene CA ist eingerichtet und vertrauenswürdig
- [ ] HSTS-Header wird bei jeder Response gesetzt
- [ ] Weak Ciphers sind explizit deaktiviert
- [ ] SSL Labs Test ergibt A+ Rating

---

## SR-3: Zero-Knowledge-Architektur für Secrets

### Anforderung

Der Backend-Server darf zu **KEINEM Zeitpunkt** Zugriff auf entschlüsselte Secrets haben. 

Verschlüsselung und Entschlüsselung **MÜSSEN** clientseitig (im Frontend) mit dem vom User-Password abgeleiteten Key erfolgen. Der Server speichert ausschließlich verschlüsselte Blobs.

### Technische Details

| Komponente | Verantwortung |
|------------|---------------|
| **Client (Browser)** | Key-Derivation, Ver-/Entschlüsselung |
| **Backend** | Speicherung verschlüsselter Blobs |
| **Datenbank** | Persistierung verschlüsselter Daten |

### Architektur-Prinzipien

1. **Master-Passwort** verlässt niemals den Browser
2. **Verschlüsselungs-Keys** werden nur im Browser-Memory gehalten
3. **Server** verarbeitet nur verschlüsselte Daten
4. **API-Endpoints** akzeptieren ausschließlich verschlüsselte Payloads

### Begründung

Minimierung der Angriffsfläche, Schutz bei Backend-Compromise.

**STRIDE-Kategorie:** I (Information Disclosure)

### Validierung

- [ ] Crypto-Operationen erfolgen ausschließlich im Frontend
- [ ] Backend-Code enthält keine Entschlüsselungslogik
- [ ] API-Endpoints verarbeiten nur verschlüsselte Daten
- [ ] Code-Review bestätigt Zero-Knowledge-Architektur

---

## SR-4: Sichere Session-Verwaltung mit automatischer Timeout

### Anforderung

Sessions **MÜSSEN** nach **15 Minuten Inaktivität** automatisch invalidiert werden. 

Session-Tokens **MÜSSEN** als **httpOnly, Secure, SameSite=Strict** Cookies implementiert werden und dürfen **NICHT** in localStorage gespeichert werden. 

Nach Logout **MUSS** das Session-Token serverseitig sofort revoked werden.

### Technische Details

| Parameter | Spezifikation |
|-----------|---------------|
| **Cookie-Flags** | `httpOnly; Secure; SameSite=Strict` |
| **Inaktivitäts-Timeout** | 15 Minuten |
| **Token-Storage** | Ausschließlich in Cookies (kein localStorage) |
| **Session-Revocation** | Sofort bei Logout |
| **Backend-Storage** | Redis mit TTL |

### Session-Lifecycle

```
1. Login → Token-Generierung → Redis (TTL: 15 Min)
2. Request → Token-Validierung → TTL-Refresh
3. 15 Min Inaktivität → Token-Expiry → Auto-Logout
4. Logout → Token-Revocation → Redis-Delete
```

### Begründung

Schutz vor **Session-Hijacking** und **XSS-Angriffen**.

**STRIDE-Kategorien:** S (Spoofing), E (Elevation of Privilege)

### Validierung

- [ ] Cookies haben httpOnly, Secure, SameSite=Strict Flags
- [ ] Inaktivitäts-Timeout ist auf 15 Minuten konfiguriert
- [ ] localStorage wird nicht für Session-Token verwendet
- [ ] Logout invalidiert Token serverseitig in Redis
- [ ] Session-Tests mit automatischem Timeout

---

## SR-5: Audit-Logging aller sicherheitskritischen Aktionen

### Anforderung

Folgende Aktionen **MÜSSEN** unveränderbar geloggt werden:

- Login (Erfolg/Fehlgeschlagen)
- Secret-Zugriff (Lesen/Erstellen/Löschen)
- MFA-Änderungen
- Master-Password-Änderungen

Logs **MÜSSEN** folgende Informationen enthalten:
- User-ID
- Timestamp
- IP-Adresse
- Action-Type

Logs dürfen **NIEMALS** entschlüsselte Secrets oder Passwörter enthalten.

### Technische Details

#### Log-Format

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `log_id` | UUID | Eindeutiger Log-Eintrag-Identifier |
| `user_id` | UUID | Referenz auf User |
| `action` | String | Typ der Aktion (siehe unten) |
| `ip_address` | String | IPv4/IPv6 Adresse |
| `user_agent` | String | Browser/Client Information |
| `timestamp` | DateTime | ISO 8601 Format (UTC) |
| `status` | String | SUCCESS / FAILURE |
| `metadata` | JSON | Zusätzliche Informationen (optional) |

#### Action-Types

```
AUTH_LOGIN_SUCCESS
AUTH_LOGIN_FAILURE
AUTH_LOGOUT
SECRET_CREATE
SECRET_READ
SECRET_UPDATE
SECRET_DELETE
MFA_ENABLE
MFA_DISABLE
PASSWORD_CHANGE
VAULT_CREATE
VAULT_DELETE
```

### Verbotene Inhalte in Logs

- Entschlüsselte Passwörter
- Master-Passwörter
- Verschlüsselungs-Keys
- Session-Tokens (in Plaintext)
- MFA-Secrets

### Begründung

Non-Repudiation, Incident Response, Compliance.

**STRIDE-Kategorie:** R (Repudiation)

### Validierung

- [ ] Audit-Logging ist für alle definierten Aktionen implementiert
- [ ] Log-Einträge sind unveränderbar (Append-Only)
- [ ] Logs enthalten alle erforderlichen Felder
- [ ] Keine sensiblen Daten in Logs vorhanden
- [ ] Log-Retention ist konfiguriert (mindestens 90 Tage)

---

## Compliance Matrix

| Requirement | STRIDE | Kritikalität | Implementierungsstatus |
|-------------|--------|--------------|------------------------|
| SR-1 | I | Kritisch | Offen |
| SR-2 | T, I | Kritisch | Offen |
| SR-3 | I | Kritisch | Offen |
| SR-4 | S, E | Hoch | Offen |
| SR-5 | R | Hoch | Offen |

**Legende:**
- Offen
- In Bearbeitung
- Implementiert
- Validiert

---

## Testing & Validierung

Jedes Security Requirement **MUSS** durch automatisierte Tests validiert werden:

### SR-1 Tests
- Unit Tests für AES-256-GCM Verschlüsselung
- PBKDF2 Key-Derivation Tests
- Negative Tests (falsche Keys, manipulierte Daten)

### SR-2 Tests
- SSL Labs Scan (A+ Rating)
- Cipher-Suite Tests
- HSTS-Header Verification

### SR-3 Tests
- Code-Review (keine Entschlüsselung im Backend)
- Integration Tests (nur verschlüsselte Daten)
- Penetration Testing

### SR-4 Tests
- Session-Timeout Tests (automatisch nach 15 Min)
- Cookie-Flags Verification
- Logout-Revocation Tests

### SR-5 Tests
- Audit-Log Vollständigkeit
- Log-Immutability Tests
- Sensitive-Data-Detection (keine Secrets in Logs)

---

## Review & Updates

| Version | Datum | Änderungen | Autor |
|---------|-------|------------|-------|
| 1.0 | Oktober 2025 | Initiale Version | Projektteam |

---

## Anhang: Referenzen

- **STRIDE-Modell:** [Microsoft Threat Modeling](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- **OWASP Top 10:** [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
- **NIST Cryptographic Standards:** [https://csrc.nist.gov/publications](https://csrc.nist.gov/publications)
- **TLS Best Practices:** [https://wiki.mozilla.org/Security/Server_Side_TLS](https://wiki.mozilla.org/Security/Server_Side_TLS)

---

