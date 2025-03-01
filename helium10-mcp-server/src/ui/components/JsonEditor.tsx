import React, { useState, useEffect } from 'react';
import { Button, Alert } from 'antd';
import MonacoEditor from 'react-monaco-editor';

/**
 * Props für den JSON-Editor
 */
interface JsonEditorProps {
  initialValue?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
  height?: number;
  readOnly?: boolean;
}

/**
 * JSON-Editor-Komponente
 * Ermöglicht die Bearbeitung von JSON-Objekten mit Syntax-Highlighting und Validierung
 */
export const JsonEditor: React.FC<JsonEditorProps> = ({
  initialValue = {},
  onChange,
  height = 300,
  readOnly = false
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialisieren mit dem übergebenen Objekt
  useEffect(() => {
    try {
      const initialJson = JSON.stringify(initialValue, null, 2);
      setJsonText(initialJson);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Konvertieren des Anfangswerts in JSON:', err);
      setJsonText('{}');
      setError('Der Anfangswert konnte nicht in JSON konvertiert werden.');
    }
  }, [initialValue]);

  // Format-Optionen für den Editor
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly,
    cursorStyle: 'line',
    automaticLayout: true,
    minimap: {
      enabled: false
    }
  };

  // JSON-Text ändern
  const handleEditorChange = (value: string) => {
    setJsonText(value);
    
    try {
      const parsedJson = JSON.parse(value);
      setError(null);
      if (onChange) {
        onChange(parsedJson);
      }
    } catch (err) {
      setError(`Ungültiges JSON: ${err.message}`);
      // Bei ungültigem JSON nicht den onChange-Handler aufrufen
    }
  };

  // JSON formatieren
  const formatJson = () => {
    try {
      const parsedJson = JSON.parse(jsonText);
      const formattedJson = JSON.stringify(parsedJson, null, 2);
      setJsonText(formattedJson);
      setError(null);
    } catch (err) {
      setError(`Formatierung fehlgeschlagen: ${err.message}`);
    }
  };

  return (
    <div className="json-editor-container">
      {error && (
        <Alert
          message="JSON-Fehler"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '10px' }}
        />
      )}
      
      <MonacoEditor
        width="100%"
        height={height}
        language="json"
        theme="vs-light"
        value={jsonText}
        options={editorOptions}
        onChange={handleEditorChange}
      />
      
      {!readOnly && (
        <div style={{ marginTop: '10px', textAlign: 'right' }}>
          <Button onClick={formatJson} disabled={!!error}>
            Formatieren
          </Button>
        </div>
      )}
    </div>
  );
}; 