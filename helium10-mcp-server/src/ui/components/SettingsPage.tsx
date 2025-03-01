import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Switch, Select, InputNumber, Alert, Tabs, Divider, Typography, Row, Col, Space, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useToast } from '../hooks/useToast';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * Komponente für Anwendungseinstellungen
 */
export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Einstellungen beim Initialisieren laden
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Einstellungen laden
  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // In einer realen Anwendung würden wir die Einstellungen von der API laden
      // const response = await fetch('/api/settings');
      // const settings = await response.json();
      
      // Simulierte Einstellungen für die Demo
      await new Promise(resolve => setTimeout(resolve, 500)); // Simuliere Ladezeit
      
      const mockSettings = {
        // API-Einstellungen
        apiBaseUrl: 'http://localhost:3001/api',
        apiTimeout: 30000,
        maxConcurrentRequests: 5,
        
        // Artefakt-Einstellungen
        defaultExpirationDays: 30,
        defaultMaxUsage: 100,
        requireApprovalByDefault: true,
        storeResultsByDefault: true,
        
        // Sicherheitseinstellungen
        enforceHttps: false,
        tokenExpirationHours: 24,
        rateLimitPerMinute: 60,
        
        // Benachrichtigungseinstellungen
        enableEmailNotifications: false,
        adminEmail: 'admin@example.com',
        notifyOnNewArtifact: true,
        notifyOnArtifactExecution: true,
        notifyOnError: true,
        
        // Speichereinstellungen
        resultRetentionDays: 90,
        logLevel: 'info',
        enableDetailedLogs: true,
        maxLogSizeMB: 100
      };
      
      // Formular mit den geladenen Einstellungen füllen
      form.setFieldsValue(mockSettings);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Einstellungen:', err);
      setError('Einstellungen konnten nicht geladen werden.');
      showToast('error', 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };
  
  // Einstellungen speichern
  const saveSettings = async (values: any) => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // In einer realen Anwendung würden wir die Einstellungen an die API senden
      // await fetch('/api/settings', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(values),
      // });
      
      // Simuliere eine Speicherung
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveSuccess(true);
      showToast('success', 'Einstellungen erfolgreich gespeichert');
    } catch (err) {
      console.error('Fehler beim Speichern der Einstellungen:', err);
      setError('Einstellungen konnten nicht gespeichert werden.');
      showToast('error', 'Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };
  
  // Formular zurücksetzen
  const resetForm = () => {
    form.resetFields();
    setError(null);
    setSaveSuccess(false);
    loadSettings();
  };
  
  return (
    <div className="settings-page">
      <Card 
        title="Einstellungen" 
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={resetForm}
              disabled={loading || saving}
            >
              Zurücksetzen
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="Lade Einstellungen..." />
          </div>
        ) : (
          <>
            {error && (
              <Alert
                message="Fehler"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}
            
            {saveSuccess && (
              <Alert
                message="Erfolg"
                description="Die Einstellungen wurden erfolgreich gespeichert."
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}
            
            <Form
              form={form}
              layout="vertical"
              onFinish={saveSettings}
            >
              <Tabs defaultActiveKey="api">
                <TabPane tab="API" key="api">
                  <Title level={4}>API-Einstellungen</Title>
                  
                  <Form.Item
                    name="apiBaseUrl"
                    label="API-Basis-URL"
                    rules={[
                      { required: true, message: 'Bitte geben Sie die API-Basis-URL an' },
                      { type: 'url', message: 'Bitte geben Sie eine gültige URL an' }
                    ]}
                  >
                    <Input placeholder="http://localhost:3001/api" />
                  </Form.Item>
                  
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="apiTimeout"
                        label="API-Timeout (ms)"
                        rules={[
                          { required: true, message: 'Bitte geben Sie das API-Timeout an' }
                        ]}
                      >
                        <InputNumber min={1000} max={60000} step={1000} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    
                    <Col span={8}>
                      <Form.Item
                        name="maxConcurrentRequests"
                        label="Maximale gleichzeitige Anfragen"
                        rules={[
                          { required: true, message: 'Bitte geben Sie die maximale Anzahl an' }
                        ]}
                      >
                        <InputNumber min={1} max={20} step={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    
                    <Col span={8}>
                      <Form.Item
                        name="enforceHttps"
                        label="HTTPS erzwingen"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                </TabPane>
                
                <TabPane tab="Artefakte" key="artifacts">
                  <Title level={4}>Artefakt-Einstellungen</Title>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="defaultExpirationDays"
                        label="Standard-Gültigkeitsdauer (Tage)"
                        rules={[
                          { required: true, message: 'Bitte geben Sie die Gültigkeitsdauer an' }
                        ]}
                        extra="0 = unbegrenzt"
                      >
                        <InputNumber min={0} max={365} step={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    
                    <Col span={12}>
                      <Form.Item
                        name="defaultMaxUsage"
                        label="Standard-maximale Nutzungen"
                        rules={[
                          { required: true, message: 'Bitte geben Sie die maximale Anzahl an' }
                        ]}
                        extra="0 = unbegrenzt"
                      >
                        <InputNumber min={0} max={1000} step={10} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="requireApprovalByDefault"
                        label="Standardmäßig Genehmigung erforderlich"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={12}>
                      <Form.Item
                        name="storeResultsByDefault"
                        label="Standardmäßig Ergebnisse speichern"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <Title level={4}>Ergebnis-Aufbewahrung</Title>
                  
                  <Form.Item
                    name="resultRetentionDays"
                    label="Aufbewahrungsdauer für Ergebnisse (Tage)"
                    rules={[
                      { required: true, message: 'Bitte geben Sie die Aufbewahrungsdauer an' }
                    ]}
                    extra="0 = unbegrenzt"
                  >
                    <InputNumber min={0} max={3650} step={30} style={{ width: '100%' }} />
                  </Form.Item>
                </TabPane>
                
                <TabPane tab="Sicherheit" key="security">
                  <Title level={4}>Sicherheitseinstellungen</Title>
                  
                  <Form.Item
                    name="tokenExpirationHours"
                    label="Token-Gültigkeitsdauer (Stunden)"
                    rules={[
                      { required: true, message: 'Bitte geben Sie die Token-Gültigkeitsdauer an' }
                    ]}
                  >
                    <InputNumber min={1} max={720} step={1} style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item
                    name="rateLimitPerMinute"
                    label="Rate-Limit (Anfragen pro Minute)"
                    rules={[
                      { required: true, message: 'Bitte geben Sie das Rate-Limit an' }
                    ]}
                  >
                    <InputNumber min={10} max={1000} step={10} style={{ width: '100%' }} />
                  </Form.Item>
                </TabPane>
                
                <TabPane tab="Benachrichtigungen" key="notifications">
                  <Title level={4}>Benachrichtigungseinstellungen</Title>
                  
                  <Form.Item
                    name="enableEmailNotifications"
                    label="E-Mail-Benachrichtigungen aktivieren"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  
                  <Form.Item
                    name="adminEmail"
                    label="Administrator-E-Mail"
                    rules={[
                      { 
                        required: true, 
                        message: 'Bitte geben Sie die Administrator-E-Mail an',
                        type: 'email'
                      }
                    ]}
                  >
                    <Input placeholder="admin@example.com" />
                  </Form.Item>
                  
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="notifyOnNewArtifact"
                        label="Bei neuem Artefakt"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={8}>
                      <Form.Item
                        name="notifyOnArtifactExecution"
                        label="Bei Artefakt-Ausführung"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={8}>
                      <Form.Item
                        name="notifyOnError"
                        label="Bei Fehlern"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                </TabPane>
                
                <TabPane tab="Logs" key="logs">
                  <Title level={4}>Log-Einstellungen</Title>
                  
                  <Form.Item
                    name="logLevel"
                    label="Log-Level"
                    rules={[
                      { required: true, message: 'Bitte wählen Sie den Log-Level' }
                    ]}
                  >
                    <Select>
                      <Option value="debug">Debug</Option>
                      <Option value="info">Info</Option>
                      <Option value="warn">Warn</Option>
                      <Option value="error">Error</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="enableDetailedLogs"
                    label="Detaillierte Logs aktivieren"
                    valuePropName="checked"
                    extra="Aktiviert detaillierte Logs, einschließlich Request/Response-Daten"
                  >
                    <Switch />
                  </Form.Item>
                  
                  <Form.Item
                    name="maxLogSizeMB"
                    label="Maximale Log-Größe (MB)"
                    rules={[
                      { required: true, message: 'Bitte geben Sie die maximale Log-Größe an' }
                    ]}
                  >
                    <InputNumber min={10} max={1000} step={10} style={{ width: '100%' }} />
                  </Form.Item>
                </TabPane>
              </Tabs>
              
              <Divider />
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                >
                  Einstellungen speichern
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}; 