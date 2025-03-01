/**
 * React-Komponenten für die Artefakt-Integration in Claude.ai Desktop
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Button, Card, Form, Modal, Alert, Table, 
  Container, Row, Col, Badge, Spinner,
  OverlayTrigger, Tooltip, Tab, Tabs
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTools, faCheck, faTimes, faHistory, 
  faInfoCircle, faTrash, faLink, faClock,
  faCopy, faBox, faList, faPlus, faRocket
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';

// Typdefinitionen
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

interface Artifact {
  id: string;
  name: string;
  description: string;
  toolName: string;
  url: string;
  requiredApproval: boolean;
  createdAt: string;
  expiresAt?: string;
  usageCount: number;
  maxUsage?: number;
  isExpired?: boolean;
  hasReachedMaxUsage?: boolean;
}

interface ToolResult {
  parameters: Record<string, any>;
  result: any;
  executedAt: string;
  userId: string;
}

/**
 * Komponente für die Artefaktgenehmigung
 */
export const ArtifactApprovalModal: React.FC<{
  show: boolean;
  onHide: () => void;
  artifact: any;
  parameters: Record<string, any>;
  onApprove: () => void;
  onReject: () => void;
}> = ({ show, onHide, artifact, parameters, onApprove, onReject }) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faTools} className="me-2" />
          Tool-Ausführung genehmigen
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          Eine externe Anwendung möchte das folgende Tool ausführen:
        </Alert>
        
        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>{artifact?.name || 'Unbekanntes Artefakt'}</strong>
            <Badge bg="primary">{artifact?.toolName || 'Unbekanntes Tool'}</Badge>
          </Card.Header>
          <Card.Body>
            <p>{artifact?.description || 'Keine Beschreibung verfügbar'}</p>
            <hr />
            <h6>Eingabeparameter:</h6>
            <pre className="bg-light p-2 rounded">
              {JSON.stringify(parameters, null, 2)}
            </pre>
          </Card.Body>
        </Card>
        
        <Alert variant="warning">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          Bitte prüfen Sie die Parameter sorgfältig, bevor Sie fortfahren.
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onReject}>
          <FontAwesomeIcon icon={faTimes} className="me-1" />
          Ablehnen
        </Button>
        <Button variant="primary" onClick={onApprove}>
          <FontAwesomeIcon icon={faCheck} className="me-1" />
          Genehmigen
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/**
 * Komponente für die Artefakterstellung
 */
export const ArtifactCreationForm: React.FC<{
  availableTools: Tool[];
  onSubmit: (formData: any) => Promise<void>;
}> = ({ availableTools, onSubmit }) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    toolName: '',
    allowedParameters: {},
    requiredApproval: true,
    expiresAfterDays: 30,
    maxUsage: 100,
    enableDataStorage: true,
    storeResults: true,
    dbTable: ''
  });
  
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [parameterFields, setParameterFields] = useState<Array<{
    name: string;
    type: string;
    required: boolean;
    default: any;
    enum: string[];
    description: string;
  }>>([]);
  
  // Tool-Parameter laden, wenn das Tool ausgewählt wird
  useEffect(() => {
    if (formData.toolName && availableTools) {
      const tool = availableTools.find(t => t.name === formData.toolName);
      setSelectedTool(tool || null);
      
      if (tool && tool.parameters) {
        // Initialisiere Parameter-Felder basierend auf Tool-Definition
        const fields = Object.entries(tool.parameters).map(([key, param]) => ({
          name: key,
          type: param.type || 'string',
          required: param.required || false,
          default: param.default || '',
          enum: param.enum || [],
          description: param.description || ''
        }));
        
        setParameterFields(fields);
        
        // Erstelle leeres allowedParameters-Objekt
        const allowedParams: Record<string, any> = {};
        fields.forEach(field => {
          allowedParams[field.name] = {
            type: field.type,
            required: field.required
          };
          
          if (field.enum.length > 0) {
            allowedParams[field.name].enum = field.enum;
          }
          
          if (field.default) {
            allowedParams[field.name].default = field.default;
          }
        });
        
        setFormData(prev => ({
          ...prev,
          allowedParameters: allowedParams
        }));
      }
    }
  }, [formData.toolName, availableTools]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      await onSubmit(formData);
      // Formular zurücksetzen
      setFormData({
        name: '',
        description: '',
        toolName: '',
        allowedParameters: {},
        requiredApproval: true,
        expiresAfterDays: 30,
        maxUsage: 100,
        enableDataStorage: true,
        storeResults: true,
        dbTable: ''
      });
      setSelectedTool(null);
      setParameterFields([]);
      
      showToast('Erfolg', 'Artefakt erfolgreich erstellt', 'success');
    } catch (error) {
      showToast('Fehler', `Fehler beim Erstellen des Artefakts: ${error.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      <h4 className="mb-3">
        <FontAwesomeIcon icon={faPlus} className="me-2" />
        Neues Tool-Artefakt erstellen
      </h4>
      
      <Form.Group className="mb-3">
        <Form.Label>Name des Artefakts</Form.Label>
        <Form.Control 
          type="text" 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          required
          placeholder="z.B. Amazon Produktanalyse"
        />
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label>Beschreibung</Form.Label>
        <Form.Control 
          as="textarea" 
          rows={3}
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          required
          placeholder="Beschreiben Sie, was dieses Artefakt tut..."
        />
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label>Auszuführendes Tool</Form.Label>
        <Form.Select 
          value={formData.toolName}
          onChange={e => setFormData({...formData, toolName: e.target.value})}
          required
        >
          <option value="">-- Tool auswählen --</option>
          {availableTools && availableTools.map(tool => (
            <option key={tool.name} value={tool.name}>
              {tool.name} - {tool.description}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      
      {selectedTool && (
        <>
          <h5 className="mt-4">Parameterkonfiguration</h5>
          <Alert variant="info">
            <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
            Definieren Sie, welche Parameter erlaubt sind und wie sie eingeschränkt werden sollen.
          </Alert>
          
          {parameterFields.map(field => (
            <Card key={field.name} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <strong>{field.name}</strong>
                {field.required && <Badge bg="danger">Erforderlich</Badge>}
              </Card.Header>
              <Card.Body>
                <p>{field.description}</p>
                <Form.Group>
                  <Form.Label>Parameter-Typ</Form.Label>
                  <Form.Select 
                    value={formData.allowedParameters[field.name]?.type || field.type}
                    onChange={e => {
                      const updatedParams = {...formData.allowedParameters};
                      updatedParams[field.name] = {
                        ...updatedParams[field.name],
                        type: e.target.value
                      };
                      setFormData({...formData, allowedParameters: updatedParams});
                    }}
                  >
                    <option value="string">Text (String)</option>
                    <option value="number">Zahl (Number)</option>
                    <option value="boolean">Ja/Nein (Boolean)</option>
                    <option value="object">Objekt (Object)</option>
                    <option value="array">Liste (Array)</option>
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mt-2">
                  <Form.Check 
                    type="checkbox"
                    label="Parameter ist erforderlich"
                    checked={formData.allowedParameters[field.name]?.required || field.required}
                    onChange={e => {
                      const updatedParams = {...formData.allowedParameters};
                      updatedParams[field.name] = {
                        ...updatedParams[field.name],
                        required: e.target.checked
                      };
                      setFormData({...formData, allowedParameters: updatedParams});
                    }}
                  />
                </Form.Group>
                
                {field.enum.length > 0 && (
                  <Form.Group className="mt-2">
                    <Form.Label>Erlaubte Werte</Form.Label>
                    <Form.Control 
                      as="textarea"
                      rows={2}
                      value={formData.allowedParameters[field.name]?.enum?.join(', ') || field.enum.join(', ')}
                      onChange={e => {
                        const values = e.target.value.split(',').map(v => v.trim());
                        const updatedParams = {...formData.allowedParameters};
                        updatedParams[field.name] = {
                          ...updatedParams[field.name],
                          enum: values
                        };
                        setFormData({...formData, allowedParameters: updatedParams});
                      }}
                      placeholder="Werte durch Kommas getrennt eingeben"
                    />
                  </Form.Group>
                )}
                
                <Form.Group className="mt-2">
                  <Form.Label>Standardwert (optional)</Form.Label>
                  <Form.Control 
                    type="text"
                    value={formData.allowedParameters[field.name]?.default || field.default || ''}
                    onChange={e => {
                      const updatedParams = {...formData.allowedParameters};
                      updatedParams[field.name] = {
                        ...updatedParams[field.name],
                        default: e.target.value
                      };
                      setFormData({...formData, allowedParameters: updatedParams});
                    }}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          ))}
        </>
      )}
      
      <h5 className="mt-4">Artefakt-Konfiguration</h5>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              label="Benutzerabstimmung erforderlich"
              checked={formData.requiredApproval}
              onChange={e => setFormData({...formData, requiredApproval: e.target.checked})}
            />
            <Form.Text className="text-muted">
              Der Benutzer muss jede Ausführung genehmigen
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Läuft ab nach (Tage)</Form.Label>
            <Form.Control 
              type="number" 
              value={formData.expiresAfterDays}
              onChange={e => setFormData({...formData, expiresAfterDays: parseInt(e.target.value)})}
              min="0"
            />
            <Form.Text className="text-muted">
              0 = Kein Ablaufdatum
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Maximale Nutzungen</Form.Label>
            <Form.Control 
              type="number" 
              value={formData.maxUsage}
              onChange={e => setFormData({...formData, maxUsage: parseInt(e.target.value)})}
              min="0"
            />
            <Form.Text className="text-muted">
              0 = Unbegrenzte Nutzungen
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              label="Datenspeicherung aktivieren"
              checked={formData.enableDataStorage}
              onChange={e => setFormData({...formData, enableDataStorage: e.target.checked})}
            />
            <Form.Text className="text-muted">
              Speichert Ergebnisse in der Datenbank
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
      
      {formData.enableDataStorage && (
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox"
                label="Ergebnisse speichern"
                checked={formData.storeResults}
                onChange={e => setFormData({...formData, storeResults: e.target.checked})}
              />
              <Form.Text className="text-muted">
                Speichert die vollständigen Ergebnisse
              </Form.Text>
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Datenbanktabelle (optional)</Form.Label>
              <Form.Control 
                type="text"
                value={formData.dbTable}
                onChange={e => setFormData({...formData, dbTable: e.target.value})}
                placeholder="tool_results"
              />
              <Form.Text className="text-muted">
                Benutzerdefinierte Tabelle für Ergebnisse
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
      )}
      
      <Button 
        type="submit" 
        variant="primary"
        disabled={isLoading}
        className="mt-3 mb-5"
      >
        {isLoading ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              className="me-2"
            />
            Wird erstellt...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Artefakt erstellen
          </>
        )}
      </Button>
    </Form>
  );
};

/**
 * Komponente für die Anzeige der Artefakte
 */
export const ArtifactList: React.FC<{
  onRefresh: () => void;
  onViewResults: (artifactId: string) => void;
  onDelete: (artifactId: string) => void;
}> = ({ onRefresh, onViewResults, onDelete }) => {
  const { showToast } = useToast();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [includeExpired, setIncludeExpired] = useState(false);
  
  // Lade Artefakte
  const loadArtifacts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/artifacts/list?includeExpired=${includeExpired}`);
      
      if (response.data.success) {
        setArtifacts(response.data.artifacts);
      } else {
        showToast('Fehler', 'Fehler beim Laden der Artefakte', 'danger');
      }
    } catch (error) {
      showToast('Fehler', `Fehler beim Laden der Artefakte: ${error.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lade Artefakte beim Mounten
  useEffect(() => {
    loadArtifacts();
  }, [includeExpired]);
  
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Erfolg', 'URL in die Zwischenablage kopiert', 'success');
  };
  
  const handleDelete = async (artifactId: string) => {
    if (!window.confirm('Möchten Sie dieses Artefakt wirklich löschen?')) {
      return;
    }
    
    try {
      const response = await axios.delete(`/api/artifacts/${artifactId}`);
      
      if (response.data.success) {
        showToast('Erfolg', 'Artefakt erfolgreich gelöscht', 'success');
        loadArtifacts();
        onRefresh();
      } else {
        showToast('Fehler', 'Fehler beim Löschen des Artefakts', 'danger');
      }
    } catch (error) {
      showToast('Fehler', `Fehler beim Löschen des Artefakts: ${error.message}`, 'danger');
    }
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>
          <FontAwesomeIcon icon={faList} className="me-2" />
          Meine Tool-Artefakte
        </h4>
        
        <div>
          <Form.Check 
            type="switch"
            id="include-expired"
            label="Abgelaufene anzeigen"
            checked={includeExpired}
            onChange={e => setIncludeExpired(e.target.checked)}
            className="mb-2"
          />
          
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => loadArtifacts()}
            className="ms-2"
          >
            <FontAwesomeIcon icon={faHistory} className="me-1" />
            Aktualisieren
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Wird geladen...</span>
          </Spinner>
        </div>
      ) : artifacts.length === 0 ? (
        <Alert variant="info">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          Keine Artefakte gefunden. Erstellen Sie ein neues Artefakt, um zu beginnen.
        </Alert>
      ) : (
        <div className="artifact-list">
          {artifacts.map(artifact => (
            <Card 
              key={artifact.id} 
              className="mb-3"
              bg={artifact.isExpired || artifact.hasReachedMaxUsage ? 'light' : undefined}
            >
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{artifact.name}</strong>
                  {artifact.isExpired && (
                    <Badge bg="warning" text="dark" className="ms-2">Abgelaufen</Badge>
                  )}
                  {artifact.hasReachedMaxUsage && (
                    <Badge bg="secondary" className="ms-2">Limit erreicht</Badge>
                  )}
                </div>
                
                <div>
                  <Badge bg="primary" className="me-2">{artifact.toolName}</Badge>
                  {artifact.requiredApproval ? (
                    <Badge bg="info">Genehmigung erforderlich</Badge>
                  ) : (
                    <Badge bg="success">Direkte Ausführung</Badge>
                  )}
                </div>
              </Card.Header>
              
              <Card.Body>
                <p>{artifact.description}</p>
                
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted me-3">
                      <FontAwesomeIcon icon={faRocket} className="me-1" />
                      {artifact.usageCount} Nutzungen 
                      {artifact.maxUsage ? ` / ${artifact.maxUsage} max.` : ''}
                    </small>
                    
                    <small className="text-muted">
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      Erstellt am {new Date(artifact.createdAt).toLocaleDateString()}
                    </small>
                    
                    {artifact.expiresAt && (
                      <small className="text-muted ms-3">
                        <FontAwesomeIcon icon={faClock} className="me-1" />
                        Läuft ab am {new Date(artifact.expiresAt).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                  
                  <div>
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>URL kopieren</Tooltip>}
                    >
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleCopyUrl(artifact.url)}
                      >
                        <FontAwesomeIcon icon={faCopy} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Ergebnisse anzeigen</Tooltip>}
                    >
                      <Button 
                        variant="outline-info" 
                        size="sm" 
                        className="me-2"
                        onClick={() => onViewResults(artifact.id)}
                      >
                        <FontAwesomeIcon icon={faHistory} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Artefakt löschen</Tooltip>}
                    >
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(artifact.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </OverlayTrigger>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Komponente für die Anzeige der Artefakt-Ergebnisse
 */
export const ArtifactResultsViewer: React.FC<{
  artifactId: string;
  onClose: () => void;
}> = ({ artifactId, onClose }) => {
  const { showToast } = useToast();
  const [results, setResults] = useState<ToolResult[]>([]);
  const [artifact, setArtifact] = useState<Partial<Artifact> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Lade Ergebnisse
  useEffect(() => {
    const loadResults = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`/api/artifacts/results/${artifactId}`);
        
        if (response.data.success) {
          setResults(response.data.results);
          setArtifact(response.data.artifact);
        } else {
          showToast('Fehler', response.data.message || 'Fehler beim Laden der Ergebnisse', 'danger');
        }
      } catch (error) {
        showToast('Fehler', `Fehler beim Laden der Ergebnisse: ${error.message}`, 'danger');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadResults();
  }, [artifactId]);
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>
          <FontAwesomeIcon icon={faHistory} className="me-2" />
          Ausführungsergebnisse
        </h4>
        
        <Button variant="outline-secondary" size="sm" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} className="me-1" />
          Schließen
        </Button>
      </div>
      
      {artifact && (
        <Alert variant="info" className="mb-3">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          Zeige Ergebnisse für Artefakt <strong>{artifact.name}</strong> ({artifact.tool_name})
        </Alert>
      )}
      
      {isLoading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Wird geladen...</span>
          </Spinner>
        </div>
      ) : results.length === 0 ? (
        <Alert variant="warning">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          Keine Ergebnisse gefunden. Möglicherweise wurde das Artefakt noch nicht ausgeführt, oder die Datenspeicherung ist deaktiviert.
        </Alert>
      ) : (
        <div className="results-list">
          {results.map((result, index) => (
            <Card key={index} className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Ausführung am {new Date(result.executedAt).toLocaleString()}</span>
                <Badge bg="info">Benutzer: {result.userId}</Badge>
              </Card.Header>
              
              <Card.Body>
                <Tabs defaultActiveKey="parameters" id={`result-tabs-${index}`} className="mb-3">
                  <Tab eventKey="parameters" title="Parameter">
                    <pre className="bg-light p-3 rounded">
                      {JSON.stringify(result.parameters, null, 2)}
                    </pre>
                  </Tab>
                  
                  <Tab eventKey="result" title="Ergebnis">
                    <pre className="bg-light p-3 rounded">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Haupt-Artefakt-Manager-Komponente
 */
export const ArtifactManager: React.FC<{}> = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('list');
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Lade verfügbare Tools
  useEffect(() => {
    const loadTools = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/tools');
        
        if (response.data.success) {
          setAvailableTools(response.data.tools);
        }
      } catch (error) {
        showToast('Fehler', `Fehler beim Laden der Tools: ${error.message}`, 'danger');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTools();
  }, []);
  
  const handleCreateArtifact = async (formData: any) => {
    try {
      const response = await axios.post('/api/artifacts/create', formData);
      
      if (response.data.success) {
        setActiveTab('list');
        return response.data.artifact;
      } else {
        throw new Error(response.data.error || 'Unbekannter Fehler');
      }
    } catch (error) {
      throw error;
    }
  };
  
  const handleViewResults = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setActiveTab('results');
  };
  
  const handleCloseResults = () => {
    setSelectedArtifactId(null);
    setActiveTab('list');
  };
  
  if (isLoading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Wird geladen...</span>
        </Spinner>
      </Container>
    );
  }
  
  return (
    <Container className="my-4">
      <h2 className="mb-4">
        <FontAwesomeIcon icon={faBox} className="me-2" />
        Claude.ai Desktop Tool-Artefakte
      </h2>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(key) => key && setActiveTab(key)}
        className="mb-4"
      >
        <Tab eventKey="list" title="Meine Artefakte">
          {activeTab === 'list' && (
            <ArtifactList 
              onRefresh={() => {}} 
              onViewResults={handleViewResults}
              onDelete={() => {}}
            />
          )}
        </Tab>
        
        <Tab eventKey="create" title="Neues Artefakt">
          {activeTab === 'create' && (
            <ArtifactCreationForm 
              availableTools={availableTools}
              onSubmit={handleCreateArtifact}
            />
          )}
        </Tab>
        
        <Tab eventKey="results" title="Ergebnisse" disabled={!selectedArtifactId}>
          {activeTab === 'results' && selectedArtifactId && (
            <ArtifactResultsViewer 
              artifactId={selectedArtifactId}
              onClose={handleCloseResults}
            />
          )}
        </Tab>
      </Tabs>
    </Container>
  );
}; 