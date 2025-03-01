/**
 * Protokollhandler für claude:// URLs in der Electron-App
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as url from 'url';
import { logger } from '../utils/logger';

/**
 * Initialisiert den Protokollhandler für claude:// URLs
 * 
 * @param mainWindow Das Hauptfenster der Anwendung
 */
export function initProtocolHandler(mainWindow: BrowserWindow): void {
  logger.info('Initialisiere claude:// Protokollhandler');
  
  // Registriere das Protokoll
  if (process.platform === 'darwin') {
    app.setAsDefaultProtocolClient('claude');
  } else {
    // Unter Windows muss der Pfad zur ausführbaren Datei angegeben werden
    app.setAsDefaultProtocolClient('claude', process.execPath);
  }
  
  // Handler für macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleClaudeURL(url, mainWindow);
  });
  
  // Handler für Windows (wenn die App bereits läuft)
  if (process.platform === 'win32') {
    const gotTheLock = app.requestSingleInstanceLock();
    
    if (!gotTheLock) {
      app.quit();
      return;
    }
    
    app.on('second-instance', (event, commandLine) => {
      // Jemand hat versucht, eine zweite Instanz zu starten
      // Wir sollten die erste Instanz fokussieren
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        
        // Unter Windows wird die URL als Kommandozeilenargument übergeben
        const url = commandLine.find(arg => arg.startsWith('claude://'));
        if (url) {
          handleClaudeURL(url, mainWindow);
        }
      }
    });
  }
  
  // Prüfe auf Deep-Linking beim Start
  const args = process.argv.slice(1);
  const deepLinkingUrl = args.find(arg => arg.startsWith('claude://'));
  
  if (deepLinkingUrl) {
    handleClaudeURL(deepLinkingUrl, mainWindow);
  }
}

/**
 * Verarbeitet eine claude:// URL und führt die entsprechende Aktion aus
 * 
 * @param urlString Die zu verarbeitende URL
 * @param mainWindow Das Hauptfenster der Anwendung
 */
function handleClaudeURL(urlString: string, mainWindow: BrowserWindow): void {
  try {
    logger.info(`Verarbeite claude:// URL: ${urlString}`);
    
    // URL parsen
    const parsedUrl = url.parse(urlString, true);
    const pathSegments = (parsedUrl.pathname || '').split('/').filter(Boolean);
    
    // Prüfen, ob es sich um einen Artefakt-Aufruf handelt
    if (pathSegments.length >= 2 && pathSegments[0] === 'artifacts' && pathSegments[1] === 'tool') {
      const artifactId = pathSegments[2];
      
      if (!artifactId) {
        throw new Error('Keine Artefakt-ID in der URL gefunden');
      }
      
      // Parameter aus der Query extrahieren
      const parameters = parsedUrl.query || {};
      
      // Zeige Genehmigungsdialog
      mainWindow.webContents.send('show-artifact-approval', {
        artifactId,
        parameters
      });
      
      logger.info(`Artefakt-Genehmigungsdialog für ${artifactId} angezeigt`);
    } else {
      throw new Error(`Unbekannter URL-Typ: ${urlString}`);
    }
  } catch (error) {
    logger.error(`Fehler bei der Verarbeitung der URL ${urlString}: ${error}`);
    
    // Zeige Fehlerdialog
    dialog.showErrorBox(
      'Fehler bei der Verarbeitung der URL',
      `Die URL ${urlString} konnte nicht verarbeitet werden: ${error}`
    );
  }
}

/**
 * IPC-Handler für die Kommunikation zwischen dem Hauptprozess und dem Renderer
 * 
 * @param ipcMain Electron IPC-Main-Instanz
 */
export function setupIpcHandlers(ipcMain: Electron.IpcMain): void {
  // Handler für die Antwort auf den Genehmigungsdialog
  ipcMain.handle('artifact-approval-response', (event, { artifactId, approved, parameters }) => {
    logger.info(`Artefakt-Genehmigung für ${artifactId}: ${approved ? 'Genehmigt' : 'Abgelehnt'}`);
    
    // Hier könnte eine Weiterleitung an den MCP-Server erfolgen
    // oder eine andere Aktion basierend auf der Antwort
    
    return { success: true };
  });
} 