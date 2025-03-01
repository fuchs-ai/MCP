/**
 * Tests für das Workflow-System
 * 
 * Diese Tests prüfen die sequentielle Ausführung von MCP-Tool-Workflows.
 */

import { WorkflowManager, createWorkflowManager } from '../src/utils/workflow';
import * as fs from 'fs';
import * as path from 'path';

// Mock der Filesystem-Funktionen
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

describe('WorkflowManager', () => {
  let workflowManager: WorkflowManager;
  
  // Mock-Funktionen für die Workflow-Schritte
  const mockStep1 = jest.fn().mockImplementation(data => ({
    ...data,
    step1Result: 'Ergebnis von Schritt 1'
  }));
  
  const mockStep2 = jest.fn().mockImplementation((data, context) => ({
    ...data,
    step2Result: 'Ergebnis von Schritt 2',
    previousStep1: context.previousResults.step1.step1Result
  }));
  
  const mockStep3 = jest.fn().mockImplementation((data, context) => ({
    ...data,
    step3Result: 'Ergebnis von Schritt 3',
    previousStep2: context.previousResults.step2.step2Result
  }));
  
  beforeEach(() => {
    // Vor jedem Test zurücksetzen
    jest.clearAllMocks();
    
    // Neuen WorkflowManager für jeden Test erstellen
    workflowManager = createWorkflowManager(manager => {
      manager
        .registerStep('step1', mockStep1)
        .registerStep('step2', mockStep2)
        .registerStep('step3', mockStep3)
        .registerWorkflow('testWorkflow', ['step1', 'step2', 'step3']);
    });
  });
  
  test('Workflow-Schritte sollten sequentiell ausgeführt werden', async () => {
    // Test-Daten
    const initialData = { testInput: 'Testdaten' };
    
    // Workflow ausführen
    const result = await workflowManager.executeWorkflow('testWorkflow', initialData);
    
    // Prüfen, ob alle Schritte ausgeführt wurden
    expect(mockStep1).toHaveBeenCalledTimes(1);
    expect(mockStep2).toHaveBeenCalledTimes(1);
    expect(mockStep3).toHaveBeenCalledTimes(1);
    
    // Prüfen, ob die Schritte in der richtigen Reihenfolge ausgeführt wurden
    const step1Call = mockStep1.mock.invocationCallOrder[0];
    const step2Call = mockStep2.mock.invocationCallOrder[0];
    const step3Call = mockStep3.mock.invocationCallOrder[0];
    
    expect(step1Call).toBeLessThan(step2Call);
    expect(step2Call).toBeLessThan(step3Call);
    
    // Prüfen, ob die Daten korrekt weitergegeben wurden
    expect(result).toEqual({
      testInput: 'Testdaten',
      step1Result: 'Ergebnis von Schritt 1',
      step2Result: 'Ergebnis von Schritt 2',
      step3Result: 'Ergebnis von Schritt 3',
      previousStep1: 'Ergebnis von Schritt 1',
      previousStep2: 'Ergebnis von Schritt 2'
    });
  });
  
  test('Workflow sollte bei nicht registriertem Workflow eine Fehlermeldung werfen', async () => {
    // Erwarte, dass ein Fehler geworfen wird
    await expect(
      workflowManager.executeWorkflow('nichtExistierenderWorkflow', {})
    ).rejects.toThrow('Workflow nicht gefunden');
  });
  
  test('Workflow sollte bei nicht registriertem Schritt eine Fehlermeldung werfen', async () => {
    // Registriere einen Workflow mit einem nicht existierenden Schritt
    workflowManager.registerWorkflow('fehlerhafterWorkflow', ['step1', 'nichtExistierenderSchritt']);
    
    // Erwarte, dass ein Fehler geworfen wird
    await expect(
      workflowManager.executeWorkflow('fehlerhafterWorkflow', {})
    ).rejects.toThrow('Workflow-Schritt nicht gefunden');
  });
  
  test('getResults sollte alle bisherigen Ergebnisse zurückgeben', async () => {
    // Überschreibe mockStep2, um die Ergebnisse zu prüfen
    const customMockStep2 = jest.fn().mockImplementation((data, context) => {
      const results = workflowManager.getResults();
      return {
        ...data,
        step2Result: 'Ergebnis von Schritt 2',
        availableResults: Object.keys(results)
      };
    });
    
    // Registriere den angepassten Schritt
    workflowManager.registerStep('step2', customMockStep2);
    
    // Workflow ausführen
    const result = await workflowManager.executeWorkflow('testWorkflow', { testInput: 'Testdaten' });
    
    // Prüfen, ob die Ergebnisse korrekt gesammelt wurden
    expect(result.availableResults).toContain('initial');
    expect(result.availableResults).toContain('step1');
  });
  
  test('getAvailableWorkflows sollte alle registrierten Workflows zurückgeben', () => {
    // Zusätzlichen Workflow registrieren
    workflowManager.registerWorkflow('zweiterWorkflow', ['step1']);
    
    // Prüfen, ob beide Workflows zurückgegeben werden
    const workflows = workflowManager.getAvailableWorkflows();
    
    expect(workflows).toContain('testWorkflow');
    expect(workflows).toContain('zweiterWorkflow');
    expect(workflows.length).toBe(2);
  });
  
  test('Workflow-Fehlerbehandlung: Fehler in einem Schritt sollte den Workflow abbrechen', async () => {
    // Mock-Funktion, die einen Fehler wirft
    const errorStep = jest.fn().mockImplementation(() => {
      throw new Error('Testfehler');
    });
    
    // Registriere den fehlerhaften Schritt
    workflowManager.registerStep('errorStep', errorStep);
    workflowManager.registerWorkflow('fehlerWorkflow', ['step1', 'errorStep', 'step3']);
    
    // Erwarte, dass ein Fehler geworfen wird
    await expect(
      workflowManager.executeWorkflow('fehlerWorkflow', { testInput: 'Testdaten' })
    ).rejects.toThrow('Testfehler');
    
    // Prüfen, ob nur die Schritte vor dem Fehler ausgeführt wurden
    expect(mockStep1).toHaveBeenCalledTimes(1);
    expect(errorStep).toHaveBeenCalledTimes(1);
    expect(mockStep3).not.toHaveBeenCalled();
    
    // Prüfen, ob Protokolldatei erstellt wurde
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });
});

describe('Komplexe Workflow-Interaktionen', () => {
  test('Mehrere Workflows sollten unabhängig ausgeführt werden können', async () => {
    // Erstelle einen eigenen WorkflowManager für diesen Test
    const manager = new WorkflowManager();
    
    // Mock-Funktionen für unabhängige Workflows
    const workflow1Step = jest.fn().mockResolvedValue({ workflow: 1 });
    const workflow2Step = jest.fn().mockResolvedValue({ workflow: 2 });
    
    // Registriere zwei unabhängige Workflows
    manager
      .registerStep('workflow1Step', workflow1Step)
      .registerStep('workflow2Step', workflow2Step)
      .registerWorkflow('workflow1', ['workflow1Step'])
      .registerWorkflow('workflow2', ['workflow2Step']);
    
    // Führe beide Workflows aus
    const [result1, result2] = await Promise.all([
      manager.executeWorkflow('workflow1', {}),
      manager.executeWorkflow('workflow2', {})
    ]);
    
    // Prüfe, ob beide Workflows korrekt ausgeführt wurden
    expect(result1).toEqual({ workflow: 1 });
    expect(result2).toEqual({ workflow: 2 });
    expect(workflow1Step).toHaveBeenCalledTimes(1);
    expect(workflow2Step).toHaveBeenCalledTimes(1);
  });
  
  test('Workflow-Kontext sollte an alle Schritte weitergegeben werden', async () => {
    // Erstelle einen eigenen WorkflowManager für diesen Test
    const manager = new WorkflowManager();
    
    // Mock-Funktionen, die den Kontext prüfen
    const step1 = jest.fn().mockImplementation((data, context) => {
      return { contextInStep1: context.testContext };
    });
    
    const step2 = jest.fn().mockImplementation((data, context) => {
      return { 
        ...data,
        contextInStep2: context.testContext
      };
    });
    
    // Registriere Workflow mit Kontext-abhängigen Schritten
    manager
      .registerStep('step1', step1)
      .registerStep('step2', step2)
      .registerWorkflow('contextWorkflow', ['step1', 'step2']);
    
    // Führe Workflow mit speziellem Kontext aus
    const result = await manager.executeWorkflow('contextWorkflow', {}, {
      testContext: 'Testwert im Kontext'
    });
    
    // Prüfe, ob der Kontext korrekt weitergegeben wurde
    expect(result.contextInStep1).toBe('Testwert im Kontext');
    expect(result.contextInStep2).toBe('Testwert im Kontext');
  });
});

describe('Erweiterte Workflow-Funktionen', () => {
  let workflowManager: WorkflowManager;
  
  beforeEach(() => {
    // Vor jedem Test zurücksetzen
    jest.clearAllMocks();
    
    // Neuen WorkflowManager für jeden Test erstellen
    workflowManager = new WorkflowManager();
  });
  
  test('Parallele Ausführung sollte mehrere Schritte gleichzeitig ausführen', async () => {
    // Mock-Funktionen mit Verzögerung
    const step1 = jest.fn().mockImplementation(async (data) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { ...data, result1: 'Ergebnis 1' };
    });
    
    const step2 = jest.fn().mockImplementation(async (data) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { ...data, result2: 'Ergebnis 2' };
    });
    
    const step3 = jest.fn().mockImplementation(async (data) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { ...data, result3: 'Ergebnis 3' };
    });
    
    const finalStep = jest.fn().mockImplementation(async (data, context) => {
      return { final: 'Abgeschlossen', ...data };
    });
    
    // Registriere Schritte und Workflow
    workflowManager
      .registerStep('step1', step1)
      .registerStep('step2', step2)
      .registerStep('step3', step3)
      .registerStep('finalStep', finalStep)
      .registerParallelGroup('parallelSteps', ['step1', 'step2', 'step3'])
      .registerWorkflow('parallelTest', ['parallelSteps', 'finalStep']);
    
    // Führe Workflow aus
    const startTime = Date.now();
    const result = await workflowManager.executeWorkflow('parallelTest', { input: 'Testdaten' });
    const duration = Date.now() - startTime;
    
    // Prüfen, ob alle Schritte aufgerufen wurden
    expect(step1).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step3).toHaveBeenCalledTimes(1);
    expect(finalStep).toHaveBeenCalledTimes(1);
    
    // Prüfe, ob die parallelSteps im Ergebnis enthalten sind
    expect(result).toHaveProperty('parallelResults');
    expect(result.parallelResults).toHaveProperty('step1');
    expect(result.parallelResults).toHaveProperty('step2');
    expect(result.parallelResults).toHaveProperty('step3');
    
    // Die Gesamtzeit sollte weniger als die Summe der Einzelzeiten sein
    // (berücksichtige etwas Overhead)
    expect(duration).toBeLessThan(3 * 50 + 100);
  });
  
  test('Retry-Mechanismus sollte bei transienten Fehlern automatisch wiederholen', async () => {
    // Mock-Funktion, die beim ersten und zweiten Aufruf fehlschlägt
    let versuche = 0;
    const unstableStep = jest.fn().mockImplementation(async () => {
      versuche++;
      if (versuche <= 2) {
        throw new Error('NETWORK_ERROR: Temporärer Fehler');
      }
      return { result: `Erfolgreich nach ${versuche} Versuchen` };
    });
    
    // Registriere Schritt mit Retry-Konfiguration
    workflowManager
      .registerStep('unstableStep', unstableStep)
      .configureRetry('unstableStep', {
        maxRetries: 3,
        initialDelay: 10,
        backoffFactor: 1.5
      })
      .registerWorkflow('retryTest', ['unstableStep']);
    
    // Führe Workflow aus
    const result = await workflowManager.executeWorkflow('retryTest', {});
    
    // Prüfen, ob der Schritt mehrmals aufgerufen wurde
    expect(unstableStep).toHaveBeenCalledTimes(3); // 2 Fehler + 1 Erfolg
    expect(result).toHaveProperty('result', 'Erfolgreich nach 3 Versuchen');
  });
  
  test('Retry-Mechanismus sollte bei Erreichen der maximalen Wiederholungen einen Fehler werfen', async () => {
    // Mock-Funktion, die immer fehlschlägt
    const alwaysFailingStep = jest.fn().mockImplementation(() => {
      throw new Error('PERSISTENT_ERROR: Dauerhafter Fehler');
    });
    
    // Registriere Schritt mit Retry-Konfiguration
    workflowManager
      .registerStep('failingStep', alwaysFailingStep)
      .configureRetry('failingStep', {
        maxRetries: 2,
        initialDelay: 10,
        backoffFactor: 1
      })
      .registerWorkflow('persistentFailTest', ['failingStep']);
    
    // Erwarte, dass ein Fehler geworfen wird
    await expect(
      workflowManager.executeWorkflow('persistentFailTest', {})
    ).rejects.toThrow('PERSISTENT_ERROR');
    
    // Prüfen, ob der Schritt mehrmals aufgerufen wurde
    expect(alwaysFailingStep).toHaveBeenCalledTimes(3); // Erster Versuch + 2 Wiederholungen
  });
  
  test('Bedingte Ausführung sollte Schritte basierend auf Bedingungen überspringen', async () => {
    // Mock-Funktionen für bedingte Ausführung
    const initialStep = jest.fn().mockImplementation(data => ({ ...data, value: data.testValue }));
    const conditionalStep1 = jest.fn().mockImplementation(data => ({ ...data, executed1: true }));
    const conditionalStep2 = jest.fn().mockImplementation(data => ({ ...data, executed2: true }));
    const finalStep = jest.fn().mockImplementation(data => ({ ...data, final: true }));
    
    // Registriere Schritte und Bedingungen
    workflowManager
      .registerStep('initialStep', initialStep)
      .registerStep('conditionalStep1', conditionalStep1)
      .registerStep('conditionalStep2', conditionalStep2)
      .registerStep('finalStep', finalStep)
      .setStepCondition('conditionalStep1', data => data.value > 50)
      .setStepCondition('conditionalStep2', data => data.value <= 50)
      .registerWorkflow('conditionalTest', [
        'initialStep',
        'conditionalStep1',
        'conditionalStep2',
        'finalStep'
      ]);
    
    // Test mit Wert > 50
    const highResult = await workflowManager.executeWorkflow('conditionalTest', { testValue: 75 });
    
    expect(initialStep).toHaveBeenCalledTimes(1);
    expect(conditionalStep1).toHaveBeenCalledTimes(1);
    expect(conditionalStep2).not.toHaveBeenCalled();
    expect(finalStep).toHaveBeenCalledTimes(1);
    expect(highResult).toHaveProperty('executed1', true);
    expect(highResult).not.toHaveProperty('executed2');
    
    // Zurücksetzen der Mocks
    jest.clearAllMocks();
    
    // Test mit Wert <= 50
    const lowResult = await workflowManager.executeWorkflow('conditionalTest', { testValue: 25 });
    
    expect(initialStep).toHaveBeenCalledTimes(1);
    expect(conditionalStep1).not.toHaveBeenCalled();
    expect(conditionalStep2).toHaveBeenCalledTimes(1);
    expect(finalStep).toHaveBeenCalledTimes(1);
    expect(lowResult).not.toHaveProperty('executed1');
    expect(lowResult).toHaveProperty('executed2', true);
  });
  
  test('Dynamische Workflows sollten Schritte zur Laufzeit bestimmen', async () => {
    // Mock-Funktionen für dynamischen Workflow
    const step1 = jest.fn().mockImplementation(data => ({ ...data, step1: true }));
    const step2 = jest.fn().mockImplementation(data => ({ ...data, step2: true }));
    const step3 = jest.fn().mockImplementation(data => ({ ...data, step3: true }));
    
    // Registriere Schritte
    workflowManager
      .registerStep('step1', step1)
      .registerStep('step2', step2)
      .registerStep('step3', step3);
    
    // Registriere dynamischen Workflow
    workflowManager.registerDynamicWorkflow('dynamicTest', (data) => {
      const steps = ['step1'];
      
      if (data.includeStep2) {
        steps.push('step2');
      }
      
      if (data.includeStep3) {
        steps.push('step3');
      }
      
      return steps;
    });
    
    // Test mit nur Schritt 1 und 3
    const result1 = await workflowManager.executeWorkflow('dynamicTest', { 
      includeStep2: false,
      includeStep3: true
    });
    
    expect(step1).toHaveBeenCalledTimes(1);
    expect(step2).not.toHaveBeenCalled();
    expect(step3).toHaveBeenCalledTimes(1);
    expect(result1).toHaveProperty('step1', true);
    expect(result1).not.toHaveProperty('step2');
    expect(result1).toHaveProperty('step3', true);
    
    // Zurücksetzen der Mocks
    jest.clearAllMocks();
    
    // Test mit allen Schritten
    const result2 = await workflowManager.executeWorkflow('dynamicTest', { 
      includeStep2: true,
      includeStep3: true
    });
    
    expect(step1).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledTimes(1);
    expect(step3).toHaveBeenCalledTimes(1);
    expect(result2).toHaveProperty('step1', true);
    expect(result2).toHaveProperty('step2', true);
    expect(result2).toHaveProperty('step3', true);
  });
}); 