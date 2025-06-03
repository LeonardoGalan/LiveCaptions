import { useEffect } from "react";

function useKeyboardShortcuts({
  onToggleTranslation,
  onToggleOverlay,
  onExport,
}) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + Shift + Key combinations
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault();
            onToggleTranslation();
            break;
          case "o":
            e.preventDefault();
            onToggleOverlay();
            break;
          case "e":
            e.preventDefault();
            onExport();
            break;
          case "h":
            e.preventDefault();
            // Show help modal
            window.electronAPI.showShortcutsHelp();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onToggleTranslation, onToggleOverlay, onExport]);
}

export default useKeyboardShortcuts;
