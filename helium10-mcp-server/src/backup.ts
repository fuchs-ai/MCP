/**
 * Sicherungs-Komponente für lokale Datensicherung
 * 
 * Diese Komponente stellt Funktionen zur lokalen Datensicherung und regelmäßigen
 * Datensicherungsplanung für den Helium10 MCP-Server bereit.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { getConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Erstellt ein Backup der Datenbank
 * 
 * @returns Promise<boolean> - true bei erfolgreicher Sicherung, sonst false
 */
export async function datenbanksicherungErstellen(): Promise<boolean> {
  const config = getConfig();
  const dbPfad = config.dbPath;
  const sicherungsVerzeichnis = path.join(process.cwd(), 'sicherungen');
  const zeitstempel = new Date().toISOString().replace(/[:\.]/g, '-');
  const sicherungsPfad = path.join(sicherungsVerzeichnis, `helium10-${zeitstempel}.db`);
  
  // Sicherungsverzeichnis erstellen, falls nicht vorhanden
  if (!fs.existsSync(sicherungsVerzeichnis)) {
    fs.mkdirSync(sicherungsVerzeichnis, { recursive: true });
  }
  
  try {
    // SQLite Online-Backup mit Hilfe von sqlite3
    return new Promise((resolve, reject) => {
      exec(`sqlite3 "${dbPfad}" ".backup '${sicherungsPfad}'"`, (error) => {
        if (error) {
          logger.error('Datenbankbackup fehlgeschlagen', error);
          reject(error);
          return;
        }
        
        logger.info(`Datenbankbackup erstellt: ${sicherungsPfad}`);
        
        // Alte Sicherungen bereinigen (nur die letzten 5 behalten)
        const dateien = fs.readdirSync(sicherungsVerzeichnis)
          .filter(datei => datei.endsWith('.db'))
          .sort()
          .reverse();
          
        const zuLöschendeDateien = dateien.slice(5);
        for (const datei of zuLöschendeDateien) {
          fs.unlinkSync(path.join(sicherungsVerzeichnis, datei));
          logger.debug(`Alte Sicherung gelöscht: ${datei}`);
        }
        
        resolve(true);
      });
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen der Datenbanksicherung', error as Error);
    return false;
  }
}

/**
 * Führt regelmäßige Datensicherungen durch
 * 
 * @param intervallStunden - Intervall zwischen Sicherungen in Stunden (Standard: 24)
 */
export function regelmäßigeSicherungenPlanen(intervallStunden = 24): void {
  // Initialen Backup erstellen
  datenbanksicherungErstellen()
    .then(() => logger.info('Initiale Sicherung erstellt'))
    .catch(error => logger.error('Fehler bei der initialen Sicherung', error));
  
  // Regelmäßige Backups planen
  const intervallMs = intervallStunden * 60 * 60 * 1000;
  
  setInterval(() => {
    datenbanksicherungErstellen()
      .then(() => logger.info('Geplante Sicherung erstellt'))
      .catch(error => logger.error('Fehler bei der geplanten Sicherung', error));
  }, intervallMs);
  
  logger.info(`Regelmäßige Sicherungen alle ${intervallStunden} Stunden geplant`);
}

/**
 * Stellt Sicherungen wieder her
 * 
 * @param zeitstempel - Optionaler Zeitstempel der Sicherung (wenn nicht angegeben, wird die neueste verwendet)
 * @returns Promise<boolean> - true bei erfolgreicher Wiederherstellung, sonst false
 */
export async function sicherungWiederherstellen(zeitstempel?: string): Promise<boolean> {
  const config = getConfig();
  const dbPfad = config.dbPath;
  const sicherungsVerzeichnis = path.join(process.cwd(), 'sicherungen');
  
  try {
    // Prüfen, ob Sicherungsverzeichnis existiert
    if (!fs.existsSync(sicherungsVerzeichnis)) {
      logger.error('Sicherungsverzeichnis existiert nicht');
      return false;
    }
    
    // Alle Sicherungsdateien auflisten
    const sicherungsDateien = fs.readdirSync(sicherungsVerzeichnis)
      .filter(datei => datei.endsWith('.db'))
      .sort()
      .reverse(); // Neueste zuerst
    
    if (sicherungsDateien.length === 0) {
      logger.error('Keine Sicherungsdateien gefunden');
      return false;
    }
    
    // Wähle die Sicherungsdatei aus
    let ausgewählteDatei: string;
    
    if (zeitstempel) {
      // Suche nach Sicherung mit bestimmtem Zeitstempel
      ausgewählteDatei = sicherungsDateien.find(
        datei => datei.includes(zeitstempel)
      ) || sicherungsDateien[0];
    } else {
      // Verwende die neueste Sicherung
      ausgewählteDatei = sicherungsDateien[0];
    }
    
    const sicherungsPfad = path.join(sicherungsVerzeichnis, ausgewählteDatei);
    
    // Erstelle eine Sicherungskopie der aktuellen Datenbank
    const aktuelleDbSicherung = `${dbPfad}.vor_wiederherstellung`;
    fs.copyFileSync(dbPfad, aktuelleDbSicherung);
    
    // Wiederherstellung durchführen
    return new Promise((resolve, reject) => {
      exec(`sqlite3 "${dbPfad}" ".restore '${sicherungsPfad}'"`, (error) => {
        if (error) {
          logger.error('Wiederherstellung fehlgeschlagen', error);
          // Versuche, die ursprüngliche Datenbank wiederherzustellen
          try {
            fs.copyFileSync(aktuelleDbSicherung, dbPfad);
            logger.info('Ursprüngliche Datenbank wiederhergestellt');
          } catch (restoreError) {
            logger.error('Fehler bei der Wiederherstellung der ursprünglichen Datenbank', restoreError);
          }
          reject(error);
          return;
        }
        
        logger.info(`Datenbank erfolgreich aus Sicherung wiederhergestellt: ${sicherungsPfad}`);
        resolve(true);
      });
    });
  } catch (error) {
    logger.error('Fehler bei der Sicherungswiederherstellung', error as Error);
    return false;
  }
}

/**
 * Listet alle verfügbaren Sicherungen auf
 * 
 * @returns Array von Sicherungsinformationen
 */
export function sicherungenAuflisten(): Array<{dateiname: string; größe: number; datum: Date}> {
  const sicherungsVerzeichnis = path.join(process.cwd(), 'sicherungen');
  
  try {
    if (!fs.existsSync(sicherungsVerzeichnis)) {
      return [];
    }
    
    return fs.readdirSync(sicherungsVerzeichnis)
      .filter(datei => datei.endsWith('.db'))
      .map(datei => {
        const dateipfad = path.join(sicherungsVerzeichnis, datei);
        const stats = fs.statSync(dateipfad);
        
        return {
          dateiname: datei,
          größe: stats.size,
          datum: stats.mtime
        };
      })
      .sort((a, b) => b.datum.getTime() - a.datum.getTime()); // Neueste zuerst
  } catch (error) {
    logger.error('Fehler beim Auflisten der Sicherungen', error as Error);
    return [];
  }
}

// Führe eine Sicherung aus wenn direkt aufgerufen
if (require.main === module) {
  datenbanksicherungErstellen()
    .then(erfolg => {
      console.log(`Sicherung ${erfolg ? 'erfolgreich' : 'fehlgeschlagen'}`);
      process.exit(erfolg ? 0 : 1);
    })
    .catch(error => {
      console.error('Sicherungsfehler:', error);
      process.exit(1);
    });
}
