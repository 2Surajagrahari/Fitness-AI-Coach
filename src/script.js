document.addEventListener("DOMContentLoaded", () => {
  const chatBody = document.getElementById("chat-body");
  const inputBox = document.getElementById("input-box");
  const sidebar = document.getElementById("sidebar");
  const toggleSidebar = document.getElementById("toggle-sidebar");
  const hideSidebar = document.getElementById("hide-sidebar");
  const themeToggle = document.getElementById("theme-toggle");
  const userIcon = document.getElementById("user-icon");
  const userDropdown = document.getElementById("user-dropdown");
  const viewProfile = document.getElementById("view-profile");
  const logoutBtn = document.getElementById("logout");

  // ✅ Persistent user ID using localStorage
  let userId = localStorage.getItem("chat_user_id");

  if (!userId) {
    userId = `user_${Date.now()}`;
    localStorage.setItem("chat_user_id", userId);
  }

  // ✉️ Send message
  document.getElementById("send-btn").addEventListener("click", (e) => {
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
      sender === "user"
        ? "bg-blue-500 text-white"
        : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
    }`;
    bubble.textContent = text;

    msgDiv.appendChild(bubble);
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // 🎤 Voice input
  function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

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

  window.startVoice = startVoice;

  // 🌙 Theme toggle
  themeToggle?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });

  // 📁 Sidebar toggle
  hideSidebar?.addEventListener("click", () => {
    sidebar.classList.add("-translate-x-full");
    toggleSidebar.classList.remove("hidden");
  });

  toggleSidebar?.addEventListener("click", () => {
    sidebar.classList.remove("-translate-x-full");
    toggleSidebar.classList.add("hidden");
  });

  // 👤 User dropdown
  userIcon.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  // 👁️ View Profile
  viewProfile.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`http://localhost:5000/profile/${userId}`);
      const data = await res.json();

      if (data.error) {
        alert("❌ User not found");
      } else {
        alert(`👤 Profile Info:\nName: ${data.name}\nEmail: ${data.email}`);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      alert("⚠️ Could not load profile.");
    }
  });

  // 🚪 Logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("chat_user_id");
    location.reload();
  });

  // 🔐 Auth logic
  window.signup = async function () {
    const username = document.getElementById("auth-username").value;
    const password = document.getElementById("auth-password").value;

    const res = await fetch("http://localhost:5000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    document.getElementById("auth-status").innerText = data.message || data.error;

    if (res.ok) {
      userId = data.user_id;
      localStorage.setItem("chat_user_id", userId);
      document.getElementById("auth-section").classList.add("hidden");
      loadProfile();
    }
  };

  window.login = async function () {
    const username = document.getElementById("auth-username").value;
    const password = document.getElementById("auth-password").value;

    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    document.getElementById("auth-status").innerText = data.message || data.error;

    if (res.ok) {
      userId = data.user_id;
      localStorage.setItem("chat_user_id", userId);
      document.getElementById("auth-section").classList.add("hidden");
      loadProfile();
    }
  };

  async function loadProfile() {
    try {
      const res = await fetch(`http://localhost:5000/profile/${userId}`);
      const user = await res.json();
      alert(`Welcome, ${user.username}!`);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }
});
