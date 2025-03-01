import React, { useState, useEffect } from 'react';
import { Button, Card, Form, Select, Input, Checkbox, Spin, message, Alert, Typography, Space, Divider, Row, Col, Tag } from 'antd';
import { useToast } from '../hooks/useToast';
import { callTool } from '../api/tool-api';
import { workflowManager, listWorkflows } from '../../workflows/workflow-manager';
import { JsonEditor } from './JsonEditor';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Komponente zur Erstellung von Workflow-Artefakten
 */
export const WorkflowArtifactCreator: React.FC = () => {
  const [form] = Form.useForm();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowParams, setWorkflowParams] = useState<Record<string, any>>({});
  const [artifactCreated, setArtifactCreated] = useState<boolean>(false);
  const [artifactData, setArtifactData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Workflows laden
  useEffect(() => {
    loadWorkflows();
  }, []);

  // Workflow-Parameter aktualisieren, wenn sich der ausgewählte Workflow ändert
  useEffect(() => {
    if (selectedWorkflow) {
      try {
        const workflow = workflowManager.getWorkflow(selectedWorkflow);
        if (workflow) {
          // Hier könnten wir die Parameter aus dem Workflow extrahieren
          // Da dies komplex ist, verwenden wir ein leeres Objekt als Ausgangspunkt
          setWorkflowParams({});
        }
      } catch (err) {
        console.error('Fehler beim Laden der Workflow-Parameter:', err);
        setError('Workflow-Parameter konnten nicht geladen werden.');
      }
    }
  }, [selectedWorkflow]);

  // Workflows laden
  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const workflowList = listWorkflows();
      setWorkflows(workflowList);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Workflows:', err);
      setError('Workflows konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Workflow-Artefakt erstellen
  const createWorkflowArtifact = async (values: any) => {
    setCreating(true);
    setError(null);
    
    try {
      const result = await callTool('create_workflow_artifact', [
        values.name,
        values.description,
        values.workflowId,
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
        showToast('success', 'Workflow-Artefakt erfolgreich erstellt');
      } else {
        setError(result.message || 'Unbekannter Fehler beim Erstellen des Artefakts');
        showToast('error', 'Fehler beim Erstellen des Workflow-Artefakts');
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des Workflow-Artefakts:', err);
      setError(`Fehler: ${err.message || 'Unbekannter Fehler'}`);
      showToast('error', 'Fehler beim Erstellen des Workflow-Artefakts');
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
    setSelectedWorkflow(null);
    setWorkflowParams({});
    setArtifactCreated(false);
    setArtifactData(null);
    setError(null);
  };

  return (
    <div className="workflow-artifact-creator">
      <Card title="Workflow-Artefakt erstellen" bordered={false}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="Lade Workflows..." />
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
                  message="Workflow-Artefakt erfolgreich erstellt"
                  description={
                    <div>
                      <p>Das Workflow-Artefakt wurde erfolgreich erstellt. Teilen Sie die folgende URL mit Claude-Benutzern:</p>
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
                  <Text strong>Workflow-ID: </Text>
                  <Text>{artifactData.workflowId}</Text>
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
                onFinish={createWorkflowArtifact}
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
                  <Input placeholder="Name des Workflow-Artefakts" />
                </Form.Item>
                
                <Form.Item
                  name="description"
                  label="Beschreibung"
                  rules={[{ required: true, message: 'Bitte geben Sie eine Beschreibung an' }]}
                >
                  <TextArea
                    placeholder="Beschreibung des Workflow-Artefakts"
                    rows={3}
                  />
                </Form.Item>
                
                <Form.Item
                  name="workflowId"
                  label="Workflow"
                  rules={[{ required: true, message: 'Bitte wählen Sie einen Workflow aus' }]}
                >
                  <Select 
                    placeholder="Workflow auswählen"
                    onChange={(value) => setSelectedWorkflow(value)}
                    loading={loading}
                  >
                    {workflows.map(workflow => (
                      <Option key={workflow.id} value={workflow.id}>
                        {workflow.name}
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
                    initialValue={workflowParams}
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
                    Workflow-Artefakt erstellen
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