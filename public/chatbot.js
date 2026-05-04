let stage = 0;
let userName = "";
let userEmail = "";

setTimeout(openBot, 1000);

function openBot() {
  const box = document.getElementById("chatbot");

  box.innerHTML = `
    <div class="box">
      <div class="header">ForestTwin Assistant 🌿</div>
      <div id="messages"></div>
      <div class="input-row">
        <input id="input" placeholder="Type here..." onkeydown="if(event.key==='Enter')send()">
        <button onclick="send()">Send</button>
      </div>
    </div>
  `;

  bot("Hi 👋 Welcome to ForestTwin.");
  bot("May I know your name?");
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
        body: JSON.stringify({ name: userName, email: userEmail })
      });
    } catch (err) {
      console.error(err);
    }

    bot("Perfect. Ask me anything about ForestTwin 🌱");
  }
  else {
    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      bot(data.answer);
    } catch (err) {
      bot("Sorry, something went wrong. Please try again.");
    }
  }
}
