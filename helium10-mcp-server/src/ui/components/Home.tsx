import React, { useState, useEffect } from 'react';
import { Typography, Card, Statistic, Row, Col, Alert, Button, List, Spin } from 'antd';
import { 
  ApiOutlined, 
  AppstoreOutlined, 
  UserOutlined, 
  ToolOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { callTool } from '../api/tool-api';

const { Title, Paragraph } = Typography;

/**
 * Home-Komponente für die Startseite
 */
export const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    tools: 0,
    artifacts: 0,
    users: 0,
    workflowArtifacts: 0
  });
  const [recentArtifacts, setRecentArtifacts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Statistiken laden
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Dashboard-Daten laden
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // In einer realen Anwendung würden wir hier einen API-Aufruf machen
      // um die tatsächlichen Daten zu laden
      
      // Beispiel:
      // const dashboardData = await callTool('get_dashboard_stats', []);
      
      // Für diese Demo verwenden wir Beispieldaten
      setTimeout(() => {
        setStats({
          tools: 42,
          artifacts: 18,
          users: 5,
          workflowArtifacts: 3
        });
        
        setRecentArtifacts([
          {
            id: 'a1b2c3d4',
            name: 'Keyword-Recherche',
            type: 'tool',
            toolName: 'magnet_keyword_research',
            createdAt: new Date().toISOString(),
            usage: 12
          },
          {
            id: 'e5f6g7h8',
            name: 'Produktanalyse',
            type: 'tool',
            toolName: 'analyze_product',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            usage: 8
          },
          {
            id: 'i9j0k1l2',
            name: 'Vollständige Produktrecherche',
            type: 'workflow',
            workflowId: 'produktRecherche',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            usage: 5
          }
        ]);
        
        setLoading(false);
        setError(null);
      }, 1000);
    } catch (err) {
      console.error('Fehler beim Laden der Dashboard-Daten:', err);
      setError('Dashboard-Daten konnten nicht geladen werden.');
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <Title level={2}>Willkommen beim MCP Server</Title>
      <Paragraph>
        Der MCP Server stellt leistungsstarke Tools für die Integration mit Claude.ai Desktop bereit.
        Erstellen Sie Tool- und Workflow-Artefakte, die direkt aus Claude.ai heraus aufgerufen werden können.
      </Paragraph>
      
      {error && (
        <Alert
          message="Fehler"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}
      
      <div className="dashboard-stats">
        <Spin spinning={loading} tip="Lade Statistiken...">
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Verfügbare Tools"
                  value={stats.tools}
                  prefix={<ToolOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Tool-Artefakte"
                  value={stats.artifacts}
                  prefix={<AppstoreOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Workflow-Artefakte"
                  value={stats.workflowArtifacts}
                  prefix={<RocketOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Benutzer"
                  value={stats.users}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>
      
      <div className="recent-artifacts">
        <Title level={4}>Kürzlich erstellte Artefakte</Title>
        <Spin spinning={loading} tip="Lade Artefakte...">
          <List
            itemLayout="horizontal"
            dataSource={recentArtifacts}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  avatar={item.type === 'workflow' ? <RocketOutlined /> : <AppstoreOutlined />}
                  title={item.name}
                  description={`${item.type === 'workflow' ? 'Workflow-ID: ' + item.workflowId : 'Tool: ' + item.toolName} | Erstellt: ${new Date(item.createdAt).toLocaleString()} | Nutzungen: ${item.usage}`}
                />
              </List.Item>
            )}
          />
        </Spin>
      </div>
      
      <div className="quick-actions" style={{ marginTop: '24px' }}>
        <Title level={4}>Schnellaktionen</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Button 
              type="primary" 
              icon={<AppstoreOutlined />} 
              block
              onClick={() => window.location.href = '#/artifacts/new'}
              style={{ marginBottom: '10px' }}
            >
              Neues Tool-Artefakt erstellen
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              block
              onClick={() => window.location.href = '#/workflows/new'}
              style={{ marginBottom: '10px' }}
            >
              Neues Workflow-Artefakt erstellen
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              icon={<ApiOutlined />} 
              block
              onClick={() => window.location.href = '#/docs'}
              style={{ marginBottom: '10px' }}
            >
              API-Dokumentation ansehen
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );
}; 