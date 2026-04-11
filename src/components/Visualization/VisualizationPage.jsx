import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getVisualizationScript } from '../../services/aiService';
import {
  createVisualizationScript,
  getVisualizationScriptEntry,
  saveVisualizationSession,
} from '../../services/riderToolkitService';
import { buildMovementLabel } from './visualizationConstants';
import VisualizationForm from './VisualizationForm';
import VisualizationOutput from './VisualizationOutput';
import YDJLoading from '../YDJLoading';
import './Visualization.css';

export default function VisualizationPage() {
  const { id: scriptId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState(scriptId ? 'loading' : 'form'); // form | loading | output
  const [script, setScript] = useState(null);
  const [scriptContext, setScriptContext] = useState('training');
  const [currentScriptId, setCurrentScriptId] = useState(scriptId || null);
  const [scriptLength, setScriptLength] = useState('standard');
  const [generating, setGenerating] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [error, setError] = useState(null);

  // Load existing script if we have a scriptId
  useEffect(() => {
    if (!scriptId || !currentUser) return;
    loadExisting(scriptId);
  }, [scriptId, currentUser]);

  async function loadExisting(id) {
    setMode('loading');
    const result = await getVisualizationScriptEntry(id);
    if (!result.success || !result.data) {
      setError('Script not found or access denied.');
      setMode('form');
      return;
    }
    const data = result.data;
    if (data.userId !== currentUser.uid) {
      setError('Script not found or access denied.');
      setMode('form');
      return;
    }
    if (data.entryType !== 'visualization-script' || !data.scriptContent) {
      setError('This is not a visualization script.');
      setMode('form');
      return;
    }

    const parsed = typeof data.scriptContent === 'string'
      ? JSON.parse(data.scriptContent)
      : data.scriptContent;

    setScript(parsed);
    setScriptContext(data.context || 'training');
    setScriptLength(data.scriptLength || 'standard');
    setCurrentScriptId(id);
    setMode('output');
  }

  async function handleGenerate(formData) {
    setGenerating(true);
    setError(null);

    try {
      const result = await getVisualizationScript(formData);

      if (!result || !result.success || !result.script) {
        throw new Error(result?.message || 'Script generation failed.');
      }

      const generatedScript = result.script;
      const movementLabel = buildMovementLabel(formData);

      // Save to Firestore
      const saveResult = await createVisualizationScript(
        currentUser.uid, formData, generatedScript, movementLabel
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save script.');
      }

      setScript(generatedScript);
      setScriptContext(formData.context);
      setScriptLength(formData.scriptLength);
      setCurrentScriptId(saveResult.data.id);
      setSessionSaved(false);
      setMode('output');

      // Update URL to include the scriptId (without navigation)
      window.history.replaceState(
        {},
        '',
        `/toolkit/visualization/${saveResult.data.id}`
      );
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || "We couldn't generate your script right now. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveSession(sessionData) {
    if (!currentScriptId) return;

    const result = await saveVisualizationSession(currentScriptId, {
      ...sessionData,
      scriptLength,
    });

    if (result.success) {
      setSessionSaved(true);
    } else {
      setError('Failed to save session. Please try again.');
    }
  }

  function handleReset() {
    setScript(null);
    setCurrentScriptId(null);
    setSessionSaved(false);
    setError(null);
    setMode('form');
    navigate('/toolkit/visualization/new', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="viz-page">
      {/* Loading overlay */}
      {generating && (
        <div className="viz-loading-overlay">
          <YDJLoading message="Crafting your visualization" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="viz-inline-error">{error}</div>
      )}

      {/* Loading state for existing script */}
      {mode === 'loading' && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-light)' }}>
          Loading your script...
        </div>
      )}

      {/* Form mode */}
      {mode === 'form' && (
        <VisualizationForm
          onGenerate={handleGenerate}
          generating={generating}
        />
      )}

      {/* Output mode */}
      {mode === 'output' && script && (
        <VisualizationOutput
          script={script}
          context={scriptContext}
          onSaveSession={handleSaveSession}
          onReset={handleReset}
          sessionSaved={sessionSaved}
        />
      )}
    </div>
  );
}
