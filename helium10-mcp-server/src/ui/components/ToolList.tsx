import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Input, Alert, Typography, Spin, Modal, Tabs, Collapse } from 'antd';
import { SearchOutlined, ReloadOutlined, InfoCircleOutlined, CodeOutlined } from '@ant-design/icons';
import { useToast } from '../hooks/useToast';
import { getRegisteredTools, getRegisteredWorkflows } from '../api/tool-api';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

/**
 * Komponente zur Anzeige aller verfügbaren Tools und Workflows
 */
export const ToolList: React.FC = () => {
  const { showToast } = useToast();
  
  // State für Tools
  const [loadingTools, setLoadingTools] = useState<boolean>(false);
  const [tools, setTools] = useState<any[]>([]);
  const [filteredTools, setFilteredTools] = useState<any[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [toolDetailsVisible, setToolDetailsVisible] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  
  // State für Workflows
  const [loadingWorkflows, setLoadingWorkflows] = useState<boolean>(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<any[]>([]);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [workflowDetailsVisible, setWorkflowDetailsVisible] = useState<boolean>(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  
  // Tools und Workflows beim Initialisieren laden
  useEffect(() => {
    loadTools();
    loadWorkflows();
  }, []);
  
  // Tools laden
  const loadTools = async () => {
    setLoadingTools(true);
    setToolsError(null);
    
    try {
      // In einer realen Anwendung würden wir die Tools von der API laden
      // const response = await getRegisteredTools();
      // setTools(response.tools);
      
      // Simulierte Tool-Daten für die Demo
      const mockTools = [
        {
          name: 'analyze_product',
          description: 'Analysiert ein Amazon-Produkt basierend auf ASIN und liefert detaillierte Informationen',
          category: 'Produktanalyse',
          parameters: {
            asin: {
              type: 'string',
              description: 'Amazon ASIN des Produkts',
              required: true
            },
            marketplace: {
              type: 'string',
              enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
              default: 'amazon.de',
              description: 'Amazon Marketplace'
            },
            analysisDepth: {
              type: 'string',
              enum: ['basic', 'detailed', 'comprehensive'],
              default: 'detailed',
              description: 'Tiefe der Analyse'
            }
          },
          returns: {
            type: 'object',
            description: 'Detaillierte Produktinformationen und Analysen'
          },
          example: `// Beispiel für einen Aufruf
const result = await callTool('analyze_product', {
  asin: 'B08R2KLM7S',
  marketplace: 'amazon.de',
  analysisDepth: 'detailed'
});`,
          version: '1.2.0',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: 'magnet_keyword_research',
          description: 'Führt eine Keyword-Recherche durch und liefert verwandte Keywords mit Suchvolumen',
          category: 'Keyword-Recherche',
          parameters: {
            keyword: {
              type: 'string',
              description: 'Zu analysierendes Keyword',
              required: true
            },
            marketplace: {
              type: 'string',
              enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
              default: 'amazon.de',
              description: 'Amazon Marketplace'
            },
            limit: {
              type: 'number',
              default: 100,
              description: 'Maximale Anzahl der zurückgegebenen Keywords'
            }
          },
          returns: {
            type: 'array',
            description: 'Liste verwandter Keywords mit Suchvolumen und Relevanz'
          },
          example: `// Beispiel für einen Aufruf
const result = await callTool('magnet_keyword_research', {
  keyword: 'yoga matte',
  marketplace: 'amazon.de',
  limit: 50
});`,
          version: '2.0.1',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: 'complete_product_research',
          description: 'Führt eine vollständige Produktrecherche durch, einschließlich Wettbewerbsanalyse',
          category: 'Produktanalyse',
          parameters: {
            keyword: {
              type: 'string',
              description: 'Hauptkeyword für die Produktrecherche',
              required: true
            },
            marketplace: {
              type: 'string',
              enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
              default: 'amazon.de',
              description: 'Amazon Marketplace'
            },
            includeBSR: {
              type: 'boolean',
              default: true,
              description: 'Bestseller-Rang (BSR) mit einbeziehen'
            },
            includeReviews: {
              type: 'boolean',
              default: true,
              description: 'Bewertungsdaten mit einbeziehen'
            }
          },
          returns: {
            type: 'object',
            description: 'Umfassende Produktrecherche-Ergebnisse mit Wettbewerbsanalyse'
          },
          example: `// Beispiel für einen Aufruf
const result = await callTool('complete_product_research', {
  keyword: 'bluetooth kopfhörer',
  marketplace: 'amazon.de',
  includeBSR: true,
  includeReviews: true
});`,
          version: '1.0.0',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: 'generate_product_description',
          description: 'Generiert eine SEO-optimierte Produktbeschreibung basierend auf Keywords und Produkteigenschaften',
          category: 'Content-Generierung',
          parameters: {
            productName: {
              type: 'string',
              description: 'Name des Produkts',
              required: true
            },
            keywords: {
              type: 'array',
              description: 'Array von Keywords für die Optimierung',
              required: true
            },
            features: {
              type: 'array',
              description: 'Array von Produkteigenschaften',
              required: true
            },
            language: {
              type: 'string',
              enum: ['de', 'en', 'fr', 'es', 'it'],
              default: 'de',
              description: 'Sprache der Produktbeschreibung'
            },
            length: {
              type: 'string',
              enum: ['short', 'medium', 'long'],
              default: 'medium',
              description: 'Länge der Beschreibung'
            }
          },
          returns: {
            type: 'object',
            description: 'Generierte Produktbeschreibung mit Title, Bullet Points und Description'
          },
          example: `// Beispiel für einen Aufruf
const result = await callTool('generate_product_description', {
  productName: 'Bluetooth Kopfhörer XYZ-200',
  keywords: ['bluetooth kopfhörer', 'kabellos', 'noise cancelling'],
  features: ['30h Akkulaufzeit', 'Active Noise Cancelling', 'IPX7 wasserdicht'],
  language: 'de',
  length: 'medium'
});`,
          version: '1.1.2',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: 'translate_text',
          description: 'Übersetzt Text in mehrere Sprachen, optimiert für Amazon-Produktinhalte',
          category: 'Übersetzung',
          parameters: {
            text: {
              type: 'string',
              description: 'Zu übersetzender Text',
              required: true
            },
            sourceLanguage: {
              type: 'string',
              enum: ['de', 'en', 'fr', 'es', 'it'],
              description: 'Quellsprache (auto-detect, wenn nicht angegeben)'
            },
            targetLanguages: {
              type: 'array',
              description: 'Zielsprachen für die Übersetzung',
              required: true
            },
            preserveFormatting: {
              type: 'boolean',
              default: true,
              description: 'Formatierung beibehalten'
            }
          },
          returns: {
            type: 'object',
            description: 'Übersetzungen in allen angegebenen Zielsprachen'
          },
          example: `// Beispiel für einen Aufruf
const result = await callTool('translate_text', {
  text: 'Hochwertige Bluetooth Kopfhörer mit erstklassigem Klang',
  sourceLanguage: 'de',
  targetLanguages: ['en', 'fr', 'es'],
  preserveFormatting: true
});`,
          version: '1.0.5',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setTools(mockTools);
      setFilteredTools(mockTools);
      setToolsError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Tools:', err);
      setToolsError('Tools konnten nicht geladen werden.');
      showToast('error', 'Fehler beim Laden der Tools');
    } finally {
      setLoadingTools(false);
    }
  };
  
  // Workflows laden
  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    setWorkflowsError(null);
    
    try {
      // In einer realen Anwendung würden wir die Workflows von der API laden
      // const response = await getRegisteredWorkflows();
      // setWorkflows(response.workflows);
      
      // Simulierte Workflow-Daten für die Demo
      const mockWorkflows = [
        {
          id: 'wf_12345',
          name: 'Vollständige Produktrecherche',
          description: 'Dieser Workflow führt eine vollständige Produktrecherche durch, inklusive Keyword-Analyse und Wettbewerbsvergleich',
          category: 'Produktanalyse',
          steps: [
            {
              id: 'step_1',
              name: 'Keyword-Recherche',
              toolName: 'magnet_keyword_research',
              description: 'Ermittelt relevante Keywords und deren Suchvolumen',
              parameters: { key: 'input.keyword', marketplace: 'input.marketplace', limit: 50 }
            },
            {
              id: 'step_2',
              name: 'Produkt-Analyse Top 5',
              toolName: 'analyze_product',
              description: 'Analysiert die Top 5 Produkte für das Hauptkeyword',
              parameters: { asin: 'context.topProducts[0]', marketplace: 'input.marketplace', analysisDepth: 'detailed' },
              condition: 'context.topProducts && context.topProducts.length > 0'
            },
            {
              id: 'step_3',
              name: 'Wettbewerbsanalyse',
              toolName: 'complete_product_research',
              description: 'Führt eine vollständige Wettbewerbsanalyse durch',
              parameters: { keyword: 'input.keyword', marketplace: 'input.marketplace', includeBSR: true, includeReviews: true }
            }
          ],
          parameters: {
            keyword: {
              type: 'string',
              description: 'Hauptkeyword für die Produktrecherche',
              required: true
            },
            marketplace: {
              type: 'string',
              enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
              default: 'amazon.de',
              description: 'Amazon Marketplace'
            }
          },
          returns: {
            type: 'object',
            description: 'Konsolidierte Ergebnisse der Produktrecherche'
          },
          version: '1.0.0',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wf_67890',
          name: 'Produktlisting-Optimierung',
          description: 'Analysiert ein bestehendes Produkt und generiert optimierte Inhalte für das Listing',
          category: 'Content-Optimierung',
          steps: [
            {
              id: 'step_1',
              name: 'Produkt-Analyse',
              toolName: 'analyze_product',
              description: 'Analysiert das bestehende Produkt',
              parameters: { asin: 'input.asin', marketplace: 'input.marketplace', analysisDepth: 'comprehensive' }
            },
            {
              id: 'step_2',
              name: 'Keyword-Recherche',
              toolName: 'magnet_keyword_research',
              description: 'Ermittelt optimale Keywords für das Produkt',
              parameters: { keyword: 'context.productTitle', marketplace: 'input.marketplace', limit: 30 }
            },
            {
              id: 'step_3',
              name: 'Generierung der Produktbeschreibung',
              toolName: 'generate_product_description',
              description: 'Erstellt eine optimierte Produktbeschreibung',
              parameters: { 
                productName: 'context.productTitle', 
                keywords: 'context.topKeywords', 
                features: 'context.productFeatures',
                language: 'input.language',
                length: 'input.contentLength'
              }
            }
          ],
          parameters: {
            asin: {
              type: 'string',
              description: 'ASIN des zu optimierenden Produkts',
              required: true
            },
            marketplace: {
              type: 'string',
              enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
              default: 'amazon.de',
              description: 'Amazon Marketplace'
            },
            language: {
              type: 'string',
              enum: ['de', 'en', 'fr', 'es', 'it'],
              default: 'de',
              description: 'Sprache der optimierten Inhalte'
            },
            contentLength: {
              type: 'string',
              enum: ['short', 'medium', 'long'],
              default: 'medium',
              description: 'Länge der generierten Inhalte'
            }
          },
          returns: {
            type: 'object',
            description: 'Optimierter Produktinhalt mit Title, Bullets und Description'
          },
          version: '1.1.0',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wf_24680',
          name: 'Mehrsprachiges Listing',
          description: 'Analysiert ein Produkt und erstellt Listings in mehreren Sprachen',
          category: 'Internationalisierung',
          steps: [
            {
              id: 'step_1',
              name: 'Produkt-Analyse',
              toolName: 'analyze_product',
              description: 'Analysiert das bestehende Produkt',
              parameters: { asin: 'input.asin', marketplace: 'input.marketplace', analysisDepth: 'detailed' }
            },
            {
              id: 'step_2',
              name: 'Generierung der Produktbeschreibung',
              toolName: 'generate_product_description',
              description: 'Erstellt eine optimierte Produktbeschreibung in der Hauptsprache',
              parameters: { 
                productName: 'context.productTitle', 
                keywords: 'context.recommendedKeywords', 
                features: 'context.productFeatures',
                language: 'input.sourceLanguage',
                length: 'input.contentLength'
              }
            },
            {
              id: 'step_3',
              name: 'Übersetzung der Inhalte',
              toolName: 'translate_text',
              description: 'Übersetzt die optimierten Inhalte in die gewünschten Zielsprachen',
              parameters: { 
                text: 'context.generatedContent', 
                sourceLanguage: 'input.sourceLanguage', 
                targetLanguages: 'input.targetLanguages',
                preserveFormatting: true
              }
            }
          ],
          parameters: {
            asin: {
              type: 'string',
              description: 'ASIN des zu internationalisierenden Produkts',
              required: true
            },
            marketplace: {
              type: 'string',
              enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
              default: 'amazon.de',
              description: 'Amazon Marketplace'
            },
            sourceLanguage: {
              type: 'string',
              enum: ['de', 'en', 'fr', 'es', 'it'],
              default: 'de',
              description: 'Quellsprache für die Inhaltserstellung'
            },
            targetLanguages: {
              type: 'array',
              description: 'Zielsprachen für die Übersetzung',
              required: true
            },
            contentLength: {
              type: 'string',
              enum: ['short', 'medium', 'long'],
              default: 'medium',
              description: 'Länge der generierten Inhalte'
            }
          },
          returns: {
            type: 'object',
            description: 'Produktinhalte in mehreren Sprachen'
          },
          version: '1.0.1',
          author: 'Helium10 Team',
          lastUpdated: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setWorkflows(mockWorkflows);
      setFilteredWorkflows(mockWorkflows);
      setWorkflowsError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Workflows:', err);
      setWorkflowsError('Workflows konnten nicht geladen werden.');
      showToast('error', 'Fehler beim Laden der Workflows');
    } finally {
      setLoadingWorkflows(false);
    }
  };
  
  // Tools und Workflows aktualisieren
  const refreshData = () => {
    loadTools();
    loadWorkflows();
    showToast('success', 'Daten aktualisiert');
  };
  
  // Tools filtern
  const filterTools = (value: string) => {
    if (!value) {
      setFilteredTools(tools);
      return;
    }
    
    const query = value.toLowerCase();
    const filtered = tools.filter(
      tool => tool.name.toLowerCase().includes(query) || 
              tool.description.toLowerCase().includes(query) ||
              tool.category.toLowerCase().includes(query)
    );
    
    setFilteredTools(filtered);
  };
  
  // Workflows filtern
  const filterWorkflows = (value: string) => {
    if (!value) {
      setFilteredWorkflows(workflows);
      return;
    }
    
    const query = value.toLowerCase();
    const filtered = workflows.filter(
      workflow => workflow.name.toLowerCase().includes(query) || 
                  workflow.description.toLowerCase().includes(query) ||
                  workflow.category.toLowerCase().includes(query)
    );
    
    setFilteredWorkflows(filtered);
  };
  
  // Tool-Details zeigen
  const showToolDetails = (tool: any) => {
    setSelectedTool(tool);
    setToolDetailsVisible(true);
  };
  
  // Workflow-Details zeigen
  const showWorkflowDetails = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setWorkflowDetailsVisible(true);
  };
  
  // Tool-Tabellenspalten
  const toolColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Beschreibung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Kategorie',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      filters: Array.from(new Set(tools.map(tool => tool.category))).map(category => ({
        text: category,
        value: category,
      })),
      onFilter: (value: string, record: any) => record.category === value,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Zuletzt aktualisiert',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.lastUpdated).valueOf() - new Date(b.lastUpdated).valueOf(),
      width: 150,
    },
    {
      title: 'Details',
      key: 'action',
      render: (text: string, record: any) => (
        <Button 
          type="primary" 
          icon={<InfoCircleOutlined />} 
          onClick={() => showToolDetails(record)}
        >
          Details
        </Button>
      ),
      width: 120,
    },
  ];
  
  // Workflow-Tabellenspalten
  const workflowColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Beschreibung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Kategorie',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Tag color="green">{text}</Tag>,
      filters: Array.from(new Set(workflows.map(workflow => workflow.category))).map(category => ({
        text: category,
        value: category,
      })),
      onFilter: (value: string, record: any) => record.category === value,
    },
    {
      title: 'Schritte',
      dataIndex: 'steps',
      key: 'steps',
      render: (steps: any[]) => steps.length,
      width: 100,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Zuletzt aktualisiert',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.lastUpdated).valueOf() - new Date(b.lastUpdated).valueOf(),
      width: 150,
    },
    {
      title: 'Details',
      key: 'action',
      render: (text: string, record: any) => (
        <Button 
          type="primary" 
          icon={<InfoCircleOutlined />} 
          onClick={() => showWorkflowDetails(record)}
        >
          Details
        </Button>
      ),
      width: 120,
    },
  ];
  
  // Parameter-Tabelle für Modals
  const renderParametersTable = (parameters: Record<string, any>) => {
    const paramRows = Object.entries(parameters).map(([name, details]) => ({
      key: name,
      name,
      ...details,
      required: details.required ? 'Ja' : 'Nein',
    }));
    
    const paramColumns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 150,
      },
      {
        title: 'Typ',
        dataIndex: 'type',
        key: 'type',
        width: 100,
      },
      {
        title: 'Beschreibung',
        dataIndex: 'description',
        key: 'description',
      },
      {
        title: 'Erforderlich',
        dataIndex: 'required',
        key: 'required',
        width: 120,
      },
      {
        title: 'Standardwert',
        dataIndex: 'default',
        key: 'default',
        render: (value: any) => value !== undefined ? JSON.stringify(value) : '-',
        width: 120,
      },
    ];
    
    return (
      <Table
        dataSource={paramRows}
        columns={paramColumns}
        pagination={false}
        size="small"
        rowKey="name"
      />
    );
  };
  
  return (
    <div className="tool-list">
      <Card 
        title="Tools und Workflows" 
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={refreshData}
            loading={loadingTools || loadingWorkflows}
          >
            Aktualisieren
          </Button>
        }
      >
        <Tabs defaultActiveKey="tools">
          <TabPane tab="Tools" key="tools">
            {toolsError && (
              <Alert
                message="Fehler"
                description={toolsError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <Search
                placeholder="Tools durchsuchen..."
                onSearch={filterTools}
                onChange={(e) => filterTools(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
            </div>
            
            <Table
              dataSource={filteredTools}
              columns={toolColumns}
              rowKey="name"
              loading={loadingTools}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          
          <TabPane tab="Workflows" key="workflows">
            {workflowsError && (
              <Alert
                message="Fehler"
                description={workflowsError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <Search
                placeholder="Workflows durchsuchen..."
                onSearch={filterWorkflows}
                onChange={(e) => filterWorkflows(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
            </div>
            
            <Table
              dataSource={filteredWorkflows}
              columns={workflowColumns}
              rowKey="id"
              loading={loadingWorkflows}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>
      
      {/* Tool Details Modal */}
      <Modal
        title={`Tool: ${selectedTool?.name}`}
        open={toolDetailsVisible}
        onCancel={() => setToolDetailsVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setToolDetailsVisible(false)}>
            Schließen
          </Button>
        ]}
      >
        {selectedTool && (
          <div className="tool-details">
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Beschreibung: </Text>
              <Paragraph>{selectedTool.description}</Paragraph>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Kategorie: </Text>
              <Tag color="blue">{selectedTool.category}</Tag>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Version: </Text>
              <Text>{selectedTool.version}</Text>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Autor: </Text>
              <Text>{selectedTool.author}</Text>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Zuletzt aktualisiert: </Text>
              <Text>{new Date(selectedTool.lastUpdated).toLocaleDateString()}</Text>
            </div>
            
            <Collapse defaultActiveKey={['1']}>
              <Panel header="Parameter" key="1">
                {renderParametersTable(selectedTool.parameters)}
              </Panel>
              
              <Panel header="Rückgabewert" key="2">
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Typ: </Text>
                  <Text>{selectedTool.returns.type}</Text>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Beschreibung: </Text>
                  <Text>{selectedTool.returns.description}</Text>
                </div>
              </Panel>
              
              <Panel header="Beispiel" key="3">
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                  <code>{selectedTool.example}</code>
                </pre>
              </Panel>
            </Collapse>
          </div>
        )}
      </Modal>
      
      {/* Workflow Details Modal */}
      <Modal
        title={`Workflow: ${selectedWorkflow?.name}`}
        open={workflowDetailsVisible}
        onCancel={() => setWorkflowDetailsVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setWorkflowDetailsVisible(false)}>
            Schließen
          </Button>
        ]}
      >
        {selectedWorkflow && (
          <div className="workflow-details">
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Beschreibung: </Text>
              <Paragraph>{selectedWorkflow.description}</Paragraph>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Kategorie: </Text>
              <Tag color="green">{selectedWorkflow.category}</Tag>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Version: </Text>
              <Text>{selectedWorkflow.version}</Text>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Autor: </Text>
              <Text>{selectedWorkflow.author}</Text>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Zuletzt aktualisiert: </Text>
              <Text>{new Date(selectedWorkflow.lastUpdated).toLocaleDateString()}</Text>
            </div>
            
            <Collapse defaultActiveKey={['1']}>
              <Panel header="Workflow-Schritte" key="1">
                {selectedWorkflow.steps.map((step: any, index: number) => (
                  <Card 
                    title={`Schritt ${index+1}: ${step.name}`} 
                    size="small" 
                    style={{ marginBottom: '10px' }}
                    key={step.id}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>Tool: </Text>
                      <Text>{step.toolName}</Text>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>Beschreibung: </Text>
                      <Text>{step.description}</Text>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>Parameter-Mapping: </Text>
                      <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', margin: '8px 0' }}>
                        <code>{JSON.stringify(step.parameters, null, 2)}</code>
                      </pre>
                    </div>
                    
                    {step.condition && (
                      <div>
                        <Text strong>Bedingung: </Text>
                        <Tag color="orange">{step.condition}</Tag>
                      </div>
                    )}
                  </Card>
                ))}
              </Panel>
              
              <Panel header="Workflow-Parameter" key="2">
                {renderParametersTable(selectedWorkflow.parameters)}
              </Panel>
              
              <Panel header="Rückgabewert" key="3">
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Typ: </Text>
                  <Text>{selectedWorkflow.returns.type}</Text>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Beschreibung: </Text>
                  <Text>{selectedWorkflow.returns.description}</Text>
                </div>
              </Panel>
            </Collapse>
          </div>
        )}
      </Modal>
    </div>
  );
}; 