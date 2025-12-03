# Backend Quickstart Guide

Dieses Dokument beschreibt, wie man das Backend lokal startet, die Datenbank initialisiert und die API testet.

## Voraussetzungen

*   [Docker Desktop](https://www.docker.com/products/docker-desktop) installiert und laufend.
*   [Go](https://go.dev/dl/) (Version 1.23+) installiert (für lokale Entwicklung/Migrationen).

## 1. Backend starten

Wir nutzen Docker Compose, um die Datenbank (PostgreSQL), den Cache (Redis) und den Backend-Server zu starten.

Führe folgenden Befehl im Hauptverzeichnis des Projekts aus (`c:\dev\DHBW\PWManager_SecurityByDesign`):

```powershell
docker-compose -f docker-compose.backend.yml up --build -d
```

*   `--build`: Baut das Backend-Image neu (wichtig nach Code-Änderungen).
*   `-d`: Startet die Container im Hintergrund.

Überprüfe, ob alle Container laufen:

```powershell
docker ps
```

Du solltest `pwmanager-backend`, `pwmanager-postgres` und `pwmanager-redis` sehen.

## 2. Datenbank initialisieren (Migrationen)

Nach dem ersten Start ist die Datenbank leer. Wir müssen die Tabellen anlegen.

Wechsle in das Backend-Verzeichnis und führe das Migration-Tool aus:

```powershell
cd backend
go run cmd/migrate/main.go up
```

Wenn erfolgreich, erscheint: `Migrations applied successfully`.

## 3. API Dokumentation & Testen (Swagger)

Das Backend läuft nun auf `http://localhost:8080`.

Die einfachste Art, die API zu testen, ist über die integrierte **Swagger UI**.

👉 **Öffne im Browser:** [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

### Beispiel-Workflow in Swagger:

1.  **Registrieren:**
    *   Öffne `POST /auth/register`.
    *   Klicke "Try it out".
    *   Gib eine Email und ein Passwort ein.
    *   Execute -> Du erhältst einen User zurück.

2.  **Einloggen:**
    *   Öffne `POST /auth/login`.
    *   Gib die gleichen Daten ein.
    *   Execute -> Du erhältst ein `200 OK` und ein Session-Cookie wird automatisch im Browser gesetzt.

3.  **Geschützte Route testen:**
    *   Öffne `GET /auth/me`.
    *   Execute -> Du solltest deine User-Daten sehen (funktioniert nur, wenn du eingeloggt bist).

## 4. Troubleshooting

**Container neu starten (Clean Slate):**
Wenn etwas klemmt, hilft oft ein kompletter Neustart:

```powershell
docker-compose -f docker-compose.backend.yml down
docker-compose -f docker-compose.backend.yml up --build -d
```

**Logs ansehen:**
Um zu sehen, was das Backend macht (oder warum es abstürzt):

```powershell
docker logs -f pwmanager-backend
```
