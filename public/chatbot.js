let stage = 0;
let userName = "";
let userEmail = "";
const sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
let conversationStarted = false;
let isOpen = false;
let isInitialized = false;

// Initialize bubble, then auto-open after 4 seconds
function initBubble() {
  const container = document.getElementById("chatbot");
  if (!container) return;

  container.innerHTML = `
    <div id="chat-bubble" class="bubble" onclick="toggleChat()">
      💬
    </div>
    <div id="chat-window" class="box" style="display: none;">
      <div class="header">
        <span>ForestTwin Assistant 🌿</span>
        <span class="close-btn" onclick="closeChat()">×</span>
      </div>
      <div id="messages"></div>
      <div class="input-row">
        <input id="input" placeholder="Type here..." onkeydown="if(event.key==='Enter')send()">
        <button onclick="send()">Send</button>
      </div>
    </div>
  `;

  // Auto-open chat after 4 seconds
  setTimeout(toggleChat, 4000);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initBubble);
} else {
  initBubble();
}

function toggleChat() {
  const chatWindow = document.getElementById("chat-window");
  const bubble = document.getElementById("chat-bubble");

  if (isOpen) {
    chatWindow.style.display = "none";
    bubble.style.display = "flex";
    isOpen = false;
  } else {
    chatWindow.style.display = "flex";
    bubble.style.display = "none";
    isOpen = true;

    if (!isInitialized) {
      bot("Hi 👋 Welcome to ForestTwin.");
      bot("May I know your name?");
      isInitialized = true;
    }
  }
}

// X button: close chat AND send conversation email if there was a real conversation
function closeChat() {
  if (conversationStarted) {
    fetch("/end-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    conversationStarted = false;
  }

  const chatWindow = document.getElementById("chat-window");
  const bubble = document.getElementById("chat-bubble");
  chatWindow.style.display = "none";
  bubble.style.display = "flex";
  isOpen = false;
}

function bot(msg) {
  document.getElementById("messages").innerHTML +=
    `<p class="bot-msg"><b>Bot:</b> ${msg}</p>`;
  scrollDown();
}

function user(msg) {
  document.getElementById("messages").innerHTML +=
    `<p class="user-msg"><b>You:</b> ${msg}</p>`;
  scrollDown();
}

function scrollDown() {
  const m = document.getElementById("messages");
  m.scrollTop = m.scrollHeight;
}

async function send() {
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  user(text);
  input.value = "";

  if (stage === 0) {
    userName = text;
    stage++;
    bot("Great. Please enter your email.");
  }
  else if (stage === 1) {
    userEmail = text;
    stage++;

    try {
      await fetch("/save-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, email: userEmail, sessionId })
      });
      conversationStarted = true;
      resetInactivityTimer();
    } catch (err) {
      console.error(err);
    }

    bot("Perfect. Ask me anything about ForestTwin 🌱");
  }
  else {
    resetInactivityTimer();
    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId })
      });
      const data = await res.json();
      bot(data.answer);
    } catch (err) {
      bot("Sorry, something went wrong. Please try again.");
    }
  }
}

// When visitor closes the tab/browser, send conversation email
window.addEventListener("beforeunload", () => {
  if (conversationStarted) {
    navigator.sendBeacon(
      "/end-session",
      new Blob([JSON.stringify({ sessionId })], { type: "application/json" })
    );
    conversationStarted = false;
  }
});

// Backup: send email after 2 minutes of inactivity
let inactivityTimer;
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (conversationStarted) {
      fetch("/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      conversationStarted = false;
    }
  }, 120000);
}
