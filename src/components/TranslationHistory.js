import React, { useState, useEffect } from "react";

function TranslationHistory() {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Listen for new translations
    window.electronAPI.onTranslationAdded((translation) => {
      setHistory((prev) =>
        [
          {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            japanese: translation.original,
            english: translation.translated,
          },
          ...prev,
        ].slice(0, 100)
      ); // Keep last 100
    });
  }, []);

  const filteredHistory = history.filter(
    (item) =>
      item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.japanese?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportHistory = () => {
    const content = history
      .map(
        (item) =>
          `[${item.timestamp}] ${item.japanese || "N/A"} → ${item.english}`
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation-history-${new Date().toISOString()}.txt`;
    a.click();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="translation-history card">
      <h2>Translation History</h2>

      <div className="history-controls">
        <input
          type="text"
          placeholder="Search translations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={exportHistory}>Export History</button>
        <button onClick={() => setHistory([])}>Clear</button>
      </div>

      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <p className="empty-state">No translations yet</p>
        ) : (
          filteredHistory.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-timestamp">{item.timestamp}</div>
              <div className="history-content">
                {item.japanese && (
                  <div className="original-text">{item.japanese}</div>
                )}
                <div className="translated-text">{item.english}</div>
              </div>
              <button
                className="copy-button"
                onClick={() => copyToClipboard(item.english)}
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TranslationHistory;
