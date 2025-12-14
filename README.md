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

