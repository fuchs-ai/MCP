/**
 * API-Endpunkte für das Artefakt-System
 */
import express from 'express';
import { validateAuth } from '../middleware/auth';
import { 
  createToolArtifactTool, 
  executeToolArtifactTool,
  getToolResultsTool,
  approveToolExecutionTool,
  listArtifactsTool,
  deleteArtifactTool
} from '../tools/artifact-tools';
import { artifacts } from '../db/models/artifacts';
import { logger } from '../utils/logger';
import { authenticateUser, isAuthenticated } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/artifacts/create
 * @desc    Erstellt ein neues Tool-Artefakt
 * @access  Privat (erfordert Authentifizierung)
 */
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { name, description, toolName, allowedParameters, options } = req.body;
    
    if (!name || !toolName || !allowedParameters) {
      return res.status(400).json({
        success: false,
        message: 'Name, toolName und allowedParameters sind erforderlich'
      });
    }
    
    // Benutzer-ID aus der Authentifizierung hinzufügen
    const userId = req.user?.id || null;
    const artifactOptions = {
      ...options,
      userId
    };
    
    const result = await createToolArtifactTool(
      name,
      description || '',
      toolName,
      allowedParameters,
      artifactOptions
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    logger.info(`API: Artefakt erstellt: ${result.artifact?.id}`);
    return res.status(201).json(result);
  } catch (error) {
    logger.error(`API: Fehler beim Erstellen des Artefakts: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

/**
 * @route   POST /api/artifacts/execute/:artifactId
 * @desc    Führt ein Tool-Artefakt aus
 * @access  Öffentlich (ermöglicht Zugriff aus Claude)
 */
router.post('/execute/:artifactId', async (req, res) => {
  try {
    const { artifactId } = req.params;
    const { parameters, approvalToken } = req.body;
    
    if (!artifactId) {
      return res.status(400).json({
        success: false,
        message: 'Artefakt-ID ist erforderlich'
      });
    }
    
    const result = await executeToolArtifactTool(
      artifactId,
      parameters || {},
      approvalToken
    );
    
    if (!result.success) {
      // Wenn eine Genehmigung erforderlich ist, senden wir einen 403-Status
      if (result.requiresApproval) {
        return res.status(403).json(result);
      }
      
      return res.status(400).json(result);
    }
    
    logger.info(`API: Artefakt ausgeführt: ${artifactId}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`API: Fehler bei der Ausführung des Artefakts: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

/**
 * @route   POST /api/artifacts/approve/:artifactId
 * @desc    Generiert ein Genehmigungstoken für einen Tool-Artefakt-Aufruf
 * @access  Privat (erfordert Authentifizierung)
 */
router.post('/approve/:artifactId', isAuthenticated, async (req, res) => {
  try {
    const { artifactId } = req.params;
    const { parameters } = req.body;
    
    if (!artifactId) {
      return res.status(400).json({
        success: false,
        message: 'Artefakt-ID ist erforderlich'
      });
    }
    
    const userId = req.user?.id || 'anonymous';
    
    const result = await approveToolExecutionTool(
      artifactId,
      userId,
      parameters || {}
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    logger.info(`API: Genehmigungstoken für Artefakt erstellt: ${artifactId}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`API: Fehler bei der Generierung des Genehmigungstokens: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

/**
 * @route   GET /api/artifacts/results/:artifactId
 * @desc    Ruft Ergebnisse von Tool-Artefakt-Ausführungen ab
 * @access  Privat (erfordert Authentifizierung)
 */
router.get('/results/:artifactId', isAuthenticated, async (req, res) => {
  try {
    const { artifactId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!artifactId) {
      return res.status(400).json({
        success: false,
        message: 'Artefakt-ID ist erforderlich'
      });
    }
    
    const result = await getToolResultsTool(artifactId, limit);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    logger.info(`API: Ergebnisse für Artefakt abgerufen: ${artifactId}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`API: Fehler beim Abrufen der Ergebnisse: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

/**
 * @route   GET /api/artifacts/list
 * @desc    Listet Artefakte für den aktuellen Benutzer auf
 * @access  Privat (erfordert Authentifizierung)
 */
router.get('/list', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const includeExpired = req.query.includeExpired === 'true';
    
    const result = await listArtifactsTool(userId, includeExpired);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    logger.info(`API: Artefakte für Benutzer aufgelistet: ${userId}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`API: Fehler beim Auflisten der Artefakte: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

/**
 * @route   DELETE /api/artifacts/:artifactId
 * @desc    Löscht ein Artefakt
 * @access  Privat (erfordert Authentifizierung)
 */
router.delete('/:artifactId', isAuthenticated, async (req, res) => {
  try {
    const { artifactId } = req.params;
    
    if (!artifactId) {
      return res.status(400).json({
        success: false,
        message: 'Artefakt-ID ist erforderlich'
      });
    }
    
    const userId = req.user?.id || 'anonymous';
    
    const result = await deleteArtifactTool(artifactId, userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    logger.info(`API: Artefakt gelöscht: ${artifactId}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`API: Fehler beim Löschen des Artefakts: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

/**
 * @route   GET /api/artifacts/:artifactId
 * @desc    Ruft Details eines Artefakts ab
 * @access  Privat (erfordert Authentifizierung)
 */
router.get('/:artifactId', isAuthenticated, async (req, res) => {
  try {
    const { artifactId } = req.params;
    
    if (!artifactId) {
      return res.status(400).json({
        success: false,
        message: 'Artefakt-ID ist erforderlich'
      });
    }
    
    // Hier könnten wir eine spezielle Funktion für das Abrufen von Artefakt-Details implementieren
    // Für jetzt verwenden wir die Liste und filtern nach ID
    const userId = req.user?.id || 'anonymous';
    const result = await listArtifactsTool(userId, true);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    const artifact = result.artifacts?.find(a => a.id === artifactId);
    
    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: 'Artefakt nicht gefunden'
      });
    }
    
    logger.info(`API: Artefakt-Details abgerufen: ${artifactId}`);
    return res.status(200).json({
      success: true,
      artifact
    });
  } catch (error) {
    logger.error(`API: Fehler beim Abrufen der Artefakt-Details: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Serverfehler: ${error}`
    });
  }
});

export default router; 