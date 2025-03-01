import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Tooltip, Badge, Typography, Input, Select, DatePicker, Modal, Alert } from 'antd';
import { SearchOutlined, ToolOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  EyeOutlined, DeleteOutlined, CopyOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import { useToast } from '../hooks/useToast';
import { listArtifacts, getArtifactResults } from '../api/tool-api';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ArtifactListProps {
  onViewResults?: (artifactId: string, results: any) => void;
}

export const ArtifactList: React.FC<ArtifactListProps> = ({ onViewResults }) => {
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<any>({
    type: undefined,
    status: undefined,
    query: '',
    dateRange: null,
  });
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const [resultsModalVisible, setResultsModalVisible] = useState<boolean>(false);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Artefakte laden
  useEffect(() => {
    loadArtifacts();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadArtifacts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In einer realen Anwendung würden wir die Artefakte von der API laden
      // const response = await listArtifacts({
      //   page: pagination.current,
      //   pageSize: pagination.pageSize,
      //   type: filters.type,
      //   status: filters.status,
      //   query: filters.query,
      //   startDate: filters.dateRange?.[0]?.toISOString(),
      //   endDate: filters.dateRange?.[1]?.toISOString(),
      // });
      
      // Simulierte Artefakt-Daten für die Demo
      const mockArtifacts = [
        {
          id: 'art_1234567890',
          name: 'Produkt-Analyse',
          description: 'Analysiert Amazon-Produkte basierend auf ASIN',
          type: 'tool',
          toolName: 'analyze_product',
          workflowId: null,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user123',
          requiredApproval: true,
          maxUsage: 100,
          currentUsage: 5,
          status: 'active',
          url: 'https://claude.ai/artifact/art_1234567890',
        },
        {
          id: 'art_0987654321',
          name: 'Keyword-Recherche',
          description: 'Führt eine umfassende Keyword-Recherche durch',
          type: 'tool',
          toolName: 'magnet_keyword_research',
          workflowId: null,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user123',
          requiredApproval: false,
          maxUsage: 50,
          currentUsage: 12,
          status: 'active',
          url: 'https://claude.ai/artifact/art_0987654321',
        },
        {
          id: 'art_5678901234',
          name: 'Vollständiger Produktrecherche-Workflow',
          description: 'Führt eine vollständige Produktrecherche mit mehreren Schritten durch',
          type: 'workflow',
          toolName: null,
          workflowId: 'wf_12345',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user456',
          requiredApproval: true,
          maxUsage: 20,
          currentUsage: 2,
          status: 'active',
          url: 'https://claude.ai/artifact/art_5678901234',
        },
        {
          id: 'art_1357924680',
          name: 'Abgelaufenes Artefakt',
          description: 'Dieses Artefakt ist bereits abgelaufen',
          type: 'tool',
          toolName: 'translate_text',
          workflowId: null,
          createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user789',
          requiredApproval: true,
          maxUsage: 10,
          currentUsage: 10,
          status: 'expired',
          url: 'https://claude.ai/artifact/art_1357924680',
        },
        {
          id: 'art_2468013579',
          name: 'Nutzungslimit erreicht',
          description: 'Dieses Artefakt hat sein Nutzungslimit erreicht',
          type: 'tool',
          toolName: 'generate_product_description',
          workflowId: null,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          userId: 'user123',
          requiredApproval: false,
          maxUsage: 5,
          currentUsage: 5,
          status: 'maxed',
          url: 'https://claude.ai/artifact/art_2468013579',
        },
      ];
      
      // Filtern der Mock-Daten
      let filteredArtifacts = [...mockArtifacts];
      
      if (filters.type) {
        filteredArtifacts = filteredArtifacts.filter(art => art.type === filters.type);
      }
      
      if (filters.status) {
        filteredArtifacts = filteredArtifacts.filter(art => art.status === filters.status);
      }
      
      if (filters.query) {
        const query = filters.query.toLowerCase();
        filteredArtifacts = filteredArtifacts.filter(
          art => art.name.toLowerCase().includes(query) || 
                art.description.toLowerCase().includes(query) ||
                art.id.toLowerCase().includes(query) ||
                (art.toolName && art.toolName.toLowerCase().includes(query))
        );
      }
      
      if (filters.dateRange && filters.dateRange.length === 2) {
        const startDate = filters.dateRange[0].valueOf();
        const endDate = filters.dateRange[1].valueOf();
        
        filteredArtifacts = filteredArtifacts.filter(
          art => {
            const createdDate = new Date(art.createdAt).valueOf();
            return createdDate >= startDate && createdDate <= endDate;
          }
        );
      }
      
      // Pagination
      const startIndex = (pagination.current - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedArtifacts = filteredArtifacts.slice(startIndex, endIndex);
      
      setArtifacts(paginatedArtifacts);
      setPagination(prev => ({ ...prev, total: filteredArtifacts.length }));
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Artefakte:', err);
      setError('Artefakte konnten nicht geladen werden.');
      showToast('error', 'Fehler beim Laden der Artefakte');
    } finally {
      setLoading(false);
    }
  };

  // Ergebnisse eines Artefakts anzeigen
  const viewResults = async (artifactId: string) => {
    setSelectedArtifact(artifacts.find(a => a.id === artifactId));
    setResultsLoading(true);
    setResults(null);
    setResultsModalVisible(true);
    
    try {
      // In einer realen Anwendung würden wir die Ergebnisse von der API laden
      // const response = await getArtifactResults(artifactId);
      
      // Simulierte Ergebnisse für die Demo
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simuliere Ladezeit
      
      const mockResults = {
        id: 'res_9876543210',
        artifactId: artifactId,
        executedAt: new Date().toISOString(),
        parameters: {
          asin: 'B08R2KLM7S',
          marketplace: 'amazon.de',
          analysisDepth: 'detailed'
        },
        result: {
          title: 'Fancy Product Name',
          brand: 'BrandName',
          price: '€29.99',
          rating: 4.5,
          reviewCount: 127,
          categories: ['Kategorie 1', 'Kategorie 2'],
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          competitorAnalysis: {
            priceComparison: 'Günstiger als 75% der Konkurrenten',
            ratingComparison: 'Höhere Bewertung als 60% der Konkurrenten',
            keyDifferentiators: ['Bessere Qualität', 'Längere Garantie']
          },
          keywordAnalysis: {
            topKeywords: ['keyword1', 'keyword2', 'keyword3'],
            missedOpportunities: ['keyword4', 'keyword5']
          },
          recommendations: [
            'Preis um 5% senken',
            'Mehr Bilder hinzufügen',
            'Keyword-Optimierung für "keyword4" und "keyword5"'
          ]
        },
        status: 'success',
        approved: true,
        approvalToken: 'tok_1234567890',
        approvedBy: 'user123',
        approvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        executionTime: 2.5
      };
      
      setResults(mockResults);
      
      if (onViewResults) {
        onViewResults(artifactId, mockResults);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Ergebnisse:', err);
      showToast('error', 'Fehler beim Laden der Ergebnisse');
    } finally {
      setResultsLoading(false);
    }
  };

  // URL in die Zwischenablage kopieren
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        showToast('success', 'URL in die Zwischenablage kopiert');
      })
      .catch(err => {
        console.error('Fehler beim Kopieren in die Zwischenablage:', err);
        showToast('error', 'Fehler beim Kopieren in die Zwischenablage');
      });
  };

  // Artefakt löschen (simuliert)
  const deleteArtifact = (artifactId: string) => {
    Modal.confirm({
      title: 'Artefakt löschen',
      content: 'Sind Sie sicher, dass Sie dieses Artefakt löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
      okText: 'Ja, löschen',
      okType: 'danger',
      cancelText: 'Abbrechen',
      onOk: () => {
        // In einer realen Anwendung würden wir die API aufrufen, um das Artefakt zu löschen
        // await deleteArtifact(artifactId);
        
        // Hier simulieren wir das Löschen, indem wir es aus der lokalen Liste entfernen
        setArtifacts(artifacts.filter(a => a.id !== artifactId));
        showToast('success', 'Artefakt erfolgreich gelöscht');
      }
    });
  };

  // Filter-Änderungen behandeln
  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current: 1 }); // Zurück zur ersten Seite
  };

  // Spalten für die Tabelle
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <span>
          {record.type === 'workflow' ? (
            <ApiOutlined style={{ marginRight: 8 }} />
          ) : (
            <ToolOutlined style={{ marginRight: 8 }} />
          )}
          <Text strong>{text}</Text>
        </span>
      ),
    },
    {
      title: 'Typ',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'workflow' ? 'blue' : 'green'}>
          {type === 'workflow' ? 'Workflow' : 'Tool'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        let color = 'green';
        let text = 'Aktiv';
        let icon = <CheckCircleOutlined />;
        
        if (status === 'expired') {
          color = 'red';
          text = 'Abgelaufen';
          icon = <CloseCircleOutlined />;
        } else if (status === 'maxed') {
          color = 'orange';
          text = 'Limit erreicht';
          icon = <WarningOutlined />;
        }
        
        return (
          <Badge status={color as any} text={text} />
        );
      },
    },
    {
      title: 'Erstellt am',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Gültig bis',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 150,
      render: (date: string, record: any) => (
        record.status === 'expired' ? (
          <Text type="danger">{new Date(date).toLocaleDateString()}</Text>
        ) : (
          new Date(date).toLocaleDateString()
        )
      ),
    },
    {
      title: 'Nutzung',
      key: 'usage',
      width: 120,
      render: (text: string, record: any) => (
        <span>
          {record.currentUsage} / {record.maxUsage === 0 ? '∞' : record.maxUsage}
        </span>
      ),
    },
    {
      title: 'Aktionen',
      key: 'actions',
      width: 180,
      render: (text: string, record: any) => (
        <Space>
          <Tooltip title="Ergebnisse anzeigen">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => viewResults(record.id)}
            />
          </Tooltip>
          <Tooltip title="URL kopieren">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(record.url)}
            />
          </Tooltip>
          <Tooltip title="Löschen">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteArtifact(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="artifact-list">
      <Card title="Artefakte" extra={
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={loadArtifacts}
          loading={loading}
        >
          Aktualisieren
        </Button>
      }>
        {error && (
          <Alert
            message="Fehler"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}
        
        <div className="filters" style={{ marginBottom: '16px' }}>
          <Space wrap>
            <Input
              placeholder="Suchen..."
              prefix={<SearchOutlined />}
              value={filters.query}
              onChange={e => handleFilterChange('query', e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            
            <Select
              placeholder="Typ"
              value={filters.type}
              onChange={value => handleFilterChange('type', value)}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="tool">Tool</Option>
              <Option value="workflow">Workflow</Option>
            </Select>
            
            <Select
              placeholder="Status"
              value={filters.status}
              onChange={value => handleFilterChange('status', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="active">Aktiv</Option>
              <Option value="expired">Abgelaufen</Option>
              <Option value="maxed">Limit erreicht</Option>
            </Select>
            
            <RangePicker
              placeholder={['Erstellt von', 'Erstellt bis']}
              value={filters.dateRange}
              onChange={dates => handleFilterChange('dateRange', dates)}
            />
          </Space>
        </div>
        
        <Table
          dataSource={artifacts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
            showSizeChanger: true,
            showTotal: (total) => `Gesamt ${total} Artefakte`
          }}
        />
      </Card>
      
      <Modal
        title={`Ergebnisse: ${selectedArtifact?.name}`}
        open={resultsModalVisible}
        onCancel={() => setResultsModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setResultsModalVisible(false)}>
            Schließen
          </Button>
        ]}
      >
        {resultsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="Lade Ergebnisse..." />
          </div>
        ) : (
          <div className="results-container">
            {results ? (
              <>
                <div className="results-header" style={{ marginBottom: '16px' }}>
                  <Row>
                    <Col span={12}>
                      <Text strong>Ausgeführt am:</Text>{' '}
                      <Text>{new Date(results.executedAt).toLocaleString()}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Status:</Text>{' '}
                      <Tag color={results.status === 'success' ? 'green' : 'red'}>
                        {results.status === 'success' ? 'Erfolgreich' : 'Fehlgeschlagen'}
                      </Tag>
                    </Col>
                  </Row>
                  {results.approved && (
                    <Row style={{ marginTop: '8px' }}>
                      <Col span={24}>
                        <Text strong>Genehmigt von:</Text>{' '}
                        <Text>{results.approvedBy} am {new Date(results.approvedAt).toLocaleString()}</Text>
                      </Col>
                    </Row>
                  )}
                  <Row style={{ marginTop: '8px' }}>
                    <Col span={24}>
                      <Text strong>Ausführungszeit:</Text>{' '}
                      <Text>{results.executionTime} Sekunden</Text>
                    </Col>
                  </Row>
                </div>
                
                <Divider>Parameter</Divider>
                <div className="results-parameters" style={{ marginBottom: '16px' }}>
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(results.parameters, null, 2)}
                  </pre>
                </div>
                
                <Divider>Ergebnis</Divider>
                <div className="results-content">
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(results.result, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <Alert
                message="Keine Ergebnisse"
                description="Für dieses Artefakt sind keine Ergebnisse verfügbar."
                type="info"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}; 