document.addEventListener("DOMContentLoaded", () => {
  const chatBody = document.getElementById("chat-body");
  const inputBox = document.getElementById("input-box");
  const sendBtn = document.getElementById("send-btn");
  const voiceBtn = document.getElementById("voice-btn");

  // Check authentication
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  // Format bot responses with markdown support
  function formatBotResponse(text) {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert lists
    text = text.replace(/^\s*-\s(.*$)/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/g, '<ul class="list-disc pl-5 space-y-1 my-2">$1</ul>');
    // Convert line breaks to <br>
    text = text.replace(/\n/g, '<br>');
    // Convert URLs to links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary-600 hover:underline">$1</a>');
    return text;
  }

  // Add message to chat
  function addMessage(sender, text, isThinking = false) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;

    const container = document.createElement("div");
    container.className = `max-w-[80%] md:max-w-[70%]`;
    
    const bubble = document.createElement("div");
    bubble.className = `px-5 py-3 rounded-2xl shadow-sm ${
      sender === "user" 
        ? "bg-primary-600 text-white" 
        : "bg-primary-100 text-gray-800"
    }`;
    
    if (isThinking) {
      bubble.innerHTML = `
        <div class="font-bold ${sender === "user" ? 'text-primary-100' : 'text-primary-700'} mb-1 flex items-center gap-2">
          <i class="fas ${sender === "user" ? 'fa-user' : 'fa-robot'}"></i>
          <span>${sender === "user" ? 'You' : 'FitGPT'}</span>
        </div>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
    } else {
      bubble.innerHTML = `
        <div class="font-bold ${sender === "user" ? 'text-primary-100' : 'text-primary-700'} mb-1 flex items-center gap-2">
          <i class="fas ${sender === "user" ? 'fa-user' : 'fa-robot'}"></i>
          <span>${sender === "user" ? 'You' : 'FitGPT'}</span>
        </div>
        <div>${sender === "bot" ? formatBotResponse(text) : text}</div>
      `;
    }
    
    // Add timestamp
    const timeDiv = document.createElement("div");
    timeDiv.className = `text-xs ${sender === "user" ? 'text-primary-100' : 'text-gray-500'} mt-1 ${
      sender === "user" ? 'mr-1 text-right' : 'ml-1'
    }`;
    
    const now = new Date();
    timeDiv.textContent = `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    container.appendChild(bubble);
    container.appendChild(timeDiv);
    msgDiv.appendChild(container);
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    return bubble;
  }

  // Send message function
  function sendMessage() {
    const msg = inputBox.value.trim();
    if (!msg) return;

    addMessage("user", msg);
    inputBox.value = "";
    
    // Show thinking indicator
    const botBubble = addMessage("bot", "", true);
    
    fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, user_id: userId })
    })
      .then(res => res.json())
      .then(data => {
        // Remove thinking indicator
        botBubble.remove();
        
        const reply = data.reply || "I couldn't process that request. Please try again.";
        addMessage("bot", reply);
      })
      .catch(err => {
        console.error("Chat fetch error:", err);
        botBubble.remove();
        addMessage("bot", "⚠️ Sorry, I encountered an error. Please try again later.");
      });
  }

  // Event listeners
  sendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendMessage();
  });

  inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // Voice input
  voiceBtn.addEventListener("click", () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition is not supported in your browser");
      return;
    }

    voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    voiceBtn.classList.remove('bg-primary-100', 'text-primary-700');
    voiceBtn.classList.add('bg-red-100', 'text-red-600');
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = function(event) {
      const voiceInput = event.results[0][0].transcript;
      inputBox.value = voiceInput;
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      voiceBtn.classList.remove('bg-red-100', 'text-red-600');
      voiceBtn.classList.add('bg-primary-100', 'text-primary-700');
      sendMessage();
    };

    recognition.onerror = function(event) {
      console.error("Speech error:", event.error);
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      voiceBtn.classList.remove('bg-red-100', 'text-red-600');
      voiceBtn.classList.add('bg-primary-100', 'text-primary-700');
    };

    recognition.onend = function() {
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      voiceBtn.classList.remove('bg-red-100', 'text-red-600');
      voiceBtn.classList.add('bg-primary-100', 'text-primary-700');
    };

    recognition.start();
  });
});