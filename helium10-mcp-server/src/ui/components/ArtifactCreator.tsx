import React, { useState, useEffect } from 'react';
import { Button, Card, Form, Select, Input, Checkbox, Spin, Alert, Typography, Divider, Row, Col } from 'antd';
import { useToast } from '../hooks/useToast';
import { callTool, getRegisteredTools } from '../api/tool-api';
import { JsonEditor } from './JsonEditor';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Komponente zur Erstellung von Tool-Artefakten
 */
export const ArtifactCreator: React.FC = () => {
  const [form] = Form.useForm();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [artifactCreated, setArtifactCreated] = useState<boolean>(false);
  const [artifactData, setArtifactData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Tools laden
  useEffect(() => {
    loadTools();
  }, []);

  // Tool-Parameter aktualisieren, wenn sich das ausgewählte Tool ändert
  useEffect(() => {
    if (selectedTool) {
      try {
        // In einer echten Anwendung würden wir hier die Parameterstruktur des Tools laden
        // Da wir keine echte API haben, verwenden wir ein Beispiel
        const exampleParams: Record<string, any> = {};
        
        if (selectedTool === 'analyze_product') {
          exampleParams.asin = { 
            type: 'string', 
            description: 'Amazon ASIN des Produkts',
            required: true 
          };
          exampleParams.marketplace = { 
            type: 'string', 
            enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
            default: 'amazon.de',
            description: 'Amazon Marketplace'
          };
          exampleParams.analysisDepth = { 
            type: 'string', 
            enum: ['basic', 'detailed', 'comprehensive'],
            default: 'detailed',
            description: 'Tiefe der Analyse'
          };
        } else if (selectedTool === 'magnet_keyword_research') {
          exampleParams.keyword = { 
            type: 'string', 
            description: 'Zu analysierendes Keyword',
            required: true 
          };
          exampleParams.marketplace = { 
            type: 'string', 
            enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
            default: 'amazon.de',
            description: 'Amazon Marketplace'
          };
          exampleParams.limit = { 
            type: 'number', 
            default: 100,
            description: 'Maximale Anzahl der zurückgegebenen Keywords'
          };
        }
        
        setToolParams(exampleParams);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Tool-Parameter:', err);
        setError('Tool-Parameter konnten nicht geladen werden.');
      }
    }
  }, [selectedTool]);

  // Tools laden
  const loadTools = async () => {
    setLoading(true);
    try {
      // In einer realen Anwendung würden wir die Tools von der API laden
      // const response = await getRegisteredTools();
      // setTools(response.tools);
      
      // Für diese Demo verwenden wir statische Daten
      setTools([
        { name: 'analyze_product', description: 'Analysiert ein Amazon-Produkt' },
        { name: 'magnet_keyword_research', description: 'Führt eine Keyword-Recherche durch' },
        { name: 'complete_product_research', description: 'Führt eine vollständige Produktrecherche durch' },
        { name: 'generate_product_description', description: 'Generiert eine Produktbeschreibung' },
        { name: 'translate_text', description: 'Übersetzt Text in mehrere Sprachen' }
      ]);
      
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Tools:', err);
      setError('Tools konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Tool-Artefakt erstellen
  const createToolArtifact = async (values: any) => {
    setCreating(true);
    setError(null);
    
    try {
      const result = await callTool('create_tool_artifact', [
        values.name,
        values.description,
        values.toolName,
        values.allowedParameters || {},
        {
          requiredApproval: values.requiredApproval,
          userId: values.userId || undefined,
          expiresAfterDays: values.expiresAfterDays || undefined,
          maxUsage: values.maxUsage || undefined,
          storeResults: values.storeResults
        }
      ]);
      
      if (result.success) {
        setArtifactData(result.artifact);
        setArtifactCreated(true);
        showToast('success', 'Tool-Artefakt erfolgreich erstellt');
      } else {
        setError(result.message || 'Unbekannter Fehler beim Erstellen des Artefakts');
        showToast('error', 'Fehler beim Erstellen des Tool-Artefakts');
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des Tool-Artefakts:', err);
      setError(`Fehler: ${err.message || 'Unbekannter Fehler'}`);
      showToast('error', 'Fehler beim Erstellen des Tool-Artefakts');
    } finally {
      setCreating(false);
    }
  };

  // URL in die Zwischenablage kopieren
  const copyToClipboard = () => {
    if (artifactData?.url) {
      navigator.clipboard.writeText(artifactData.url)
        .then(() => {
          showToast('success', 'URL in die Zwischenablage kopiert');
        })
        .catch(err => {
          console.error('Fehler beim Kopieren in die Zwischenablage:', err);
          showToast('error', 'Fehler beim Kopieren in die Zwischenablage');
        });
    }
  };

  // Formular zurücksetzen
  const resetForm = () => {
    form.resetFields();
    setSelectedTool(null);
    setToolParams({});
    setArtifactCreated(false);
    setArtifactData(null);
    setError(null);
  };

  return (
    <div className="artifact-creator">
      <Card title="Tool-Artefakt erstellen" bordered={false}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="Lade Tools..." />
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
            
            {artifactCreated ? (
              <div className="artifact-created">
                <Alert
                  message="Tool-Artefakt erfolgreich erstellt"
                  description={
                    <div>
                      <p>Das Tool-Artefakt wurde erfolgreich erstellt. Teilen Sie die folgende URL mit Claude-Benutzern:</p>
                      <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
                        <Text copyable>{artifactData.url}</Text>
                      </div>
                      <Row gutter={16}>
                        <Col>
                          <Button type="primary" onClick={copyToClipboard}>
                            URL kopieren
                          </Button>
                        </Col>
                        <Col>
                          <Button onClick={resetForm}>
                            Neues Artefakt erstellen
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  }
                  type="success"
                  showIcon
                />
                
                <Divider />
                
                <Title level={4}>Artefakt-Details</Title>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Name: </Text>
                  <Text>{artifactData.name}</Text>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Beschreibung: </Text>
                  <Text>{artifactData.description}</Text>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Tool: </Text>
                  <Text>{artifactData.toolName}</Text>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Genehmigung erforderlich: </Text>
                  <Text>{artifactData.requiredApproval ? 'Ja' : 'Nein'}</Text>
                </div>
                {artifactData.expiresAt && (
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Gültig bis: </Text>
                    <Text>{new Date(artifactData.expiresAt).toLocaleString()}</Text>
                  </div>
                )}
                {artifactData.maxUsage && (
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Maximale Nutzungen: </Text>
                    <Text>{artifactData.maxUsage}</Text>
                  </div>
                )}
              </div>
            ) : (
              <Form
                form={form}
                layout="vertical"
                onFinish={createToolArtifact}
                initialValues={{
                  requiredApproval: true,
                  storeResults: true,
                  expiresAfterDays: 30,
                  maxUsage: 100
                }}
              >
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true, message: 'Bitte geben Sie einen Namen an' }]}
                >
                  <Input placeholder="Name des Tool-Artefakts" />
                </Form.Item>
                
                <Form.Item
                  name="description"
                  label="Beschreibung"
                  rules={[{ required: true, message: 'Bitte geben Sie eine Beschreibung an' }]}
                >
                  <TextArea
                    placeholder="Beschreibung des Tool-Artefakts"
                    rows={3}
                  />
                </Form.Item>
                
                <Form.Item
                  name="toolName"
                  label="Tool"
                  rules={[{ required: true, message: 'Bitte wählen Sie ein Tool aus' }]}
                >
                  <Select 
                    placeholder="Tool auswählen"
                    onChange={(value) => setSelectedTool(value)}
                    loading={loading}
                  >
                    {tools.map(tool => (
                      <Option key={tool.name} value={tool.name}>
                        {tool.name} - {tool.description}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  name="allowedParameters"
                  label="Erlaubte Parameter"
                  extra="JSON-Objekt mit erlaubten Parametern und deren Eigenschaften (type, required, default, enum, ...)"
                >
                  <JsonEditor 
                    initialValue={toolParams}
                    onChange={value => form.setFieldsValue({ allowedParameters: value })}
                  />
                </Form.Item>
                
                <Divider orientation="left">Optionen</Divider>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="requiredApproval"
                      valuePropName="checked"
                      label="Genehmigung erforderlich"
                    >
                      <Checkbox>
                        Genehmigung für jede Ausführung erforderlich
                      </Checkbox>
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <Form.Item
                      name="storeResults"
                      valuePropName="checked"
                      label="Ergebnisse speichern"
                    >
                      <Checkbox>
                        Ausführungsergebnisse in der Datenbank speichern
                      </Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="expiresAfterDays"
                      label="Gültigkeit (Tage)"
                      extra="0 = unbegrenzt"
                    >
                      <Input type="number" min={0} placeholder="30" />
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <Form.Item
                      name="maxUsage"
                      label="Maximale Nutzungen"
                      extra="0 = unbegrenzt"
                    >
                      <Input type="number" min={0} placeholder="100" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item
                  name="userId"
                  label="Benutzer-ID"
                  extra="Optional: ID des erstellenden Benutzers"
                >
                  <Input placeholder="Benutzer-ID" />
                </Form.Item>
                
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={creating}
                    style={{ marginRight: '10px' }}
                  >
                    Tool-Artefakt erstellen
                  </Button>
                  <Button onClick={resetForm} disabled={creating}>
                    Zurücksetzen
                  </Button>
                </Form.Item>
              </Form>
            )}
          </>
        )}
      </Card>
    </div>
  );
}; 