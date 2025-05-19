document.addEventListener('DOMContentLoaded', () => {
  let recognition;

  const speakBtn = document.getElementById('speakBtn');
  const userInput = document.getElementById('userInput');
  const chatWindow = document.getElementById('chatWindow');
  const sendBtn = document.getElementById('sendBtn');

  speakBtn.onclick = () => {
    console.log("🎤 Speak button clicked");

    if (recognition && recognition.running) {
      console.log("Speech recognition already in progress.");
      return;
    }

    // Initialize speech recognition
    recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    // Provide visual feedback
    speakBtn.textContent = "🎙️";
    speakBtn.disabled = true;
    speakBtn.classList.add('active'); // Add a class for styling

    recognition.onresult = (e) => {
      const msg = e.results[0][0].transcript;
      console.log("🗣️ Recognized:", msg);
      userInput.value = msg;
      sendMessageToGemini(msg); // Use Gemini
      // addMessageToChat('user', msg); // Add user message to chat
      // addMessageToChat('system', "Waiting for response..."); // Add waiting message
      // disableInput(); // Disable input and send button
      // sendMessageToBackground(msg); // Send message to background
    };

    recognition.onerror = (e) => {
      console.error("❌ Speech recognition error:", e.error);
      alert("Speech error: " + e.error);
    };

    recognition.onend = () => {
      console.log("🛑 Speech recognition ended.");
      speakBtn.textContent = "🔊"; // Reset button text
      speakBtn.disabled = false;
      speakBtn.classList.remove('active'); // Remove active class
    };

    recognition.start();
  };

  // Add event listener for the input field
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const userInputValue = e.target.value.trim();
      console.log("💬 User input:", userInputValue);
      if (userInputValue) {
        sendMessageToGemini(userInputValue); // Use Gemini
        // sendMessageToLocalLLM(userInputValue); // Use local LLM
        e.target.value = ''; // Clear input field
      }
    }
  });

  sendBtn.onclick = () => {
    const userInputValue = userInput.value.trim();
    if (userInputValue) {
      sendMessageToGemini(userInputValue); // Use Gemini
      // sendMessageToLocalLLM(userInputValue); // Use local LLM
      userInput.value = '';
    }
  };

  // Function to send a message to the background script
  function sendMessageToBackground(msg) {
    console.log('Sending message to background:', msg);
    chrome.runtime.sendMessage({ action: 'queryAI', message: msg }, (response) => {
      console.log('Response from background:', response);
      if (response && response.reply) {
        // Remove emojis from the response
        const sanitizedReply = response.reply.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
        removeSystemMessage(); // Remove "Waiting for response..." message
        speakResponse(sanitizedReply); // Speak the sanitized AI response
        addMessageToChat('ai', sanitizedReply); // Add sanitized AI response to chat
      } else {
        removeSystemMessage(); // Remove "Waiting for response..." message
        addMessageToChat('ai', 'Error: No response from AI.');
      }
      enableInput(); // Re-enable input and send button
    });
  }

  // Function to add a message to the chat window
  function addMessageToChat(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.textContent = message;

    messageDiv.appendChild(bubbleDiv);
    chatWindow.appendChild(messageDiv);

    // Scroll to the bottom of the chat window
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // Function to remove the "Waiting for response..." system message
  function removeSystemMessage() {
    const systemMessages = chatWindow.querySelectorAll('.message.system');
    if (systemMessages.length > 0) {
      systemMessages[systemMessages.length - 1].remove();
    }
  }

  // Function to disable input and send button
  function disableInput() {
    userInput.disabled = true;
    speakBtn.disabled = true;
    sendBtn.disabled = true;
    userInput.placeholder = "Waiting for response...";
  }

  // Function to enable input and send button
  function enableInput() {
    userInput.disabled = false;
    speakBtn.disabled = false;
    sendBtn.disabled = false;
    userInput.placeholder = "Type your message...";
  }

  // Function to speak the AI response using TTS
  function speakResponse(response) {
    chrome.runtime.sendMessage(
      { action: "googleTTS", text: response },
      (res) => {
        if (res && res.audioContent) {
          try {
            // Decode base64 audio content to a Blob
            const binaryString = atob(res.audioContent);
            const binaryData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              binaryData[i] = binaryString.charCodeAt(i);
            }

            const audioBlob = new Blob([binaryData], { type: "audio/mp3" });

            // Create a URL for the Blob and play the audio
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
          } catch (error) {
            console.error("Error decoding audio content:", error);
            alert("Failed to play audio response.");
          }
        } else if (res && res.error) {
          console.error("Error with Google TTS:", res.error);
          alert("Failed to play audio response.");
        } else {
          console.error("No response from Google TTS.");
          alert("No response from Google TTS.");
        }
      }
    );
  }

  async function callGemini(prompt) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY;
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Gemini API error: " + res.status);
      const data = await res.json();
      // Extract the response text
      const geminiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "(No response)";
      return geminiReply;
    } catch (err) {
      console.error("Gemini API error:", err);
      return "Error: " + err.message;
    }
  }

  async function sendMessageToGemini(msg) {
    addMessageToChat('user', msg);
    addMessageToChat('system', "Waiting for Gemini response...");
    disableInput();

    const reply = await callGemini(msg);
    removeSystemMessage();
    const sanitizedReply = reply.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
    addMessageToChat('ai', sanitizedReply);
    speakResponse(sanitizedReply);
    enableInput();
  }

  async function sendMessageToLocalLLM(userInputValue) {
      addMessageToChat('user', userInputValue); // Add user message to chat
      addMessageToChat('system', "Waiting for response..."); // Add waiting message
      disableInput(); // Disable input and send button
      sendMessageToBackground(userInputValue); // Send message to background
  }
});
