# SecurityByDesign_PWManager
Security By Design Vorlesung - Passwort Manager

## Projekt: Passwort Manager

Ein sicherer Online-Passwort-Manager zur zentralen Verwaltung und Verschlüsselung von Zugangsdaten für Privatpersonen. Das Backend basiert auf **Golang** und einer **SQL-Datenbank**, die API-Endpoints und Datenspeicherung gewährleisten. Das Frontend wird mit **React** und **Tailwind CSS** entwickelt und bietet eine intuitive, responsive Benutzeroberfläche.

### Sicherheitsmerkmale

- **Ende-zu-Ende-Verschlüsselung**: Alle Passwörter werden clientseitig verschlüsselt, sodass nur der Nutzer Zugriff auf seine Daten hat
- **Zero-Knowledge-Architektur**: Der Server hat zu keinem Zeitpunkt Zugriff auf entschlüsselte Passwörter
- **AES-256-GCM Verschlüsselung**: Secrets at Rest werden mit AES-256-GCM verschlüsselt
- **TLS 1.3 Kommunikation**: Alle Daten werden über sichere TLS-Verbindungen übertragen

### Features

- Sichere Speicherung von Passwörtern und Zugangsdaten
- Passwort-Generator für starke, zufällige Passwörter
- Automatisches Löschen der Passwörter aus der Zwischenablage
- Session-Management mit automatischem Timeout (15 Minuten)
- Audit-Logging aller sicherheitskritischen Aktionen

### Getting Started

**Backend:**
- Golang
- SQL-Datenbank (PostgreSQL)
- RESTful API

**Frontend:**
- React
- Tailwind CSS
- Responsive Design

**Infrastructure:**
- Kubernetes (K3s)
- Docker

### Dokumentation

Die vollständige Dokumentation befindet sich im `docs/` Ordner.

- [Projektübersicht](docs/01_Projektübersicht.md)
- [Threat Modeling](docs/02_ThreatModeling.md)
- [Implementierung & Anwendungs-Sicherheit](docs/03_Implementierung%20&%20Anwendungs‐Sicherheit.md)
- [Deployment & CI/CD](docs/04_Deployment_CI_CD.md)
- [Lessons Learned](docs/05_Lessons_Learned.md)
- [Security Requirements](docs/SecurityRequirements.md)
- [K3s Setup Guide](docs/K3S_SETUP.md)

### Lokale Dokumentation starten

Um die Dokumentation lokal zu starten, führen Sie folgende Befehle aus:

```bash
pip install -r docs/config/requirements.txt
cd docs/config && mkdocs serve
```

### Getting Started

#### Voraussetzungen

- Docker
- Kubernetes Cluster mit K3s
- Make
- Python & Pip (für Dokumentation)

#### Installation & Ausführung

Das Projekt nutzt ein `Makefile` zur Automatisierung.

**Lokales Setup (mit K3s):**

```bash
make setup
```

Dieser Befehl lädt die Docker-Images herunter und wendet die Kubernetes-Manifeste an.

