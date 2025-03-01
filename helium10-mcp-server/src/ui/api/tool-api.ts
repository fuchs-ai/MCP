/**
 * tool-api.ts
 *
 * Dieser API-Client stellt Methoden zur Kommunikation mit dem MCP-Server bereit.
 * Er ermöglicht den Zugriff auf Tools, Artefakte und Workflows.
 */

import axios, { AxiosRequestConfig } from 'axios';

// Basis-URL für die API
// Kann über Umgebungsvariablen oder Einstellungen konfiguriert werden
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Axios-Instance mit Basis-Konfiguration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 Sekunden Timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// API-Antworttypen
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

/**
 * Tool ausführen
 * @param toolName Name des Tools
 * @param params Parameter für das Tool
 * @returns Ergebnis der Tool-Ausführung
 */
export const callTool = async (toolName: string, params: any) => {
  try {
    const response = await api.post<ApiResponse<any>>('/tools/execute', {
      toolName,
      params,
    });

    if (response.data.success) {
      return {
        success: true,
        result: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Tool-Artefakt erstellen
 * @param name Name des Artefakts
 * @param description Beschreibung des Artefakts
 * @param toolName Name des Tools
 * @param allowedParameters Erlaubte Parameter für das Tool
 * @param options Zusätzliche Optionen (Genehmigung, Ablauf, etc.)
 * @returns Erstelltes Artefakt
 */
export const createArtifact = async (
  name: string,
  description: string,
  toolName: string,
  allowedParameters: Record<string, any> = {},
  options: {
    requiredApproval?: boolean;
    userId?: string;
    expiresAfterDays?: number;
    maxUsage?: number;
    storeResults?: boolean;
  } = {}
) => {
  try {
    const response = await api.post<ApiResponse<any>>('/artifacts/create', {
      name,
      description,
      toolName,
      allowedParameters,
      ...options,
    });

    if (response.data.success) {
      return {
        success: true,
        artifact: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Workflow-Artefakt erstellen
 * @param name Name des Artefakts
 * @param description Beschreibung des Artefakts
 * @param workflowId ID des Workflows
 * @param allowedParameters Erlaubte Parameter für den Workflow
 * @param options Zusätzliche Optionen (Genehmigung, Ablauf, etc.)
 * @returns Erstelltes Workflow-Artefakt
 */
export const createWorkflowArtifact = async (
  name: string,
  description: string,
  workflowId: string,
  allowedParameters: Record<string, any> = {},
  options: {
    requiredApproval?: boolean;
    userId?: string;
    expiresAfterDays?: number;
    maxUsage?: number;
    storeResults?: boolean;
  } = {}
) => {
  try {
    const response = await api.post<ApiResponse<any>>('/artifacts/create-workflow', {
      name,
      description,
      workflowId,
      allowedParameters,
      ...options,
    });

    if (response.data.success) {
      return {
        success: true,
        artifact: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Artefakt ausführen
 * @param artifactId ID des Artefakts
 * @param params Parameter für die Ausführung
 * @param approvalToken Optionaler Genehmigungstoken
 * @returns Ergebnis der Artefakt-Ausführung
 */
export const executeArtifact = async (
  artifactId: string,
  params: any,
  approvalToken?: string
) => {
  try {
    const requestConfig: AxiosRequestConfig = {};
    if (approvalToken) {
      requestConfig.headers = {
        Authorization: `Approval ${approvalToken}`,
      };
    }

    const response = await api.post<ApiResponse<any>>(
      `/artifacts/${artifactId}/execute`,
      { params },
      requestConfig
    );

    if (response.data.success) {
      return {
        success: true,
        result: response.data.data,
      };
    } else if (response.data.message?.includes('approval')) {
      return {
        success: false,
        requiresApproval: true,
        message: response.data.message,
        approvalUrl: response.data.data?.approvalUrl,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Workflow-Artefakt ausführen
 * @param artifactId ID des Workflow-Artefakts
 * @param params Parameter für die Ausführung
 * @param approvalToken Optionaler Genehmigungstoken
 * @returns Ergebnis der Workflow-Ausführung
 */
export const executeWorkflowArtifact = async (
  artifactId: string,
  params: any,
  approvalToken?: string
) => {
  try {
    const requestConfig: AxiosRequestConfig = {};
    if (approvalToken) {
      requestConfig.headers = {
        Authorization: `Approval ${approvalToken}`,
      };
    }

    const response = await api.post<ApiResponse<any>>(
      `/artifacts/${artifactId}/execute-workflow`,
      { params },
      requestConfig
    );

    if (response.data.success) {
      return {
        success: true,
        result: response.data.data,
      };
    } else if (response.data.message?.includes('approval')) {
      return {
        success: false,
        requiresApproval: true,
        message: response.data.message,
        approvalUrl: response.data.data?.approvalUrl,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Artefakt-Ausführung genehmigen
 * @param executeId ID der Ausführung
 * @param approvalToken Genehmigungstoken
 * @returns Ergebnis der Genehmigung
 */
export const approveArtifactExecution = async (
  executeId: string,
  approvalToken: string
) => {
  try {
    const response = await api.post<ApiResponse<any>>(
      `/artifacts/approve/${executeId}`,
      { approvalToken }
    );

    if (response.data.success) {
      return {
        success: true,
        result: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Artefakte auflisten
 * @param options Optionen für die Abfrage (Seite, Seitengröße, Filter)
 * @returns Liste von Artefakten
 */
export const listArtifacts = async (options: {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
} = {}) => {
  try {
    const response = await api.get<ApiResponse<any>>('/artifacts/list', {
      params: options,
    });

    if (response.data.success) {
      return {
        success: true,
        artifacts: response.data.data.artifacts,
        total: response.data.data.total,
        page: response.data.data.page,
        pageSize: response.data.data.pageSize,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Artefakt-Ergebnisse abrufen
 * @param artifactId ID des Artefakts
 * @param options Optionen für die Abfrage (Limit, Offset)
 * @returns Ergebnisse des Artefakts
 */
export const getArtifactResults = async (
  artifactId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
) => {
  try {
    const response = await api.get<ApiResponse<any>>(
      `/artifacts/${artifactId}/results`,
      {
        params: options,
      }
    );

    if (response.data.success) {
      return {
        success: true,
        results: response.data.data.results,
        total: response.data.data.total,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Registrierte Tools abrufen
 * @returns Liste der registrierten Tools
 */
export const getRegisteredTools = async () => {
  try {
    const response = await api.get<ApiResponse<any>>('/tools/list');

    if (response.data.success) {
      return {
        success: true,
        tools: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Registrierte Workflows abrufen
 * @returns Liste der registrierten Workflows
 */
export const getRegisteredWorkflows = async () => {
  try {
    const response = await api.get<ApiResponse<any>>('/workflows/list');

    if (response.data.success) {
      return {
        success: true,
        workflows: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Artefakt löschen
 * @param artifactId ID des Artefakts
 * @returns Ergebnis der Löschoperation
 */
export const deleteArtifact = async (artifactId: string) => {
  try {
    const response = await api.delete<ApiResponse<any>>(`/artifacts/${artifactId}`);

    if (response.data.success) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Systemeinstellungen abrufen
 * @returns Systemeinstellungen
 */
export const getSettings = async () => {
  try {
    const response = await api.get<ApiResponse<any>>('/settings');

    if (response.data.success) {
      return {
        success: true,
        settings: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Systemeinstellungen aktualisieren
 * @param settings Neue Einstellungen
 * @returns Aktualisierte Einstellungen
 */
export const updateSettings = async (settings: Record<string, any>) => {
  try {
    const response = await api.put<ApiResponse<any>>('/settings', settings);

    if (response.data.success) {
      return {
        success: true,
        settings: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
};

/**
 * Statistiken abrufen
 * @returns Dashboard-Statistiken
 */
export const getDashboardStats = async () => {
  try {
    const response = await api.get<ApiResponse<any>>('/stats/dashboard');

    if (response.data.success) {
      return {
        success: true,
        stats: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Unbekannter Fehler',
        error: response.data.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Netzwerkfehler',
      error,
    };
  }
}; 