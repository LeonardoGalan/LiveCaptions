import React, { useState, useRef, useEffect } from "react";

function TranslationEngine({
  isTranslating,
  selectedSource,
  whisperModel,
  onTranslationStateChange,
}) {
  const [status, setStatus] = useState("idle");
  const [processedChunks, setProcessedChunks] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [useMicrophone, setUseMicrophone] = useState(true);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fakeIntervalRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up when component unmounts or isTranslating becomes false
  useEffect(() => {
    if (!isTranslating && status === "translating") {
      console.log("isTranslating became false, stopping...");
      stopTranslation();
    }
  }, [isTranslating, status]);

  // Effect to handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (fakeIntervalRef.current) {
        clearInterval(fakeIntervalRef.current);
      }
      if (mediaRecorderRef.current) {
        try {
          const stream = mediaRecorderRef.current.stream;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
    };
  }, []);

  const stopTranslation = () => {
    console.log("stopTranslation called");

    if (fakeIntervalRef.current) {
      clearInterval(fakeIntervalRef.current);
      fakeIntervalRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          console.log("Stopping active recording");
          mediaRecorderRef.current.stop();
        }
        // Clear the ref so recording loop knows to stop
        mediaRecorderRef.current = null;
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.label);
      });
      streamRef.current = null;
    }

    setStatus("idle");
    setProcessedChunks(0);
    onTranslationStateChange(false);
  };

  const startTranslation = async () => {
    console.log("Starting translation...");

    if (!useMicrophone && !selectedSource) {
      alert("Please select an audio source first");
      return;
    }

    setStatus("starting");
    onTranslationStateChange(true);

    // Handle debug mode
    if (debugMode) {
      console.log("Debug mode: Starting fake translations");
      setStatus("translating");

      // Process first chunk immediately
      processAudioChunk(new Blob(["fake audio data"]));

      // Then every 5 seconds
      const intervalId = setInterval(() => {
        // Check if we should continue by looking at the current refs
        if (fakeIntervalRef.current) {
          processAudioChunk(new Blob(["fake audio data"]));
        } else {
          clearInterval(intervalId);
        }
      }, 5000);

      fakeIntervalRef.current = intervalId;
      return;
    }

    // Real audio capture
    try {
      let stream;

      if (useMicrophone) {
        console.log("Requesting microphone access...");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
        console.log("Microphone access granted");
        // In your startTranslation function, modify the desktop audio section:
      } else {
        console.log("Attempting desktop audio capture");

        // For macOS with BlackHole, we need to capture it as an audio INPUT device
        // not through screen/window capture
        try {
          // This captures from BlackHole as if it were a microphone
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              // Request specific audio input (BlackHole)
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 48000,
              // This will use the default audio input device
              // which should be BlackHole if set up correctly
            },
          });

          console.log("Got audio stream from BlackHole");
        } catch (error) {
          console.error("Failed to capture audio:", error);
          throw error;
        }
      }

      streamRef.current = stream;
      console.log("Stream obtained:", stream);
      console.log("Audio tracks:", stream.getAudioTracks());

      setStatus("translating");

      // Start the recording loop
      startRecordingCycle();
    } catch (error) {
      console.error("Failed to start translation:", error);
      setStatus("error");
      onTranslationStateChange(false);

      if (error.name === "NotAllowedError") {
        alert(
          "Microphone permission denied. Please allow microphone access and try again."
        );
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  };
  const startRecordingCycle = () => {
    console.log("Starting recording cycle...");

    if (!streamRef.current || !streamRef.current.active) {
      console.error("No active stream");
      return;
    }

    const options = {
      audioBitsPerSecond: 128000,
    };

    // Try different mime types
    const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType;
        console.log("Using mime type:", mimeType);
        break;
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          chunks.push(event.data);
          event.data.arrayBuffer().then((buffer) => {
            const audioData = new Float32Array(buffer);
            const volume = Math.max(...audioData.map(Math.abs));
            console.log("Audio volume level:", volume);
          });
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped, chunks collected:", chunks.length);

        if (chunks.length === 0) {
          console.error("No chunks collected");
          // Check the current component state, not the closure value
          if (mediaRecorderRef.current) {
            setTimeout(() => startRecordingCycle(), 1000);
          }
          return;
        }

        const audioBlob = new Blob(chunks, {
          type: options.mimeType || "audio/webm",
        });
        console.log("Created blob:", audioBlob.size, "bytes");

        if (audioBlob.size > 100) {
          await processAudioChunk(audioBlob);
        } else {
          console.warn("Audio blob too small:", audioBlob.size);
        }

        // Continue recording if we still have an active recorder
        // This checks the current state, not stale closure values
        if (
          mediaRecorderRef.current &&
          streamRef.current &&
          streamRef.current.active
        ) {
          console.log("Starting next recording cycle...");
          setTimeout(() => startRecordingCycle(), 500);
        } else {
          console.log("Not continuing recording");
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started");
      };

      // Start recording
      mediaRecorder.start();
      console.log("MediaRecorder.start() called");

      // Stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          console.log("Stopping recording after 10 seconds");
          mediaRecorder.stop();
        } else {
          console.log(
            "MediaRecorder not recording, state:",
            mediaRecorder.state
          );
        }
      }, 5000);
    } catch (error) {
      console.error("Error creating MediaRecorder:", error);
    }
  };

  const processAudioChunk = async (audioBlob) => {
    console.log("Processing audio chunk:", audioBlob.size, "bytes");
    setProcessedChunks((prev) => prev + 1);

    if (debugMode) {
      const fakeTranslations = [
        "Hello, welcome to the stream!",
        "Today we're going to play some games",
        "Thank you for watching!",
        "Please like and subscribe",
        "Let's get started!",
      ];
      const translation =
        fakeTranslations[Math.floor(Math.random() * fakeTranslations.length)];
      console.log("Fake translation:", translation);
      window.electronAPI.updateSubtitle(translation);
      return;
    }

    try {
      console.log("Checking Whisper server health...");
      const healthCheck = await fetch("http://localhost:5001/health");
      if (!healthCheck.ok) {
        throw new Error("Whisper server not running");
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      console.log("Sending audio to Whisper server...");
      const response = await fetch("http://localhost:5001/translate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Server error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log("Translation result:", result);

      if (result.text && result.text.trim()) {
        window.electronAPI.updateSubtitle(result.text);

        if (window.electronAPI.addToHistory) {
          window.electronAPI.addToHistory({
            original: useMicrophone ? "Microphone audio" : "Desktop audio",
            translated: result.text,
          });
        }
      } else {
        console.log("Empty translation received");
      }
    } catch (error) {
      console.error("Translation error:", error);
      window.electronAPI.updateSubtitle(`[Error: ${error.message}]`);
    }

    // Debug logging
    console.log("Current refs:", {
      mediaRecorder: !!mediaRecorderRef.current,
      stream: !!streamRef.current,
      streamActive: streamRef.current?.active,
      fakeInterval: !!fakeIntervalRef.current,
    });
  };

  return (
    <div className="translation-engine card">
      <h2>Translation Control</h2>

      {/* Audio Source Toggle */}
      <div
        className="audio-source-toggle"
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#3a3a3a",
          borderRadius: "8px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={useMicrophone}
            onChange={(e) => setUseMicrophone(e.target.checked)}
            style={{ width: "20px", height: "20px", cursor: "pointer" }}
          />
          <div>
            <span style={{ fontWeight: "600" }}>Use Microphone</span>
            <small
              style={{ color: "#999", display: "block", marginTop: "4px" }}
            >
              Test with microphone input (more reliable)
            </small>
          </div>
        </label>
      </div>

      {/* Debug Mode Toggle */}
      <div
        className="debug-mode"
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#3a3a3a",
          borderRadius: "8px",
          border: debugMode ? "2px solid #667eea" : "2px solid transparent",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            style={{ width: "20px", height: "20px", cursor: "pointer" }}
          />
          <div>
            <span style={{ fontWeight: "600" }}>Debug Mode</span>
            <small
              style={{ color: "#999", display: "block", marginTop: "4px" }}
            >
              Skip audio capture and use simulated translations
            </small>
          </div>
        </label>
      </div>

      <div className="status-display" style={{ marginBottom: "20px" }}>
        <span>Status: </span>
        <span
          className={`status ${status}`}
          style={{
            fontWeight: "bold",
            textTransform: "uppercase",
            color:
              status === "idle"
                ? "#666"
                : status === "starting"
                ? "#f59e0b"
                : status === "translating"
                ? "#10b981"
                : "#ef4444",
          }}
        >
          {status}
        </span>
      </div>

      <div className="controls">
        {!isTranslating ? (
          <button
            className="start-button"
            onClick={startTranslation}
            disabled={!useMicrophone && !selectedSource}
            style={{
              opacity: !useMicrophone && !selectedSource ? 0.5 : 1,
              cursor:
                !useMicrophone && !selectedSource ? "not-allowed" : "pointer",
            }}
          >
            Start Translation
          </button>
        ) : (
          <button className="stop-button" onClick={stopTranslation}>
            Stop Translation
          </button>
        )}
      </div>

      {isTranslating && (
        <div
          className="stats"
          style={{
            marginTop: "20px",
            padding: "16px",
            backgroundColor: "#3a3a3a",
            borderRadius: "8px",
          }}
        >
          <p style={{ margin: "4px 0" }}>Chunks processed: {processedChunks}</p>
          <p style={{ margin: "4px 0" }}>Model: {whisperModel}</p>
          <p style={{ margin: "4px 0" }}>
            Mode:{" "}
            {debugMode
              ? "Debug (simulated)"
              : useMicrophone
              ? "Microphone"
              : "Desktop Audio"}
          </p>
          <p style={{ margin: "4px 0" }}>
            Recording: {status === "translating" ? "🔴 Active" : "⭕ Stopped"}
          </p>
        </div>
      )}
    </div>
  );
}

export default TranslationEngine;
