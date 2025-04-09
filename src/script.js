document.addEventListener("DOMContentLoaded", () => {
  const chatBody = document.getElementById("chat-body");
  const inputBox = document.getElementById("input-box");
  const sendBtn = document.getElementById("send-btn");
  const voiceBtn = document.getElementById("voice-btn");
  const logoutBtn = document.getElementById("logout");

  // Check authentication
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
    return;
  }

  // ✉️ Send message
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

  function sendMessage() {
    const msg = inputBox.value.trim();
    if (!msg) return;

    addMessage("user", msg);
    inputBox.value = "";

    fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, user_id: userId })
    })
      .then(res => res.json())
      .then(data => {
        const reply = data.reply || "No reply received.";
        addMessage("bot", reply);
      })
      .catch(err => {
        console.error("Chat fetch error:", err);
        addMessage("bot", "⚠️ Error sending message.");
      });
  }

  function addMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    bubble.className = `px-4 py-2 rounded-2xl shadow text-sm max-w-xs ${
      sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
    }`;
    bubble.textContent = text;

    msgDiv.appendChild(bubble);
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // 🎤 Voice input
  voiceBtn.addEventListener("click", () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported in your browser");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = function(event) {
      const voiceInput = event.results[0][0].transcript;
      inputBox.value = voiceInput;
      sendMessage();
    };

    recognition.onerror = function(event) {
      console.error("Speech error:", event.error);
    };

    recognition.start();
  });

  // 🚪 Logout
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("user_id");
    window.location.href = "login.html";
  });
});