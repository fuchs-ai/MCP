#!/bin/bash

# Skript zur sicheren Einrichtung einer GitHub-Remote-Verbindung
# Führen Sie dieses Skript in Ihrem Terminal aus und geben Sie Ihre GitHub-Anmeldeinformationen ein,
# wenn Sie dazu aufgefordert werden

# Parameter
GITHUB_USERNAME="$1"
REPO_NAME="helium10-mcp-server"

# Prüfen, ob GitHub-Benutzername angegeben wurde
if [ -z "$GITHUB_USERNAME" ]; then
  echo "Fehler: GitHub-Benutzername fehlt"
  echo "Verwendung: ./setup-github-remote.sh GITHUB_USERNAME"
  exit 1
fi

# Repository-URL
REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Git-Credential-Helper einrichten (speichert Anmeldeinformationen sicher im Cache)
git config --global credential.helper cache
git config --global credential.helper 'cache --timeout=3600'

# Remote hinzufügen oder aktualisieren
if git remote | grep -q "^origin$"; then
  echo "Remote 'origin' bereits vorhanden, wird aktualisiert..."
  git remote set-url origin "$REPO_URL"
else
  echo "Remote 'origin' wird hinzugefügt..."
  git remote add origin "$REPO_URL"
fi

echo "Remote-Repository wurde konfiguriert: $REPO_URL"
echo "Sie können jetzt Folgendes ausführen, um Ihre Änderungen zu pushen:"
echo "  git push -u origin main"
echo ""
echo "Sie werden nach Ihrem GitHub-Benutzernamen und Ihrem Token gefragt, wenn Sie zum ersten Mal pushen."
