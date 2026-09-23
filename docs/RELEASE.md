# Releases

Der Workflow `.github/workflows/desktop-release.yml` läuft bei jedem Pull Request nach `main`. Er prüft TypeScript, die JavaScript- und Rust-Tests und baut installierbare Vorschauen für macOS (ARM und Intel), Linux x64 und Windows x64. Die Vorschauen bleiben sieben Tage als Workflow-Artefakte verfügbar. PRs erhalten keinen Zugriff auf den Signierschlüssel.

Jeder Merge nach `main` löst einen öffentlichen Release aus. Nach den Prüfungen erstellt der Workflow einen Entwurf, baut alle vier Varianten mit signierten Tauri-Update-Dateien, prüft die Installer und alle Plattform-Einträge in `latest.json` und veröffentlicht erst dann den Release. Ein fehlgeschlagener Build lässt den Entwurf unveröffentlicht. `workflow_dispatch` kann auf `main` einen weiteren Release anstoßen.

## Versionen

Der Release trägt `v<major>.<minor>.<patch + GitHub-Run-Nummer>`. Die Basisversion steht übereinstimmend in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` und `src-tauri/tauri.conf.json`. Das Skript `scripts/release-version.mjs` prüft diese Dateien und setzt nur im jeweiligen CI-Build die Release-Version. So erhält jeder Merge eine eigene, aufsteigende Version. Eine Änderung von Major oder Minor erfolgt im Quellcode in allen genannten Dateien gemeinsam.

Die App prüft beim Start einer installierten Produktionsversion auf Updates. Wenn eine neuere Version verfügbar ist, bietet sie die Installation an. Der Tauri-Updater akzeptiert ausschließlich Artefakte, die mit dem Secret `TAURI_SIGNING_PRIVATE_KEY` der GitHub-Umgebung `release` signiert wurden. Diese Umgebung erlaubt nur Deployments vom Branch `main`. Der zugehörige öffentliche Schlüssel und der GitHub-Release-Endpunkt stehen in `src-tauri/tauri.conf.json`. Die private Schlüsseldatei liegt als lokale Sicherung unter `~/.tauri/l8ide-release.key` auf dem Rechner, auf dem der Workflow eingerichtet wurde. Sie gehört niemals in Git.

## Plattform-Signaturen

Der Updater-Schlüssel signiert die Update-Pakete, ersetzt aber kein Zertifikat für die Betriebssysteme. macOS-Builds erhalten eine Ad-hoc-Signatur. Für eine notarisiert verteilte macOS-App werden ein Apple-Developer-Zertifikat und Apple-Zugangsdaten benötigt. Für Windows SmartScreen-Reputation wird ein vertrauenswürdiges Code-Signing-Zertifikat benötigt. Bis diese Zugangsdaten vorliegen, werden die Installer ohne diese Hersteller-Signaturen veröffentlicht.

## Fehlgeschlagener Release

Der Release bleibt als Entwurf erhalten. Den fehlgeschlagenen GitHub-Actions-Lauf erneut starten, damit derselbe Tag und Entwurf verwendet werden. Erst nach vollständiger Prüfung wird er veröffentlicht. Bereits veröffentlichte Tags werden nicht überschrieben.
