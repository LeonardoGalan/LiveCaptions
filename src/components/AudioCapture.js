import React, { useState, useEffect } from "react";

function AudioCapture({ onSourceSelected, selectedSource }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSources = async () => {
    setLoading(true);
    try {
      const audioSources = await window.electronAPI.getAudioSources();
      setSources(audioSources);
    } catch (error) {
      console.error("Failed to get audio sources:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSources();
  }, []);

  return (
    <div className="audio-capture card">
      <h2>Select Audio Source</h2>
      <button onClick={loadSources} disabled={loading}>
        {loading ? "Loading..." : "Refresh Sources"}
      </button>

      <div className="source-list">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`source-item ${
              selectedSource?.id === source.id ? "selected" : ""
            }`}
            onClick={() => onSourceSelected(source)}
          >
            <span className="source-name">{source.name}</span>
          </div>
        ))}
      </div>

      {selectedSource && (
        <p className="selected-info">
          Selected: <strong>{selectedSource.name}</strong>
        </p>
      )}
    </div>
  );
}

export default AudioCapture;
