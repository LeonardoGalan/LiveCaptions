import React, { useState, useEffect } from "react";
import AudioCapture from "./components/AudioCapture";
import TranslationEngine from "./components/TranslationEngine";
import OverlaySettings from "./components/OverlaySettings";
import TranslationHistory from "./components/TranslationHistory";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import "./App.css";

function App() {
  const isOverlay = window.location.hash === "#overlay";

  if (isOverlay) {
    return <OverlayWindow />;
  }

  return <MainWindow />;
}

function MainWindow() {
  // Load saved settings or use defaults
  const loadInitialSettings = () => {
    const saved = localStorage.getItem("translatorSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      return {
        whisperModel: settings.whisperModel || "base",
        showOverlay:
          settings.showOverlay !== undefined ? settings.showOverlay : true,
      };
    }
    return {
      whisperModel: "base",
      showOverlay: true,
    };
  };

  const initialSettings = loadInitialSettings();

  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [whisperModel, setWhisperModel] = useState(
    initialSettings.whisperModel
  );
  const [showOverlay, setShowOverlay] = useState(initialSettings.showOverlay);
  const [activeTab, setActiveTab] = useState("capture"); // For tab navigation

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleTranslation: () => {
      if (selectedSource) {
        setIsTranslating(!isTranslating);
      }
    },
    onToggleOverlay: () => {
      setShowOverlay(!showOverlay);
      window.electronAPI.toggleOverlay(!showOverlay);
    },
    onExport: () => {
      // Trigger export in history component
      document.querySelector(".export-trigger")?.click();
    },
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Japanese Stream Translator</h1>
        <p>Real-time Japanese to English translation</p>
        <div className="shortcuts-hint">
          Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> for shortcuts
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === "capture" ? "active" : ""}`}
          onClick={() => setActiveTab("capture")}
        >
          Audio Setup
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        <button
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      <main className="app-main">
        {activeTab === "capture" && (
          <>
            <AudioCapture
              onSourceSelected={setSelectedSource}
              selectedSource={selectedSource}
            />
            <TranslationEngine
              isTranslating={isTranslating}
              selectedSource={selectedSource}
              whisperModel={whisperModel}
              onTranslationStateChange={setIsTranslating}
            />
          </>
        )}

        {activeTab === "history" && <TranslationHistory />}

        {activeTab === "settings" && (
          <OverlaySettings
            showOverlay={showOverlay}
            onOverlayToggle={setShowOverlay}
            whisperModel={whisperModel}
            onModelChange={setWhisperModel}
          />
        )}
      </main>
    </div>
  );
}

function OverlayWindow() {
  const [subtitle, setSubtitle] = useState("");
  const [style, setStyle] = useState({
    fontSize: 24,
    color: "#ffffff",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    fontFamily: "Arial",
  });

  useEffect(() => {
    window.electronAPI.onNewSubtitle((text) => {
      setSubtitle(text);
    });

    window.electronAPI.onStyleUpdate((newStyle) => {
      setStyle(newStyle);
    });
  }, []);

  return (
    <div
      className="overlay"
      style={{
        width: "100%",
        height: "100%",
        WebkitAppRegion: "drag", // Make entire window draggable
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="subtitle-container"
        style={{
          backgroundColor: style.backgroundColor,
          padding: "16px 32px",
          borderRadius: "8px",
          cursor: "move",
          userSelect: "none",
          // Remove individual drag region - parent handles it
        }}
      >
        <p
          className="subtitle-text"
          style={{
            fontSize: `${style.fontSize}px`,
            color: style.color,
            fontFamily: style.fontFamily,
            margin: 0,
            pointerEvents: "none", // This ensures text doesn't block dragging
            userSelect: "none",
            // Remove the no-drag region so text is draggable too
          }}
        >
          {subtitle || "Drag me from anywhere! 🎌"}
        </p>
      </div>
    </div>
  );
}

export default App;
