# Realtime AI Assistant (Chrome Extension)

This Chrome extension enables real-time AI-powered dialog using local ollama LLMs.

## 🛠 Features
- Text and voice input
- LLM response (Ollama by default)
- Voice playback using TTS
- Multi-turn dialog support (optional with memory logic)

## 🧰 Requirements
- Chrome 109+
- Local model serving via Gemini, Ollama or OpenAI API

## 🚀 How to Use
1. Clone or download this repo
2. Go to `chrome://extensions` → Enable Developer Mode
3. Click "Load unpacked" → Select the extension folder
4. Click the extension icon to start chatting

## 🔄 Switching to OpenAI
Edit `background.js`:
```js
fetch("https://api.openai.com/v1/chat/completions", {
  headers: { "Authorization": "Bearer YOUR_KEY" },
  ...
})
```
