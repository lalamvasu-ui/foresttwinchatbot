const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const knowledge = require("./knowledge");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Store sessions in memory (resets on server restart)
const sessions = {};

// Resend for emails
const resend = new Resend(process.env.RESEND_API_KEY);

// Google Gemini AI for chat
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// System prompt — tells Gemini how to behave
const systemPrompt = `
You are the official AI assistant for ForestTwin, a sustainability platform powered by FusionPact.

Your job is to answer visitor questions politely, professionally, and helpfully — using only the information provided below about ForestTwin's services. If a question is outside this knowledge, say you'll connect them with the marketing team at lalam.vasu@fusionpact.com.

Keep answers short and clear (2-4 sentences). Always be warm and professional.

If asked about pricing, say pricing depends on requirements and offer to connect them with the team.

KNOWLEDGE BASE:
${knowledge}
`;

// Save lead and start a session (NO email sent yet — we wait for the conversation to end)
app.post("/save-lead", async (req, res) => {
  const { name, email, sessionId } = req.body;

  sessions[sessionId] = {
    name,
    email,
    startTime: new Date(),
    conversation: []
  };

  console.log(`New session started: ${name} (${email}) — sessionId: ${sessionId}`);
  res.json({ success: true });
});

// Chat endpoint — uses Gemini AND logs the Q&A to the session
app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  try {
    const result = await model.generateContent(systemPrompt + "\n\nVisitor: " + message + "\n\nAssistant:");
    const answer = result.response.text();

    // Log this exchange to the session
    if (sessions[sessionId]) {
      sessions[sessionId].conversation.push({
        user: message,
        bot: answer,
        time: new Date()
      });
    }

    res.json({ answer });
  } catch (err) {
    console.error("AI error:", err);
    const fallback = "Sorry, I'm having trouble responding right now. Please contact lalam.vasu@fusionpact.com for assistance.";

    if (sessions[sessionId]) {
      sessions[sessionId].conversation.push({
        user: message,
        bot: fallback,
        time: new Date()
      });
    }

    res.json({ answer: fallback });
  }
});

// End session — sends the full conversation as a nicely formatted email
app.post("/end-session", async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions[sessionId];

  if (!session) {
    return res.json({ success: false, error: "Session not found" });
  }

  const startedTime = session.startTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const endedTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Build HTML conversation
  let conversationHtml = "";
  if (session.conversation.length === 0) {
    conversationHtml = `<p style="color:#666;font-style:italic;">Visitor did not ask any questions before leaving.</p>`;
  } else {
    session.conversation.forEach((entry, i) => {
      conversationHtml += `
        <div style="margin-bottom:18px;padding:12px;border-left:3px solid #2e7d32;background:#f9f9f9;border-radius:4px;">
          <p style="margin:0 0 8px 0;"><strong style="color:#1976d2;">Q${i + 1} — Visitor asked:</strong></p>
          <p style="margin:0 0 12px 16px;color:#333;">${entry.user}</p>
          <p style="margin:0 0 8px 0;"><strong style="color:#2e7d32;">Bot replied:</strong></p>
          <p style="margin:0 0 0 16px;color:#333;">${entry.bot}</p>
        </div>
      `;
    });
  }

  // Full HTML email
  const htmlEmail = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#333;">
      <h2 style="color:#2e7d32;border-bottom:2px solid #2e7d32;padding-bottom:8px;">
        🌿 New ForestTwin Lead
      </h2>
      <div style="background:#e8f5e9;padding:16px;border-radius:6px;margin:16px 0;">
        <h3 style="margin:0 0 10px 0;color:#1b5e20;">Lead Information</h3>
        <p style="margin:6px 0;"><strong>Name:</strong> ${session.name}</p>
        <p style="margin:6px 0;"><strong>Email:</strong> <a href="mailto:${session.email}">${session.email}</a></p>
        <p style="margin:6px 0;"><strong>Started:</strong> ${startedTime}</p>
        <p style="margin:6px 0;"><strong>Ended:</strong> ${endedTime}</p>
        <p style="margin:6px 0;"><strong>Total questions asked:</strong> ${session.conversation.length}</p>
      </div>
      <h3 style="color:#1b5e20;border-bottom:1px solid #ccc;padding-bottom:6px;">
        💬 Full Conversation
      </h3>
      ${conversationHtml}
      <hr style="margin-top:24px;border:none;border-top:1px solid #ddd;">
      <p style="color:#888;font-size:12px;text-align:center;">
        This lead was captured automatically by the ForestTwin AI Assistant.
      </p>
    </div>
  `;

  // Plain text fallback
  let plainText = `New ForestTwin Lead\n\n`;
  plainText += `Name: ${session.name}\n`;
  plainText += `Email: ${session.email}\n`;
  plainText += `Started: ${startedTime}\n`;
  plainText += `Ended: ${endedTime}\n`;
  plainText += `Total questions: ${session.conversation.length}\n\n`;
  plainText += `========== CONVERSATION ==========\n\n`;
  if (session.conversation.length === 0) {
    plainText += `(Visitor did not ask any questions before leaving)\n`;
  } else {
    session.conversation.forEach((entry, i) => {
      plainText += `Q${i + 1}. Visitor: ${entry.user}\n`;
      plainText += `     Bot: ${entry.bot}\n\n`;
    });
  }

  try {
    await resend.emails.send({
      from: "ForestTwin Bot <onboarding@resend.dev>",
      to: "lalam.vasu@fusionpact.com",
      subject: `New ForestTwin Lead: ${session.name}`,
      text: plainText,
      html: htmlEmail
    });

    console.log(`Conversation emailed for ${session.name}`);
    delete sessions[sessionId];

    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.json({ success: false, error: "Email could not be sent" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ForestTwin chatbot running on port ${PORT}`);
});
