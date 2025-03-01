import React, { useState } from 'react';
import { Layout, Menu, Button, Breadcrumb } from 'antd';
import {
  HomeOutlined,
  ToolOutlined,
  ApiOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { ToastProvider } from './hooks/useToast';
import { Home } from './components/Home';
import { ArtifactCreator } from './components/ArtifactCreator';
import { WorkflowArtifactCreator } from './components/WorkflowArtifactCreator';
import { ArtifactList } from './components/ArtifactList';
import { ToolList } from './components/ToolList';
import { SettingsPage } from './components/SettingsPage';

import './App.css';

const { Header, Content, Footer, Sider } = Layout;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('home');
  
  // Mapping von Schlüsseln zu Breadcrumb-Pfaden
  const breadcrumbPaths: Record<string, { text: string, path: string[] }> = {
    'home': { text: 'Home', path: ['Home'] },
    'create-artifact': { text: 'Tool-Artefakt erstellen', path: ['Home', 'Artefakte erstellen', 'Tool-Artefakt'] },
    'create-workflow-artifact': { text: 'Workflow-Artefakt erstellen', path: ['Home', 'Artefakte erstellen', 'Workflow-Artefakt'] },
    'artifacts': { text: 'Artefakte', path: ['Home', 'Artefakte'] },
    'tools': { text: 'Tools & Workflows', path: ['Home', 'Tools & Workflows'] },
    'settings': { text: 'Einstellungen', path: ['Home', 'Einstellungen'] },
  };
  
  // Aktueller Breadcrumb-Pfad
  const currentPath = breadcrumbPaths[selectedKey] || breadcrumbPaths['home'];
  
  // Rendern des Inhalts basierend auf dem ausgewählten Menüpunkt
  const renderContent = () => {
    switch (selectedKey) {
      case 'create-artifact':
        return <ArtifactCreator />;
      case 'create-workflow-artifact':
        return <WorkflowArtifactCreator />;
      case 'artifacts':
        return <ArtifactList />;
      case 'tools':
        return <ToolList />;
      case 'settings':
        return <SettingsPage />;
      case 'home':
      default:
        return <Home onMenuSelect={setSelectedKey} />;
    }
  };
  
  return (
    <ToastProvider>
      <Layout className="app-container">
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="site-sider"
          width={240}
        >
          <div className="logo" style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <img src="/logo.png" alt="MCP Logo" style={{ height: '32px', marginRight: collapsed ? 0 : '8px' }} />
            {!collapsed && <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>MCP</span>}
          </div>
          
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            className="site-menu"
          >
            <Menu.Item key="home" icon={<HomeOutlined />}>
              Home
            </Menu.Item>
            
            <Menu.SubMenu key="sub1" icon={<PlusOutlined />} title="Artefakt erstellen">
              <Menu.Item key="create-artifact" icon={<ToolOutlined />}>
                Tool-Artefakt
              </Menu.Item>
              <Menu.Item key="create-workflow-artifact" icon={<ApiOutlined />}>
                Workflow-Artefakt
              </Menu.Item>
            </Menu.SubMenu>
            
            <Menu.Item key="artifacts" icon={<UnorderedListOutlined />}>
              Artefakte
            </Menu.Item>
            
            <Menu.Item key="tools" icon={<ToolOutlined />}>
              Tools & Workflows
            </Menu.Item>
            
            <Menu.Item key="settings" icon={<SettingOutlined />}>
              Einstellungen
            </Menu.Item>
          </Menu>
          
          <div className="site-sider-collapse-button">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              size="small"
            />
          </div>
        </Sider>
        
        <Layout>
          <Header className="site-header" style={{ padding: '0 24px', background: '#1890ff', display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo-alt.png" alt="Claude AI Logo" className="header-logo" />
              <h1 className="header-title">Claude.ai Desktop Integration</h1>
            </div>
          </Header>
          
          <Content className="site-content">
            <Breadcrumb className="app-breadcrumb">
              {currentPath.path.map((item, index) => (
                <Breadcrumb.Item key={index}>
                  {index === 0 ? <HomeOutlined /> : null}
                  {item}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
            
            <div className="site-content-background">
              {renderContent()}
            </div>
          </Content>
          
          <Footer className="site-footer">
            MCP Claude.ai Desktop Integration &copy; {new Date().getFullYear()} Helium10 - Alle Rechte vorbehalten
          </Footer>
        </Layout>
      </Layout>
    </ToastProvider>
  );
};

export default App; 