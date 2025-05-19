chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("🔄 Background script received message:", sender, req);
  if (req.action === "queryAI") {
    try {
      fetch("http://localhost:5150/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // If needed:
          // "Authorization": "Bearer YOUR_API_KEY"
        },
        body: JSON.stringify({
          model: "qwen3:14b-q4_K_M",
          prompt: req.message,
          stream: false
        })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();  // Read body even if error
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then((data) => {
        let cleanedResponse = data.response.replace(/<think>.*?<\/think>/gs, "");
        cleanedResponse = cleanedResponse.replace(/^\n+/, ""); // Remove leading newlines
        console.log("✅ AI response:", cleanedResponse);
        sendResponse({ reply: cleanedResponse || "(No response)" });
      })
      .catch((err) => {
        console.error("❌ Fetch error:", err);
        sendResponse({ reply: "Error: " + err.message });
      });
    } catch (syncError) {
      console.error("❌ Sync error:", syncError);
      sendResponse({ reply: "Unexpected error: " + syncError.message });
    }

    return true; // ⚠️ Required to keep the sendResponse callback open
  }

  if (req.action === "googleTTS") {
    fetch("http://localhost:5150/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: req.text }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        sendResponse({ audioContent: data.audioContent });
      })
      .catch((error) => {
        console.error("Error with Google TTS:", error);
        sendResponse({ error: error.message });
      });

    return true; // Keep the message channel open for async response
  }
});