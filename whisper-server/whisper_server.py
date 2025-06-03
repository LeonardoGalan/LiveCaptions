from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import subprocess
import numpy as np
import io
from pydub import AudioSegment
import traceback

app = Flask(__name__)
CORS(app)

# Load model once when server starts
print("Loading Whisper model...")
model = whisper.load_model("small")   # Best quality, ~3GB
print("Model loaded!")

def convert_audio_to_wav(audio_data, input_format=None):
    """Convert any audio format to WAV using pydub"""
    try:
        # Try to load the audio
        if input_format:
            audio = AudioSegment.from_file(io.BytesIO(audio_data), format=input_format)
        else:
            # Let pydub detect the format
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
        
        # Convert to WAV
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav", parameters=["-ac", "1", "-ar", "16000"])
        wav_io.seek(0)
        
        return wav_io.read()
    except Exception as e:
        print(f"Pydub conversion failed: {e}")
        return None

def convert_with_ffmpeg(input_path, output_path):
    """Fallback: Convert using ffmpeg directly"""
    try:
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ac', '1',  # mono
            '-ar', '16000',  # 16kHz sample rate
            '-f', 'wav',
            '-y',  # overwrite output
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"FFmpeg conversion error: {e}")
        return False

@app.route('/translate', methods=['POST'])
def translate():
    temp_files = []
    try:
        # Get the audio file from request
        audio_file = request.files['audio']
        audio_data = audio_file.read()
        
        print(f"Received audio: {len(audio_data)} bytes, filename: {audio_file.filename}")
        
        # Try to convert to WAV first
        wav_data = convert_audio_to_wav(audio_data)
        
        if wav_data:
            # Save converted WAV
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                tmp_file.write(wav_data)
                tmp_filename = tmp_file.name
                temp_files.append(tmp_filename)
        else:
            # Fallback: Save original and convert with ffmpeg
            with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_input:
                tmp_input.write(audio_data)
                input_path = tmp_input.name
                temp_files.append(input_path)
            
            # Convert to WAV
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_output:
                output_path = tmp_output.name
                temp_files.append(output_path)
            
            if convert_with_ffmpeg(input_path, output_path):
                tmp_filename = output_path
            else:
                raise Exception("Failed to convert audio to WAV format")
        
        # Translate with Whisper
        print(f"Translating audio file: {tmp_filename}")
        result = model.transcribe(
    tmp_filename,
    task="translate",
    language="ja",
        initial_prompt="これは日本語の音声です。",
    fp16=False,
    beam_size=5,  # Increase for better accuracy (default is 1)
    best_of=5,    # Sample multiple times and pick best
    temperature=0.2,
    condition_on_previous_text=True,  # Use context from previous chunks
)
        
        print(f"Translation successful: {result['text'][:100]}...")
        
        return jsonify({
            'text': result['text'],
            'segments': result.get('segments', [])
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except:
                pass

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'base'})

if __name__ == '__main__':
    print("Starting Whisper server on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)