# MCP Claude.ai Desktop Integration

Dieses Projekt implementiert einen MCP-Server (Model Context Protocol) für die nahtlose Integration zwischen Claude.ai Desktop und spezialisierten Tools von Helium10.

## Überblick

Die Claude.ai Desktop Integration ermöglicht Claude den Zugriff auf spezialisierte Tools und Workflows für die Amazon-Produktrecherche, Keyword-Analyse und Listing-Optimierung über eine sichere und benutzerfreundliche Schnittstelle.

### Hauptkomponenten

- **Tool-Artefakte**: Ermöglichen Claude den Zugriff auf einzelne Helium10-Tools wie Magnet (Keyword-Recherche), Cerebro (Produktrecherche) und mehr.
- **Workflow-Artefakte**: Automatisieren komplexe Prozesse durch die Verkettung mehrerer Tools in einer definierten Reihenfolge, wobei Ergebnisse zwischen den Schritten weitergegeben werden.
- **Benutzeroberfläche**: Einfache Verwaltung von Artefakten, Einsicht in Ergebnisse und Konfiguration des Systems.
- **Sicherheitsfeatures**: Genehmigungsworkflows, Nutzungslimits und detaillierte Protokollierung.

## Installation

### Voraussetzungen

- Node.js (Version 16 oder höher)
- npm (Version 8 oder höher)
- SQLite (für die Datenbankfunktionalität)

### Schritte

1. **Repository klonen**

```bash
git clone https://github.com/helium10/helium10-mcp-server.git
cd helium10-mcp-server
```

2. **Abhängigkeiten installieren**

```bash
npm install
```

3. **Umgebungsvariablen konfigurieren**

Erstellen Sie eine `.env`-Datei im Stammverzeichnis des Projekts:

```
PORT=3001
JWT_SECRET=IhrGeheimesToken
LOG_LEVEL=info
DATABASE_PATH=./data/mcp.db
```

4. **Datenbank initialisieren**

```bash
npm run db:init
```

5. **Server starten**

Für die Entwicklung:
```bash
npm run dev
```

Für die Produktion:
```bash
npm run build
npm start
```

Die Anwendung ist nun unter http://localhost:3001 verfügbar.

## Nutzung

### Tool-Artefakte erstellen

1. Navigieren Sie in der Benutzeroberfläche zu "Artefakt erstellen" > "Tool-Artefakt".
2. Wählen Sie das gewünschte Tool und konfigurieren Sie die erlaubten Parameter.
3. Legen Sie Optionen wie Genehmigungsanforderungen, Ablaufdatum und Nutzungslimits fest.
4. Teilen Sie die generierte URL mit Claude-Benutzern.

### Workflow-Artefakte erstellen

1. Navigieren Sie zu "Artefakt erstellen" > "Workflow-Artefakt".
2. Wählen Sie einen vorkonfigurierten Workflow oder erstellen Sie einen neuen.
3. Definieren Sie die Eingangsparameter und Ausführungsbedingungen.
4. Teilen Sie die generierte URL mit Claude-Benutzern.

### Artefakte verwalten

- Die "Artefakte"-Seite bietet einen Überblick über alle erstellten Artefakte.
- Sie können Ergebnisse einsehen, URLs kopieren und nicht mehr benötigte Artefakte löschen.

### Beispiel-Workflows

Das Projekt enthält bereits einige vordefinierte Workflows:

- **Produktrecherche-Workflow**: Führt eine umfassende Analyse eines Produkts oder einer Produktnische durch.
- **Mehrsprachiges Listing-Workflow**: Erstellt optimierte Produktlistings in mehreren Sprachen.

## Architektur

Das Projekt ist in mehrere Kernmodule unterteilt:

- **API-Server**: Express-basierter Server, der RESTful-Endpunkte für die Artefakterstellung und -ausführung bereitstellt.
- **Workflow-Manager**: Verwaltet die Ausführung komplexer Workflows mit bedingten Verzweigungen und Fehlerbehandlung.
- **Datenbank-Interface**: Behandelt die Persistenz von Artefakten, Ergebnissen und Benutzerinformationen.
- **UI-Komponenten**: React-basierte Benutzeroberfläche für die Systemverwaltung.

## Weiterentwicklung

Geplante Features für zukünftige Versionen:

- **Erweiterte Berechtigungen**: Rollenbasiertes Zugriffssystem mit detaillierten Berechtigungen.
- **Bidirektionale Kommunikation**: Echtzeit-Feedback während der Toolausführung.
- **UI-Verbesserungen**: Drag-and-Drop-Workflow-Builder und erweiterte Visualisierungen.
- **Metriken und Analysen**: Detaillierte Nutzungsstatistiken und Leistungskennzahlen.
- **Dynamische Workflows**: Workflows, die sich basierend auf Zwischenergebnissen anpassen können.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz veröffentlicht. Siehe die [LICENSE](LICENSE)-Datei für Details.

## Support

Bei Fragen oder Problemen wenden Sie sich bitte an das Helium10-Supportteam unter support@helium10.com oder erstellen Sie ein Issue in diesem Repository.
