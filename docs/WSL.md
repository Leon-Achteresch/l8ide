# WSL in l8ide

Unter Windows: **Menü → WSL-Ordner öffnen**, Distribution wählen und einen absoluten Linux-Pfad eingeben, zum Beispiel `/home/alex/projekt`. Der Dialog prüft, ob Distribution und Verzeichnis existieren, startet die Distribution und öffnet die Dateien über `\\wsl.localhost\<Distribution>\…`. Zuletzt geöffnete WSL-Ordner werden beim erneuten Öffnen wieder aktiviert.

Für Projekte mit Linux-Werkzeugen ist ein Verzeichnis unter `/home` sinnvoll. Projekte unter `/mnt/c` funktionieren grundsätzlich, sind bei vielen Dateioperationen aber deutlich langsamer.

In einem WSL-Arbeitsbereich laufen das integrierte Terminal, Shell-Befehle (Tasks, Tests, Analysen) und Git in der zugehörigen Distribution und im Linux-Arbeitsverzeichnis. Das Terminal-Menü zeigt die installierten Distributionen als eigene Profile. Git muss innerhalb der Distribution installiert und konfiguriert sein. Die Dev-Port-Anzeige verwendet `ss`; dafür wird `iproute2` in der Distribution benötigt. Browser-Zugriff auf WSL-Server erfolgt über die übliche WSL-Weiterleitung an `localhost`.

Dateien werden über den Windows-UNC-Zugriff angezeigt und bearbeitet. Für große Repositories kann dieser Zugriff langsamer sein als eine vollständig in Linux laufende IDE. Die eigentlichen Builds und Git-Befehle laufen in Linux. WSL-Distributionen und Linux-Prozesse werden von l8ide weder installiert noch automatisch beendet.

Voraussetzung ist eine funktionsfähige WSL-Installation mit mindestens einer registrierten Distribution. Ist WSL oder ein gespeicherter Ordner nicht erreichbar, zeigt l8ide eine Fehlermeldung. Unter macOS und Linux erscheint der WSL-Menüpunkt nicht.

Quellen: [Microsoft WSL-Befehle](https://learn.microsoft.com/en-us/windows/wsl/basic-commands), [Dateisysteme und Performance](https://learn.microsoft.com/en-us/windows/wsl/filesystems), [Windows/Linux-Interop](https://learn.microsoft.com/en-us/windows/dev-environment/wsl-interop).
