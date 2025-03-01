/**
 * index.ts
 * 
 * Haupt-Entry-Point für den MCP-Server.
 * Konfiguriert und startet den Express-Server mit allen Middleware und Routen.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { logger, logStream } from './utils/logger';
import { initializeDatabase } from './db/database';
import { registerTools } from './tools/tool-registry';
import { registerWorkflows } from './workflows/workflow-registry';

// Importiere Routen
import artifactRoutes from './routes/artifact-routes';
import toolRoutes from './routes/tool-routes';
import workflowRoutes from './routes/workflow-routes';
import settingsRoutes from './routes/settings-routes';
import statsRoutes from './routes/stats-routes';
import activitiesRoutes from './routes/activities-routes';

// Lade Umgebungsvariablen
dotenv.config();

// Erstelle Express-App
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('combined', { stream: logStream }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Statische Dateien
app.use(express.static(path.join(__dirname, '../public')));

// API-Routen
app.use('/api/artifacts', artifactRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/activities', activitiesRoutes);

// UI-Route für das React-Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Fehlerbehandlung
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unbehandelte Ausnahme: ${err.message}`, { stack: err.stack });
  
  res.status(500).json({
    success: false,
    message: 'Interner Serverfehler',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server starten
async function startServer() {
  try {
    // Initialisiere die Datenbank
    await initializeDatabase();
    
    // Registriere Tools und Workflows
    await registerTools(app);
    await registerWorkflows();
    
    // Starte den Server
    app.listen(port, () => {
      logger.info(`MCP-Server läuft auf Port ${port}`);
    });
  } catch (error: any) {
    logger.error(`Fehler beim Starten des Servers: ${error.message}`, error);
    process.exit(1);
  }
}

// Starte den Server
startServer();

// Fehlerbehandlung für unbehandelte Ausnahmen
process.on('uncaughtException', (error: Error) => {
  logger.error(`Unbehandelte Ausnahme: ${error.message}`, error);
  
  // Beende den Prozess nach einer Verzögerung, um das Logging abzuschließen
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Fehlerbehandlung für unbehandelte Promise-Ablehnungen
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unbehandelte Promise-Ablehnung', { reason, promise });
});

// Signalhandler für sauberes Beenden
process.on('SIGTERM', () => {
  logger.info('SIGTERM-Signal erhalten. Server wird heruntergefahren...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT-Signal erhalten. Server wird heruntergefahren...');
  process.exit(0);
});
