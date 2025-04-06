document.addEventListener("DOMContentLoaded", () => {
  const chatBody = document.getElementById("chat-body");
  const inputBox = document.getElementById("input-box");
  const sidebar = document.getElementById("sidebar");
  const toggleSidebar = document.getElementById("toggle-sidebar");
  const hideSidebar = document.getElementById("hide-sidebar");
  const themeToggle = document.getElementById("theme-toggle");

  // Attach event listeners
  document.getElementById("send-btn").addEventListener("click", sendMessage);
  inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  hideSidebar.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    toggleSidebar.classList.remove("hidden");
  });

  toggleSidebar.addEventListener("click", () => {
    sidebar.classList.remove("-translate-x-full");
    toggleSidebar.classList.add("hidden");
  });

  themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });

  function sendMessage() {
    const msg = inputBox.value.trim();
    if (!msg) return;

    console.log("Sending message:", msg);
    addMessage("user", msg);
    inputBox.value = "";

    fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: msg,
        session_id: "user1"
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        addMessage("bot", data.reply);
      })
      .catch(error => {
        console.error("Error from fetch:", error);
        addMessage("bot", "Sorry, I ran into an issue. Please try again!");
      });
  }

  function addMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    bubble.className = `px-4 py-2 rounded-2xl shadow text-sm max-w-xs ${
      sender === "user"
        ? "bg-blue-500 text-white"
        : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
    }`;
    bubble.textContent = text;

    msgDiv.appendChild(bubble);
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      const voiceInput = event.results[0][0].transcript;
      inputBox.value = voiceInput;
      sendMessage();
    };

    recognition.onerror = function (event) {
      console.error("Speech error:", event.error);
    };

    recognition.start();
  }

  window.startVoice = startVoice; // Make it globally available if using onclick
});
