# 1. Projektübersicht und Architektur
Diese Seite dient als Einstiegspunkt in diese Projektdokumentation. Sie soll eine kurzen und klaren Überblick über das Projekt und die verwendeten Technologien geben. Außerdem werden die wichtigsten Security Requirements kurz aufgelistet und das Architektur Diagramm ermöglicht eine kompakte Darstellung des Projekts.
   
## 1.1. Ziel der Webanwendung
Ziel dieses Projekts ist die Implementierung eines sichern Online-Passwort-Manager zur zentralen Verwaltung und Verschlüsselung von Zugangsdaten für Privatpersonen. Das Backend basiert auf Golang und einer SQL-Datenbank, die API-Endpoints und Datenspeicherung bereitstellen. Das Frontend wird mit React und TailwindCSS entwickelt und bietet dadurch eine intuitive, responsive Benutzeroberfläche.

## 1.2. Architektur-Schaubild
<img width="1161" height="785" alt="Architekturdiagramm" src="https://github.com/user-attachments/assets/ad2eecaa-aa48-4c54-9c97-fb877eb0b0e3" />


## 1.3. Definiert Security Requirements
1. Sichere Speicherung von Passwörtern und Zugangsdaten
2. Passwort-Generator für starke und zufällige Passwörter
3. Automatisches Löschen der Passwörter aus der Zwischenablage
4. Session-Management mit automatischem Timeout (15 Minuten)
5. Audit-Logging aller sicherheitskritischen Aktionen

--> Auf die Security Requirements wird in der [SecurityRequirements.md](SecurityRequirements) im Detail eingegangen.

## 1.4. Tech-Stack 
Dieser Abschnitt beschreibt den für dieses Projekt verwendeten Tech-Stack, untergliedert in Backend, Frontend & Infrastruktur und gibt eine kürze Begründung für die getroffene Wahl.

### 1.4.1. Backend-Technologien
**Go (Golang)**
- Sichere, typsichere Sprache mit performanter Ausführung
- Ausgezeichnete Unterstützung für Kryptographische Operationen via `crypto`-Standardbibliothek
- Hohe Concurrency-Performance durch Goroutines – wichtig für gleichzeitige Benutzer-Sessions
- Schnelle Kompilierung und einfache Deployment (Single Binary)
- Native Support für RESTful APIs mit minimalen Abhängigkeiten

**PostgreSQL (SQL-Datenbank)**
- Robuste, vertrauenswürdige relationale Datenbank mit starken ACID-Garantien
- Ausgezeichnete Sicherheitsfeatures (Row-Level Security, Prepared Statements)
- Hohe Integrität für sensitive Benutzer- und Passwort-Daten
- Etabliert im produktiven Einsatz seit Jahrzehnten

**RESTful API**
- Standardisierte, zustandslose Architektur für sichere Client-Server-Kommunikation
- Klare Trennung von Authentifizierung (Cookies) und Business Logic
- Einfaches Testing und Monitoring von API-Endpoints
- Session-basierte Authentifizierung mit HttpOnly-Cookies für XSS-Prävention

---

### 1.4.2. Frontend-Technologien
**React**
- Automatisches HTML-Escaping in JSX verhindert XSS-Angriffe by default
- Component-basierte Architektur ermöglicht Sicherheits-Patterns einfach umzusetzen
- Starke Community und umfangreiche Security-Ressourcen
- Virtual DOM ermöglicht sichere und performante UI-Updates

**Tailwind CSS**
- Utility-First Ansatz für schnelle und konsistente UI-Entwicklung
- Reduziert Boilerplate-Code und potenzielle CSS-Sicherheitslücken
- Responsive Design out-of-the-box mit Mobile-First Approach
- Einfache Theme-Verwaltung für sichere, konsistente Benutzer-Interfaces

**Responsive Design**
- Sichere Passwort-Eingabe auch auf mobilen Geräten mit nativen Eingabefunktionen
- Inkonsistente Layouts können zu Phishing-Anfälligkeit führen – Konsistenz ist ein Sicherheits-Feature
- Breite Kompatibilität mit verschiedenen Browsern und Geräten

### 1.4.3. Infrastruktur-Technologien
**Redis (Session Store)**
- In-Memory Datenbank für schnelle, sichere Session-Verwaltung
- Server-seitige Sessions (nicht im Cookie) – verhindert Cookie-Tampering
- Automatische TTL-Verwaltung für Session-Timeouts
- Netzwerk-Isolation: Nicht öffentlich exponiert, nur über interne Docker-Networks erreichbar