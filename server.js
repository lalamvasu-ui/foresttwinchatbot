const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const knowledge = require("./knowledge");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let leads = [];

// Resend for emails
const resend = new Resend(process.env.RESEND_API_KEY);

// Google Gemini AI for chat
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// System prompt — tells Gemini how to behave
const systemPrompt = `
You are the official AI assistant for ForestTwin, a sustainability platform powered by FusionPact.

Your job is to answer visitor questions politely, professionally, and helpfully — using only the information provided below about ForestTwin's services. If a question is outside this knowledge, say you'll connect them with the marketing team at lalam.vasu@fusionpact.com.

Keep answers short and clear (2-4 sentences). Always be warm and professional.

If asked about pricing, say pricing depends on requirements and offer to connect them with the team.

KNOWLEDGE BASE:
${knowledge}
`;

app.post("/save-lead", async (req, res) => {
  const { name, email } = req.body;

  leads.push({
    name,
    email,
    time: new Date()
  });

  try {
    await resend.emails.send({
      from: "ForestTwin Bot <onboarding@resend.dev>",
      to: "lalam.vasu@fusionpact.com",
      subject: "New ForestTwin Lead",
      text: `
Name: ${name}
Email: ${email}
Time: ${new Date()}
      `
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.json({ success: false, error: "Email could not be sent" });
  }
});

app.post("/chat", async (req, res) => {
  const message = req.body.message;

  try {
    const result = await model.generateContent(systemPrompt + "\n\nVisitor: " + message + "\n\nAssistant:");
    const answer = result.response.text();
    res.json({ answer });
  } catch (err) {
    console.error("AI error:", err);
    res.json({ answer: "Sorry, I'm having trouble responding right now. Please contact lalam.vasu@fusionpact.com for assistance." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ForestTwin chatbot running on port ${PORT}`);
});
