# 5. Lessons Learned
## Positive Lessons Learned

1. Clientseitige Verschlüsselung war eine gute Entscheidung

Anfangs stellten wir uns die Frage, wo wir unsere Passwörter verschlüsseln? Auf dem Server oder beim Client? Nach einer kurzen Recherche fanden wir heraus, dass die Entscheidung für clientseitige Verschlüsselung mit PBKDF2 best practice ist. Für einen Passwort Manager ist es essenziell, dass der Server nie das echte Passwort sieht.
> 
2. Redis für Sessions war eine gute Wahl

PostgreSQL für Benutzerdaten, Redis für Sessions. Diese Trennung hat sich bewährt.
Das automatische Löschen der Session nach 15 Minuten funktioniert einwandfrei.
Learning: Manchmal ist die einfache Lösung die beste.
> 
3. Docker-Compose macht das Leben leichter

Anfangs hatten wir Probleme mit unterschiedlichen Entwicklungsumgebungen.
Mit Docker-Compose klappt das Setup jetzt bei jedem auf Anhieb.

--- 

## Negative Lessons Learned 

1. Zero-Knowledge ist komplizierter als gedacht

Die Theorie klingt einfach, aber die Implementierung hat uns einige Kopfschmerzen bereitet.
Besonders der Ablauf: Salt vom Server holen → Client-seitig hashen → Login
Es hat eine Weile gedauert, bis alles richtig funktioniert hat.
> 
2. Balance zwischen Sicherheit und Benutzerfreundlichkeit

Zu kurze Session-Timeouts nerven Benutzer.
Zu lange Session-Timeouts sind unsicher.
Kompromiss: 15 Minuten sind okay, aber in der Zukunft würden wir vielleicht "Remember Me" hinzufügen.
> 
3. Argon2 vs. PBKDF2

Anfangs waren wir verwirrt, Warum zwei verschiedene Hashing-Verfahren verwendet werden sollten?
Nach einer Recherche war uns klar, dass der Client (PBKDF2) und Server (Argon2) verwendet.

---

## Was wir beim nächsten Mal anders machen würden 

1. Früher mit Security-Testing anfangen

Wir haben erst spät mit Security-Reviews begonnen.
Beim nächsten Projekt würden wir von Anfang an Threat Modeling machen.
Lesson: Sicherheit nachträglich einbauen ist 10x schwieriger.
> 
2. Besseres Error-Handling im Frontend

Wenn die Salt-Abfrage fehlschlägt, bekommt der User manchmal kryptische Fehlermeldungen.
Das Frontend-Error-Handling könnte benutzerfreundlicher sein.
> 
3. Dokumentation während der Entwicklung schreiben

Wir haben erst viel am Ende dokumentiert.
Nächstes Mal wird es besser sein das Wiki parallel zur Entwicklung zu pflegen.
> 
4. Automatisches Löschen der Zwischenablage

Dieses Feature war deutlich schwerer zu implementieren als anfangs gedacht, da es ein Systemprozess ist auf den nicht direkt vom Browser aus zugegriffen werden kann. Wir mussten also einen Workaround implementieren.
> 
5. Golang für Backend war eine gute Entscheidung

Starke Typisierung hilft, Fehler früh zu finden.
Die crypto-Packages sind robust und gut dokumentiert.
React im Frontend ermöglicht moderne UX.

