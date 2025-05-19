from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from google.cloud import texttospeech
from google.oauth2 import service_account
import base64

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

OLLAMA_BASE = "http://localhost:11434"

@app.route("/api/generate", methods=["POST"])
def proxy_generate():
    try:
        response = requests.post(f"{OLLAMA_BASE}/api/generate", json=request.json)
        return jsonify(response.json())
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/api/tts", methods=["POST"])
def google_tts():
    try:
        # Extract the text from the request
        text = request.json.get("text", "")
        if not text:
            return {"error": "No text provided"}, 400

        # Initialize the Google Cloud Text-to-Speech client
        client = texttospeech.TextToSpeechClient(
            credentials=service_account.Credentials.from_service_account_file("/Users/allan/Documents/projects/realtime-dialog-extension/fulcrum-101-613b53a51a02.json")
        )

        # Construct the TTS request
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Studio-O",
            # name="en-US-Chirp3-HD-Aoede",
            # ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

        # Perform the TTS request
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        # Encode the audio content as base64
        audio_base64 = base64.b64encode(response.audio_content).decode("utf-8")

        # Return the base64-encoded audio content
        return jsonify({"audioContent": audio_base64})

    except Exception as e:
        return {"error": str(e)}, 500

# Optional: health check
@app.route("/")
def health():
    return "Ollama and Google TTS Proxy is running."

if __name__ == "__main__":
    app.run(port=5150)
