# K3s Setup & Deployment Guide

Diese Anleitung beschreibt die Installation von K3s und das Deployment des Password Managers unter Verwendung der bereitgestellten Automatisierungsskripte (`Makefile`).

## 1. K3s Installation

Falls noch kein K3s Cluster vorhanden ist, kann es mit folgenden Befehl installiert werden:

```bash
curl -sfL https://get.k3s.io | sh -
```

*Hinweis: Nach der Installation ist die Kubeconfig unter `/etc/rancher/k3s/k3s.yaml` zu finden. Der User braucht Leserechte auf diese Datei oder man verwendet `sudo`.*

Überprüfen der Installation:
```bash
sudo kubectl get nodes
```

## 2. Projekt Setup

Das Projekt enthält ein `Makefile`, das den gesamten Build- und Deployment-Prozess automatisiert.

### Voraussetzungen
*   `docker`
*   `make`
*   `kubectl`
*   `openssl` (für die Zertifikats- und Secret-Generierung)


### (OPTIONAL Docker Images lokal bauen)

Deployment des Cluster mit lokal gebauten Images:

```bash
sudo make setup-local
```


### Deployment (Setup)

Deployment mit Images aus der Github Container Registry.

Der `setup` Befehl führt folgende Aktionen automatisch aus:
1.  Löscht einen existierenden `pwmanager` Namespace (Clean Install).
2.  Lädt Frontend und Backend Image von der Github Registry herunter. 
3.  Generiert automatisch sichere, zufällige Secrets für:
    *   Datenbank-Passwort
    *   Session-Secret
    *   Master Encryption Key
4.  Erstellt eine eigene Certificate Authority (CA) und Server-Zertifikate für TLS. (Falls nicht vorhanden, bei erneutem Ausführen wird die vorher erstelle CA verwendet)
5.  Erstellt das Kubernetes TLS Secret.
6.  Wendet alle Manifeste an und startet die Pods.

Setup ausführen:

```bash
make setup
```

## 3. Zugriff auf die Anwendung

Nachdem das Setup durchgelaufen ist, ist die Anwendung über den Ingress Controller erreichbar.

1.  **IP-Adresse ermitteln:**
    ```bash
    ip addr show eth0
    # oder einfach localhost versuchen
    ```

2.  **Browser öffnen:**
    *   Frontend: `https://<IHRE-IP>/`
    *   Backend API: `https://<IHRE-IP>/api/`

3.  **Zertifikat importieren (Optional):**
    Da eine eigene CA verwendet wird, zeigt der Browser eine Warnung ("Nicht sicher").
    *   Das Root-Zertifikat liegt unter `CertificateAuthority/rootCA.pem`.
    *   Das Zertifikat kann im Browser oder Betriebssystem importiert werden, um der Verbindung zu vertrauen.

## 4. Verwaltung

**Logs ansehen:**
```bash
# Backend Logs
kubectl logs -l app=backend -n pwmanager -c backend

# Datenbank Migration Logs
kubectl logs -l app=backend -n pwmanager -c migrate
```

**Alles löschen (Teardown):**
```bash
make teardown
```

