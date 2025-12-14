# 4. Deployment und Reproduzierbarkeit

## 4.1. Erklärung des Deployment-Prozesses

### 4.1.1. Bestandteile der CI/CD-Pipeline
#### 4.1.1.1 Trigger-Mechanismus
Die CI/CD-Pipeline wird automatisch bei den folgenden Events ausgelöst:
> <img width="164" height="211" alt="image" src="https://github.com/user-attachments/assets/8ac8dbf8-2f0c-4e59-8c67-f66084698cb2" />
* Push-Events auf die Branches `main` oder `develop`
* Pull-Request für die Branches `main` oder `develop`

So wird sichergestellt, dass jede Code-Änderung automatisch getestet und überprüft wird, bevor sie in die Hauptbranches integriert wird.

---
#### 4.1.1.2 Erstellung einer SBOM
Die SBOM-Generierung erfolgt im Job security-scan:

* **Tool:** Aqua Trivy
* **Format:** CycloneDX (Industriestandard)
* **Scan-Umfang:** Gesamtes Dateisystem des Repositories
* **Output:** evidence/sbom/sbom.cdx.json
* **Speicherung:** Als Artifact sbom hochgeladen
> <img width="625" height="136" alt="image" src="https://github.com/user-attachments/assets/7d0a26ee-80cc-4716-ab49-b85a2b59f8b5" />

---
#### 4.1.1.3 SAST, SCA und Secret Scan
SAST (Static Application Security Testing)
Mehrschichtige statische Code-Analyse:

a) Backend (Go):

* **golangci-lint:** Linter-Sammlung für Go-Code
  * Output: `evidence/sast/golangci-lint.xml` (Checkstyle-Format)
* **gosec:** Security-fokussierter Go-Scanner
  * Output: `evidence/sast/gosec-results.sarif`
> 
b) Frontend (JavaScript):
* **ESLint:** JavaScript/TypeScript Linting 
  * Output: `evidence/sast/frontend-eslint.json`
> 
c) Multi-Language:
* CodeQL: Fortgeschrittene semantische Code-Analyse 
  * Sprachen: Go und JavaScript
  * Matrix-basierte Ausführung für beide Sprachen
  * Automatisches Upload zu GitHub Security
> 
d) Infrastructure as Code:
* Checkov: Kubernetes-Manifest Scanning 
  * Scan-Ziel: `infrastructure/` Verzeichnis
  * Output: SARIF-Format für Security Tab

--- 
SCA (Software Composition Analysis)
> 
Schwachstellen-Scanning von Abhängigkeiten:

* Trivy Dateisystem-Scan:
  * Scannt alle Abhängigkeiten im Repository
  * Output: `evidence/sca/trivy-sca-report.txt`
  * Quality Gate: Exit-Code 1 bei CRITICAL/HIGH Vulnerabilities


* Trivy Image-Scans:
  * Backend-Image: `evidence/sca/trivy-image-backend.txt`
  * Frontend-Image: `evidence/sca/trivy-image-frontend.txt`
  * Prüft OS- und Library-Schwachstellen
  * Quality Gate: Exit-Code 1 bei CRITICAL/HIGH

--- 

Secret Scan
> 
* Gitleaks: Durchsucht Git-History nach Secrets
  * Output:  `evidence/secrets/gitleaks-report.json`
  * Features: --verbose: Detaillierte Ausgabe, --redact: Secrets werden unkenntlich gemacht
  * Erkennt: API-Keys, Tokens, Passwörter, Private Keys, etc.
---

Code Quality/Linting:
* **Backend:** `golangci-lint` für statische Codeanalyse
* **Frontend:** `npm run lint` für JavaScript/TypeScript

---

#### 4.1.1.4 Build und Container-Build
**Backend Build:**

> <img width="625" height="178" alt="image" src="https://github.com/user-attachments/assets/4d5bd150-c028-475f-9118-724b0ff1ca24" />
* Build-Stage: Kompilierung des Go-Backends
* Runtime-Stage: Schlankes Alpine-Image mit nur dem Binary
* Security-Features: Non-root User (`appuser`), Minimales Base-Image, Healthcheck integriert
> 
**Frontend Build:**
> <img width="625" height="176" alt="image" src="https://github.com/user-attachments/assets/40364abd-cdd6-46c3-ae49-6222128e4918" />


---

#### 4.1.1.5 Image Signing
Image-Signierung mit Cosign :
> 
**Backend Signierung:**
> 
> <img width="625" height="63" alt="image" src="https://github.com/user-attachments/assets/b243b8da-02cf-4647-a95f-35d188d4417a" />
> 
**Frontend Signierung:**
> 
> <img width="625" height="64" alt="image" src="https://github.com/user-attachments/assets/0a46662d-9095-4725-abc8-cdb85975acf3" />

**Verifizierung:**

Nach jeder Signierung erfolgt die sofortige Verifikation:
> <img width="625" height="85" alt="image" src="https://github.com/user-attachments/assets/d958d8f9-a62d-41e8-a0bc-2780a2115bad" />

Vorteile:

* Keyless Signing: Nutzt OIDC mit GitHub Actions (id-token:  write)
* Supply Chain Security: Garantiert Herkunft und Integrität
* Compliance: Erfüllt SLSA-Anforderungen
* Evidence: Logs in `evidence/signing/` gespeichert

--- 
#### 4.1.1.6 Quality Gate mit Abbruch-Bedingungen
Die Pipeline implementiert mehrere Quality Gates mit Fail-Fast-Mechanismen:
> 
**Quality Gate 1: SCA Dateisystem:**

> <img width="625" height="116" alt="image" src="https://github.com/user-attachments/assets/6f8bc6db-f8ee-49ba-b525-6edd1790a6e8" />
* Abbruch bei: CRITICAL oder HIGH Schwachstellen in Dependencies
* Zeitpunkt: Nach SAST/Secret Scan, vor Build

**Quality Gate 2: Backend Image:**

> <img width="625" height="119" alt="image" src="https://github.com/user-attachments/assets/f6ac4af4-3f1a-4b33-9d26-4c85b3ad893b" />
* Abbruch bei: CRITICAL oder HIGH Schwachstellen im Backend-Image
* Zeitpunkt: Nach Backend-Build und -Signierung

**Quality Gate 3: Frontend Image:**

> <img width="625" height="116" alt="image" src="https://github.com/user-attachments/assets/8a195d32-8b47-4dc4-99d0-b1366487ce7a" />`
* Abbruch bei: CRITICAL oder HIGH Schwachstellen im Frontend-Image
* Zeitpunkt: Nach Frontend-Build und -Signierung
> 
**Strategie:**
* Nur fixierbare Schwachstellen führen zum Abbruch `(ignore-unfixed: true)`
* Severity-Fokus: Nur CRITICAL und HIGH blockieren die Pipeline
* Mehrstufig: Checks auf Code-, Dependency- und Image-Ebene
> 
**Job-Dependencies:**
> <img width="625" height="80" alt="image" src="https://github.com/user-attachments/assets/53eb1937-5ad1-4e2f-9875-6020e32384d8" />
Fehler in früheren Stages verhindern die Ausführung der nachfolgenden Stages.

---

### 4.1.2. Kubernetes Security (Least Privilege)
Die Anwendung wird unter strikter Einhaltung des Least-Privilege-Prinzips in Kubernetes betrieben. Dies minimiert die Angriffsfläche und begrenzt den Schaden im Falle einer Kompromittierung.

#### 4.1.2.1 Namespace-Isolierung
Die gesamte Anwendung läuft in einem dedizierten Namespace (`pwmanager`). Dies sorgt für eine logische Trennung von anderen Cluster-Ressourcen und ermöglicht granulare Zugriffskontrollen (RBAC) sowie Ressourcen-Quotas.

#### 4.1.2.2 Service Account Security
* **Automount Service Account Token:** Deaktiviert (`automountServiceAccountToken: false`), wo nicht benötigt.
* **Rechte:** Der verwendete Service Account hat keinerlei Cluster-Admin-Rechte und darf nur auf absolut notwendige Ressourcen innerhalb des eigenen Namespaces zugreifen.

#### 4.1.2.3 Pod Security Context
Die Pods sind so konfiguriert, dass sie mit minimalen Rechten laufen:
* **Non-Root User:** Alle Container laufen als nicht-privilegierter Benutzer (`runAsNonRoot: true`, `runAsUser: 10001`).
* **Read-Only Filesystem:** Das Root-Dateisystem ist schreibgeschützt (`readOnlyRootFilesystem: true`), um Manipulationen am System zu verhindern. Temporäre Daten werden in `emptyDir`-Volumes geschrieben.
* **Capabilities Drop:** Alle Linux-Capabilities werden standardmäßig verworfen (`ALL`), und nur explizit benötigte (falls vorhanden) werden hinzugefügt.
* **Privilege Escalation:** Die Eskalation von Rechten ist deaktiviert (`allowPrivilegeEscalation: false`).

#### 4.1.2.4 Network Policies
Es gilt ein "Deny-All"-Standard für eingehenden Verkehr (Ingress). Explizite `NetworkPolicies` erlauben nur den notwendigen Datenverkehr:
* **Ingress:** Der Ingress-Controller darf sowohl den Frontend- als auch den Backend-Service erreichen.
* **Frontend -> Backend:** Das Frontend darf zusätzlich direkt das Backend auf dem definierten Port ansprechen (z.B. für Server-Side Rendering).
* **Backend -> DB:** Das Backend darf nur die Datenbank auf dem Datenbank-Port ansprechen.
* **Backend -> Redis:** Das Backend darf nur den Redis-Cache auf dem Redis-Port ansprechen.
* **Egress:** Aktuell sind keine Einschränkungen für ausgehenden Verkehr definiert (Standard-Allow).

## 4.2. Reproduzierbarkeit

### 4.2.1. Frontend-Verzeichnis (`/frontend/`)
```
frontend/
├── public/                                     STATISCHE ASSETS
│   └── index.html                              • HTML Entry Point
│
├── src/                                        HAUPTANWENDUNGSCODE
│   │
│   ├── components/                             UI-KOMPONENTEN
│   │   ├── auth/                               Authentifizierung
│   │   │   ├── AuthHeader.jsx                  • Header für Auth-Seiten
│   │   │   ├── AuthLayout.tsx                  • Layout für Login/Register
│   │   │   ├── LoginForm.tsx                   • Email + Passwort Input
│   │   │   └── RegisterForm.tsx                • Registrierungs-Formular
│   │   │
│   │   ├── layout/                             Seitenstruktur
│   │   │   ├── Footer.jsx                      • App-Footer
│   │   │   ├── LayoutWrapper.tsx               • Haupt-Layout Wrapper
│   │   │   └── Navbar.jsx                      • Navigationsleiste
│   │   │
│   │   ├── ui/                                 Generische Komponenten
│   │   │   ├── AuthButtons.tsx                 • Login/Logout Buttons
│   │   │   └── ThemeToggle.jsx                 • Dark/Light Mode
│   │   │
│   │   ├── CreateVaultModal.jsx                • Tresor erstellen Dialog
│   │   ├── MFADisableModal.jsx                 • MFA deaktivieren Dialog
│   │   ├── MFASetupModal.jsx                   • TOTP Setup Dialog
│   │   ├── ProtectedRoute.jsx                  • Route-Schutz für Auth
│   │   └── VaultEntryModal.jsx                 • Passwort-Eintrag Dialog
│   │
│   ├── context/                                GLOBALER STATE
│   │   └── AutoLogoutContext.jsx               • Auto-Logout nach 15 Min
│   │
│   ├── hooks/                                  CUSTOM LOGIC
│   │   ├── useAudit.js                         • Audit-Logs Daten
│   │   ├── useAutoLogout.js                    • Inaktivitäts-Timer
│   │   ├── useCrypto.js                        • AES-256 Verschlüsselung
│   │   ├── useLocalStorage.js                  • Browser Storage
│   │   ├── useMFA.js                           • MFA Setup/Verify
│   │   ├── useSession.js                       • Session Management
│   │   └── useVault.js                         • Tresor CRUD
│   │
│   ├── pages/                                  SEITEN (ROUTES)
│   │   ├── Audit/                              Audit-Logs
│   │   │   └── AuditPage.jsx                   • Aktions-Historie
│   │   │
│   │   ├── Auth/                               Authentifizierung
│   │   │   ├── ForgotPasswordPage.jsx          • Passwort zurücksetzen
│   │   │   ├── LoginPage.jsx                   • Login mit Email/Passwort
│   │   │   └── RegisterPage.jsx                • Neues Konto erstellen
│   │   │
│   │   ├── Dashboard/                          Startseite
│   │   │   └── DashboardPage.jsx               • Überblick & Statistiken
│   │   │
│   │   ├── Settings/                           Benutzereinstellungen
│   │   │   └── SettingsPage.jsx                • Profil, Passwort ändern, MFA
│   │   │
│   │   └── Vault/                              Tresore
│   │       └── VaultPage.jsx                   • Tresore verwalten
│   │
│   ├── services/                               API & LOGIK
│   │   ├── api/                                HTTP-Client
│   │   │   ├── client.js                       • Axios Konfiguration
│   │   │   └── endpoints.js                    • API-URLs
│   │   │
│   │   └── auth/                               Auth-Services
│   │       └── index.js                        • Login, Register, etc.
│   │
│   ├── types/                                  TYPEN
│   │   └── auth.ts                             • TypeScript Definitionen
│   │
│   ├── utils/                                  HELFER
│   │   ├── constants.js                        • App-Konstanten
│   │   ├── crypto.js                           • AES-256 Functions
│   │   ├── errors.js                           • Error-Handler
│   │   ├── formatters.js                       • Formatierung (Datum, etc)
│   │   ├── masterPassword.js                   • Passwort-Validierung
│   │   ├── security.js                         • XSS, CSRF Protection
│   │   └── validators.js                       • Input-Validierung
│   │
│   ├── App.jsx                                 Root Component
│   ├── index.css                               Globale Styles
│   └── main.jsx                                Entry Point
│
├── .env.local                                  UMGEBUNG (PRIVAT)
├── .env.example                                Env Template
├── .gitignore                                  Git Ignore
├── eslint.config.js                            Code-Qualität
├── index.html                                  HTML Shell
├── package.json                                Dependencies
├── package-lock.json                           Lock File
├── postcss.config.js                           CSS Processing
├── tailwind.config.js                          Tailwind Config
├── vite.config.js                              Build Tool
└── README.md                                   Dokumentation
```

### 4.2.2. Backend-Verzeichnis (`/backend/`)
```
backend/
├── cmd/                                        ENTRY POINTS
│   ├── api/                                    API Server
│   │   └── main.go                             • Server Startup (Port 8080)
│   │
│   └── migrate/                                Datenbank Migration
│       └── main.go                             • Migration Tool (up/down/force)
│
├── internal/                                   PRIVATE CODE
│   │
│   ├── auth/                                   Authentifizierung
│   │   └── session.go                          • Session Manager + Redis Store
│   │
│   ├── config/                                 Konfiguration
│   │   └── config.go                           • Config Loader + Env Parser
│   │
│   ├── handlers/                               HTTP Handler
│   │   ├── auth_handler.go                     • Login, Register, MFA, Password
│   │   ├── vault_handler.go                    • CRUD für Tresore
│   │   ├── entry_handler.go                    • CRUD für Einträge
│   │   └── audit_handler.go                    • Audit-Log Endpoints
│   │
│   ├── middleware/                             HTTP Middleware
│   │   ├── auth.go                             • JWT/Session Validierung
│   │   ├── cors.go                             • CORS Policy
│   │   └── logging.go                          • Request/Response Logging
│   │
│   ├── models/                                 Datenstrukturen
│   │   ├── user.go                             • User + Auth Models
│   │   ├── vault.go                            • Vault Model
│   │   ├── vault_entry.go                      • Vault Entry Model
│   │   ├── mfa.go                              • MFA + TOTP Models
│   │   └── audit.go                            • Audit Log Model
│   │
│   ├── repository/                             Datenzugriff
│   │   ├── user_repo.go                        • User DB Operations
│   │   ├── vault_repo.go                       • Vault DB Operations
│   │   ├── entry_repo.go                       • Entry DB Operations
│   │   ├── mfa_repo.go                         • MFA DB Operations
│   │   └── audit_repo.go                       • Audit DB Operations
│   │
│   └── (no direct /internal files)
│
├── pkg/                                        REUSABLE PACKAGES
│   └── crypto/                                 Verschlüsselung
│       ├── aes.go                              • AES-256-GCM Encryption
│       └── argon2.go                           • Argon2id Password Hashing
│
├── migrations/                                 DATABASE SCHEMA
│   ├── 000001_create_users.up.sql              • Users Tabelle
│   ├── 000001_create_users.down.sql            • Rollback Users
│   ├── 000002_create_vaults.up.sql             • Vaults Tabelle
│   ├── 000002_create_vaults.down.sql           • Rollback Vaults
│   ├── 000003_create_vault_entries.up.sql      • Vault Entries Tabelle
│   ├── 000003_create_vault_entries.down.sql    • Rollback Entries
│   ├── 000004_create_mfa_secrets.up.sql        • MFA Secrets Tabelle
│   ├── 000004_create_mfa_secrets.down.sql      • Rollback MFA
│   ├── 000005_create_audit_logs.up.sql         • Audit Logs Tabelle
│   └── 000005_create_audit_logs.down.sql       • Rollback Audit
│
├── .env                                        UMGEBUNG (PRIVAT)
├── .env.example                                Env Template
├── go.mod                                      Go Module Definition
├── go.sum                                      Dependency Lock
├── Dockerfile                                  Container Image
├── quickstart.md                               Setup Dokumentation
└── api                                         Compiled Binary (nach build)
```
