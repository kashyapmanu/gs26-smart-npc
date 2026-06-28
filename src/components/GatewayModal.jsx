import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

export default function GatewayModal({ isOpen, onClose, apiKey, saveApiKey, model, saveModel, onReset }) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [modelSelect, setModelSelect] = useState(model);
  const [status, setStatus] = useState('');
  const [statusClass, setStatusClass] = useState('form-status');
  const { playClick } = useAudio();

  useEffect(() => {
    if (isOpen) {
      setKeyInput(apiKey);
      setModelSelect(model);
      setStatus('');
    }
  }, [isOpen, apiKey, model]);

  if (!isOpen) return null;

  const handleSave = () => {
    playClick();
    saveApiKey(keyInput.trim());
    saveModel(modelSelect);
    setStatus('Settings saved successfully!');
    setStatusClass('form-status success');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleReset = () => {
    playClick();
    if (window.confirm("Are you sure you want to restart the demo? This resets all progress, dialog histories, and reputation.")) {
      onReset();
      onClose();
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <dialog open onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ Gateway Configuration</h2>
        <p className="modal-desc">
          Configure your Mesh API credentials to generate live, dynamic dialogues using Large Language Models.
        </p>
        
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="apiKeyInput">Mesh API Key:</label>
            <input 
              type="password" 
              id="apiKeyInput" 
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your Mesh API Key (mesh_...)"
            />
            <span className="help-text">
              Your key stays locally in your browser. Get one at{' '}
              <a href="https://developers.meshapi.ai" target="_blank" rel="noopener noreferrer">
                developers.meshapi.ai
              </a>
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="modelSelect">Target LLM Model:</label>
            <select 
              id="modelSelect"
              value={modelSelect}
              onChange={(e) => setModelSelect(e.target.value)}
            >
              <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Fast & Recommended)</option>
              <option value="google/gemini-1.5-flash">google/gemini-1.5-flash</option>
              <option value="meta-llama/llama-3-8b">meta-llama/llama-3-8b</option>
              <option value="meta-llama/llama-3.1-70b-instruct">meta-llama/llama-3.1-70b-instruct</option>
            </select>
          </div>

          {status && <div className={statusClass}>{status}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={handleReset}>
              🔄 Restart Demo
            </button>
            <button type="button" className="primary-btn" onClick={handleSave}>
              Save Settings
            </button>
            <button type="button" className="close-btn-text" onClick={() => { playClick(); onClose(); }}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
