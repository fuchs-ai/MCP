/**
 * main.js
 * 
 * Hauptskript für die MCP-Server-Benutzeroberfläche.
 * Implementiert die Kommunikation mit den Backend-APIs und steuert die UI-Interaktionen.
 */

// API-Endpunkte
const API = {
  STATS: '/api/stats/system',
  ARTIFACTS: '/api/artifacts',
  TOOLS: '/api/tools',
  WORKFLOWS: '/api/workflows',
  SETTINGS: '/api/settings'
};

// UI-Controller
class UIController {
  constructor() {
    this.initEventListeners();
    this.loadInitialData();
    this.setupPeriodicUpdates();
  }

  /**
   * Initialisiert Event-Listener für die Navigation und Aktionsbuttons
   */
  initEventListeners() {
    // Navigation
    const navLinks = {
      dashboardLink: 'dashboardContainer',
      artifactsLink: 'artifactsContainer',
      toolsLink: 'toolsContainer',
      workflowsLink: 'workflowsContainer',
      settingsLink: 'settingsContainer'
    };
    
    // Für jeden Link einen Event-Listener hinzufügen
    Object.keys(navLinks).forEach(linkId => {
      document.getElementById(linkId)?.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Alle Container ausblenden
        Object.values(navLinks).forEach(containerId => {
          document.getElementById(containerId).style.display = 'none';
        });
        
        // Ausgewählten Container einblenden
        document.getElementById(navLinks[linkId]).style.display = 'block';
      });
    });

    // Event-Listener für Formulare und Buttons
    document.getElementById('settingsForm')?.addEventListener('submit', this.saveSettings.bind(this));
    document.getElementById('resetSettingsBtn')?.addEventListener('click', this.resetSettings.bind(this));
    document.getElementById('refreshStatusBtn')?.addEventListener('click', this.loadStats.bind(this));
    document.getElementById('createToolArtifactBtn')?.addEventListener('click', this.showCreateToolArtifactModal.bind(this));
    document.getElementById('createWorkflowArtifactBtn')?.addEventListener('click', this.showCreateWorkflowArtifactModal.bind(this));
    document.getElementById('viewExecutionsBtn')?.addEventListener('click', this.showExecutionsModal.bind(this));
  }

  /**
   * Lädt die initialen Daten beim Seitenaufruf
   */
  loadInitialData() {
    this.loadStats();
    this.loadArtifacts();
    this.loadTools();
    this.loadWorkflows();
    this.loadSettings();
    this.loadRecentActivities();
  }

  /**
   * Richtet periodische Updates der Daten ein
   */
  setupPeriodicUpdates() {
    // Statistiken alle 10 Sekunden aktualisieren
    setInterval(this.loadStats.bind(this), 10000);
    
    // Artefakte und Aktivitäten alle 30 Sekunden aktualisieren
    setInterval(this.loadArtifacts.bind(this), 30000);
    setInterval(this.loadRecentActivities.bind(this), 30000);
  }

  /**
   * Lädt die Systemstatistiken vom Server
   */
  async loadStats() {
    try {
      const response = await fetch(API.STATS);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Statistiken');
      }
      
      const data = await response.json();
      if (data.success) {
        const stats = data.stats;
        
        // Server-Status aktualisieren
        document.getElementById('serverStatus').className = 'status-indicator ' + 
          (stats.server.running ? 'status-active' : 'status-inactive');
        document.getElementById('serverVersion').textContent = stats.server.version || '1.0.0';
        document.getElementById('serverUptime').textContent = stats.server.uptimeFormatted || '0d 0h 0m 0s';
        document.getElementById('serverEnvironment').textContent = stats.server.environment || 'Entwicklung';
        
        // CPU- und Speichernutzung aktualisieren
        const cpuPercent = stats.process?.cpuUsage ? 
          (stats.process.cpuUsage.user / 1000000).toFixed(1) : '0.0';
        document.getElementById('cpuUsage').style.width = `${Math.min(cpuPercent, 100)}%`;
        document.getElementById('cpuUsage').textContent = `${cpuPercent}%`;
        
        if (stats.process?.memoryUsage) {
          const memoryPercent = (stats.process.memoryUsage.heapUsed / stats.process.memoryUsage.heapTotal * 100).toFixed(1);
          document.getElementById('memoryUsage').style.width = `${memoryPercent}%`;
          document.getElementById('memoryUsage').textContent = `${memoryPercent}%`;
        }
        
        document.getElementById('freeMemory').textContent = stats.system?.freeMemory || '0 MB';
      }
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      this.showToast('Fehler beim Laden der Systemstatistiken', 'error');
    }
  }

  /**
   * Lädt die Artefakte vom Server
   */
  async loadArtifacts() {
    try {
      const response = await fetch(API.ARTIFACTS);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Artefakte');
      }
      
      const data = await response.json();
      if (data.success && data.artifacts) {
        document.getElementById('artifactsCount').textContent = data.artifacts.length;
        
        const tableBody = document.getElementById('artifactsTableBody');
        if (data.artifacts.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Keine Artefakte verfügbar</td></tr>';
          return;
        }
        
        tableBody.innerHTML = '';
        data.artifacts.forEach(artifact => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${this.escapeHtml(artifact.name)}</td>
            <td>${this.escapeHtml(artifact.type)}</td>
            <td>
              <span class="status-indicator ${artifact.status === 'active' ? 'status-active' : 'status-inactive'}"></span>
              ${this.escapeHtml(artifact.status)}
            </td>
            <td>${new Date(artifact.createdAt).toLocaleString()}</td>
            <td>${artifact.currentUsage} / ${artifact.maxUsage || '∞'}</td>
            <td>
              <button class="btn btn-sm btn-primary me-1 artifact-details-btn" data-id="${artifact.id}">Details</button>
              <button class="btn btn-sm btn-danger artifact-delete-btn" data-id="${artifact.id}">Löschen</button>
            </td>
          `;
          tableBody.appendChild(row);
        });
        
        // Event-Listener für die Artefakt-Buttons hinzufügen
        document.querySelectorAll('.artifact-details-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.showArtifactDetails(e.target.dataset.id));
        });
        
        document.querySelectorAll('.artifact-delete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.deleteArtifact(e.target.dataset.id));
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Artefakte:', error);
      this.showToast('Fehler beim Laden der Artefakte', 'error');
    }
  }

  /**
   * Lädt die verfügbaren Tools vom Server
   */
  async loadTools() {
    try {
      const response = await fetch(API.TOOLS);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Tools');
      }
      
      const data = await response.json();
      if (data.success && data.tools) {
        const toolsGrid = document.getElementById('toolsGrid');
        toolsGrid.innerHTML = '';
        
        data.tools.forEach(tool => {
          const col = document.createElement('div');
          col.className = 'col-md-4 mb-4';
          col.innerHTML = `
            <div class="card h-100">
              <div class="card-header">${this.escapeHtml(tool.name)}</div>
              <div class="card-body">
                <p>${this.escapeHtml(tool.description || 'Keine Beschreibung verfügbar')}</p>
                <div class="d-flex justify-content-between align-items-end">
                  <small>${tool.category || 'Allgemein'}</small>
                  <button class="btn btn-sm btn-primary tool-execute-btn" data-tool="${tool.name}">Tool ausführen</button>
                </div>
              </div>
            </div>
          `;
          toolsGrid.appendChild(col);
        });
        
        // Event-Listener für die Tool-Buttons hinzufügen
        document.querySelectorAll('.tool-execute-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.showToolExecutionModal(e.target.dataset.tool));
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Tools:', error);
      this.showToast('Fehler beim Laden der Tools', 'error');
    }
  }

  /**
   * Lädt die verfügbaren Workflows vom Server
   */
  async loadWorkflows() {
    try {
      const response = await fetch(API.WORKFLOWS);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Workflows');
      }
      
      const data = await response.json();
      if (data.success && data.workflows) {
        const tableBody = document.getElementById('workflowsTableBody');
        if (data.workflows.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Keine Workflows verfügbar</td></tr>';
          return;
        }
        
        tableBody.innerHTML = '';
        data.workflows.forEach(workflow => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${this.escapeHtml(workflow.name)}</td>
            <td>${this.escapeHtml(workflow.description || 'Keine Beschreibung')}</td>
            <td>${workflow.steps ? workflow.steps.length : 0}</td>
            <td>
              <button class="btn btn-sm btn-primary me-1 workflow-execute-btn" data-id="${workflow.id}">Ausführen</button>
              <button class="btn btn-sm btn-secondary workflow-details-btn" data-id="${workflow.id}">Details</button>
            </td>
          `;
          tableBody.appendChild(row);
        });
        
        // Event-Listener für die Workflow-Buttons hinzufügen
        document.querySelectorAll('.workflow-execute-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.showWorkflowExecutionModal(e.target.dataset.id));
        });
        
        document.querySelectorAll('.workflow-details-btn').forEach(btn => {
          btn.addEventListener('click', (e) => this.showWorkflowDetails(e.target.dataset.id));
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Workflows:', error);
      this.showToast('Fehler beim Laden der Workflows', 'error');
    }
  }

  /**
   * Lädt die Systemeinstellungen vom Server
   */
  async loadSettings() {
    try {
      const response = await fetch(API.SETTINGS);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Einstellungen');
      }
      
      const data = await response.json();
      if (data.success && data.settings) {
        const settings = data.settings;
        
        // Formularfelder füllen
        if (settings.system) {
          document.getElementById('logLevel').value = settings.system.logLevel || 'info';
        }
        
        if (settings.database) {
          document.getElementById('backupEnabled').checked = settings.database.backupEnabled !== false;
          document.getElementById('backupInterval').value = settings.database.backupInterval || 24;
          document.getElementById('maxBackups').value = settings.database.maxBackups || 7;
        }
        
        if (settings.api) {
          document.getElementById('apiTimeout').value = settings.api.timeout || 30000;
        }
        
        if (settings.security) {
          document.getElementById('defaultRequireApproval').checked = settings.security.requireApprovalByDefault !== false;
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      this.showToast('Fehler beim Laden der Einstellungen', 'error');
    }
  }

  /**
   * Lädt die letzten Aktivitäten vom Server
   */
  async loadRecentActivities() {
    try {
      const response = await fetch('/api/activities');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Aktivitäten');
      }
      
      const data = await response.json();
      if (data.success && data.activities) {
        const activitiesList = document.getElementById('recentActivities');
        if (data.activities.length === 0) {
          activitiesList.innerHTML = '<li class="list-group-item text-center">Keine Aktivitäten verfügbar</li>';
          return;
        }
        
        activitiesList.innerHTML = '';
        data.activities.slice(0, 5).forEach(activity => {
          const item = document.createElement('li');
          item.className = 'list-group-item';
          item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
              <span>${this.escapeHtml(activity.description)}</span>
              <small class="text-muted">${this.formatTimeAgo(activity.timestamp)}</small>
            </div>
          `;
          activitiesList.appendChild(item);
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Aktivitäten:', error);
      // Keine Toast-Nachricht für diesen nicht-kritischen Fehler
    }
  }

  /**
   * Speichert die Systemeinstellungen
   */
  async saveSettings(e) {
    e.preventDefault();
    
    const settings = {
      system: {
        logLevel: document.getElementById('logLevel').value
      },
      database: {
        backupEnabled: document.getElementById('backupEnabled').checked,
        backupInterval: parseInt(document.getElementById('backupInterval').value, 10),
        maxBackups: parseInt(document.getElementById('maxBackups').value, 10)
      },
      api: {
        timeout: parseInt(document.getElementById('apiTimeout').value, 10)
      },
      security: {
        requireApprovalByDefault: document.getElementById('defaultRequireApproval').checked
      }
    };
    
    try {
      const response = await fetch(API.SETTINGS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Einstellungen');
      }
      
      this.showToast('Einstellungen wurden erfolgreich gespeichert', 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      this.showToast('Fehler beim Speichern der Einstellungen', 'error');
    }
  }

  /**
   * Setzt die Einstellungen auf die Standardwerte zurück
   */
  async resetSettings() {
    if (confirm('Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
      try {
        const response = await fetch(`${API.SETTINGS}/reset`);
        if (!response.ok) {
          throw new Error('Fehler beim Zurücksetzen der Einstellungen');
        }
        
        this.showToast('Einstellungen wurden auf die Standardwerte zurückgesetzt', 'success');
        this.loadSettings();
      } catch (error) {
        console.error('Fehler beim Zurücksetzen der Einstellungen:', error);
        this.showToast('Fehler beim Zurücksetzen der Einstellungen', 'error');
      }
    }
  }

  /**
   * Zeigt ein Modal zur Ausführung eines Tools an
   */
  showToolExecutionModal(toolName) {
    alert(`Funktion zum Ausführen des Tools ${toolName} (noch nicht implementiert)`);
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Zeigt ein Modal mit den Workflow-Details an
   */
  showWorkflowDetails(workflowId) {
    alert(`Funktion zum Anzeigen der Workflow-Details für ${workflowId} (noch nicht implementiert)`);
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Zeigt ein Modal zur Ausführung eines Workflows an
   */
  showWorkflowExecutionModal(workflowId) {
    alert(`Funktion zum Ausführen des Workflows ${workflowId} (noch nicht implementiert)`);
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Zeigt ein Modal mit den Artefakt-Details an
   */
  showArtifactDetails(artifactId) {
    alert(`Funktion zum Anzeigen der Artefakt-Details für ${artifactId} (noch nicht implementiert)`);
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Löscht ein Artefakt
   */
  async deleteArtifact(artifactId) {
    if (confirm('Möchten Sie dieses Artefakt wirklich löschen?')) {
      try {
        const response = await fetch(`${API.ARTIFACTS}/${artifactId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Fehler beim Löschen des Artefakts');
        }
        
        this.showToast('Artefakt wurde erfolgreich gelöscht', 'success');
        this.loadArtifacts();
      } catch (error) {
        console.error('Fehler beim Löschen des Artefakts:', error);
        this.showToast('Fehler beim Löschen des Artefakts', 'error');
      }
    }
  }

  /**
   * Zeigt ein Modal zum Erstellen eines Tool-Artefakts an
   */
  showCreateToolArtifactModal() {
    alert('Funktion zum Erstellen eines Tool-Artefakts (noch nicht implementiert)');
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Zeigt ein Modal zum Erstellen eines Workflow-Artefakts an
   */
  showCreateWorkflowArtifactModal() {
    alert('Funktion zum Erstellen eines Workflow-Artefakts (noch nicht implementiert)');
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Zeigt ein Modal mit den Ausführungen an
   */
  showExecutionsModal() {
    alert('Funktion zum Anzeigen der Ausführungen (noch nicht implementiert)');
    // Hier würde normalerweise ein Modal geöffnet werden
  }

  /**
   * Zeigt eine Toast-Benachrichtigung an
   */
  showToast(message, type = 'info') {
    // Prüfen, ob der Toast-Container existiert
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
    
    // Toast-Element erstellen
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${this.escapeHtml(message)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Schließen"></button>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Toast initialisieren und anzeigen
    const bsToast = new bootstrap.Toast(toast, {
      autohide: true,
      delay: 5000
    });
    bsToast.show();
    
    // Toast nach dem Ausblenden entfernen
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }

  /**
   * Formatiert einen Zeitstempel als "X Zeit her"
   */
  formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSec < 60) {
      return 'gerade eben';
    } else if (diffMin < 60) {
      return `vor ${diffMin} ${diffMin === 1 ? 'Minute' : 'Minuten'}`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} ${diffHours === 1 ? 'Stunde' : 'Stunden'}`;
    } else if (diffDays < 30) {
      return `vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Escaping von HTML, um XSS zu verhindern
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// UI-Controller initialisieren, wenn das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  window.uiController = new UIController();
}); 