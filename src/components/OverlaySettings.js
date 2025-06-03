import React, { useState, useEffect } from "react";

function OverlaySettings({
  showOverlay,
  onOverlayToggle,
  whisperModel,
  onModelChange,
}) {
  // Load saved settings or use defaults
  const loadSettings = () => {
    const saved = localStorage.getItem("translatorSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      return {
        overlayPosition: settings.overlayPosition || { x: 100, y: 50 },
        overlaySize: settings.overlaySize || { width: 800, height: 120 },
        subtitleStyle: settings.subtitleStyle || {
          fontSize: 24,
          color: "#ffffff",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          fontFamily: "Arial",
        },
      };
    }
    return {
      overlayPosition: { x: 100, y: 50 },
      overlaySize: { width: 800, height: 120 },
      subtitleStyle: {
        fontSize: 24,
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        fontFamily: "Arial",
      },
    };
  };

  const initialSettings = loadSettings();

  // Position and size state
  const [overlayPosition, setOverlayPosition] = useState(
    initialSettings.overlayPosition
  );
  const [overlaySize, setOverlaySize] = useState(initialSettings.overlaySize);

  // Subtitle styling state
  const [subtitleStyle, setSubtitleStyle] = useState(
    initialSettings.subtitleStyle
  );

  // Save settings whenever they change
  const saveSettings = () => {
    localStorage.setItem(
      "translatorSettings",
      JSON.stringify({
        whisperModel,
        overlayPosition,
        overlaySize,
        subtitleStyle,
        showOverlay,
      })
    );
  };

  // Auto-save when settings change
  useEffect(() => {
    saveSettings();
  }, [whisperModel, overlayPosition, overlaySize, subtitleStyle, showOverlay]);

  const handleOverlayToggle = (e) => {
    const show = e.target.checked;
    onOverlayToggle(show);
    window.electronAPI.toggleOverlay(show);
  };

  const updateOverlayPosition = (axis, value) => {
    const newPosition = { ...overlayPosition, [axis]: parseInt(value) };
    setOverlayPosition(newPosition);
    window.electronAPI.updateOverlayBounds({ ...newPosition, ...overlaySize });
  };

  const updateOverlaySize = (dimension, value) => {
    const newSize = { ...overlaySize, [dimension]: parseInt(value) };
    setOverlaySize(newSize);
    window.electronAPI.updateOverlayBounds({ ...overlayPosition, ...newSize });
  };

  const updateSubtitleStyle = (property, value) => {
    const newStyle = { ...subtitleStyle, [property]: value };
    setSubtitleStyle(newStyle);
    window.electronAPI.updateSubtitleStyle(newStyle);
  };

  return (
    <div className="overlay-settings card">
      <h2>Settings</h2>

      {/* Existing settings */}
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={showOverlay}
            onChange={handleOverlayToggle}
          />
          Show subtitle overlay
        </label>
      </div>

      <div className="setting-item">
        <label>
          Whisper Model:
          <select
            value={whisperModel}
            onChange={(e) => onModelChange(e.target.value)}
          >
            <option value="tiny">Tiny (Fastest)</option>
            <option value="base">Base (Balanced)</option>
            <option value="small">Small (Better)</option>
            <option value="medium">Medium (Good)</option>
            <option value="large">Large (Best)</option>
          </select>
        </label>
      </div>

      {/* New: Position Controls */}
      <div className="setting-group">
        <h3>Overlay Position</h3>
        <div className="position-controls">
          <label>
            X:{" "}
            <input
              type="range"
              min="0"
              max="1920"
              value={overlayPosition.x}
              onChange={(e) => updateOverlayPosition("x", e.target.value)}
            />
            <span>{overlayPosition.x}px</span>
          </label>
          <label>
            Y:{" "}
            <input
              type="range"
              min="0"
              max="1080"
              value={overlayPosition.y}
              onChange={(e) => updateOverlayPosition("y", e.target.value)}
            />
            <span>{overlayPosition.y}px</span>
          </label>
        </div>
      </div>

      {/* New: Size Controls */}
      <div className="setting-group">
        <h3>Overlay Size</h3>
        <div className="size-controls">
          <label>
            Width:{" "}
            <input
              type="range"
              min="400"
              max="1200"
              value={overlaySize.width}
              onChange={(e) => updateOverlaySize("width", e.target.value)}
            />
            <span>{overlaySize.width}px</span>
          </label>
          <label>
            Height:{" "}
            <input
              type="range"
              min="80"
              max="200"
              value={overlaySize.height}
              onChange={(e) => updateOverlaySize("height", e.target.value)}
            />
            <span>{overlaySize.height}px</span>
          </label>
        </div>
      </div>

      {/* New: Subtitle Styling */}
      <div className="setting-group">
        <h3>Subtitle Style</h3>
        <div className="style-controls">
          <label>
            Font Size:{" "}
            <input
              type="range"
              min="16"
              max="48"
              value={subtitleStyle.fontSize}
              onChange={(e) => updateSubtitleStyle("fontSize", e.target.value)}
            />
            <span>{subtitleStyle.fontSize}px</span>
          </label>

          <label>
            Text Color:
            <input
              type="color"
              value={subtitleStyle.color}
              onChange={(e) => updateSubtitleStyle("color", e.target.value)}
            />
          </label>

          <label>
            Background Opacity:
            <input
              type="range"
              min="0"
              max="100"
              value={parseInt(
                subtitleStyle.backgroundColor.match(/[\d.]+/g)[3] * 100
              )}
              onChange={(e) => {
                const opacity = e.target.value / 100;
                updateSubtitleStyle(
                  "backgroundColor",
                  `rgba(0, 0, 0, ${opacity})`
                );
              }}
            />
          </label>

          <label>
            Font:
            <select
              value={subtitleStyle.fontFamily}
              onChange={(e) =>
                updateSubtitleStyle("fontFamily", e.target.value)
              }
            >
              <option value="Arial">Arial</option>
              <option value="'Noto Sans JP'">Noto Sans JP</option>
              <option value="'Helvetica Neue'">Helvetica Neue</option>
              <option value="Georgia">Georgia</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export default OverlaySettings;
