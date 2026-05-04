const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const knowledge = require("./knowledge");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let leads = [];

// Resend API for sending emails (works on Render free tier)
const resend = new Resend(process.env.RESEND_API_KEY);

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

app.post("/chat", (req, res) => {
  const message = req.body.message.toLowerCase();

  let answer = "Could you tell me which ForestTwin service you're looking for?";

  if (message.includes("biochar")) {
    answer = "ForestTwin supplies standardized industrial-grade biochar with COA and scalable supply.";
  }

  if (message.includes("carbon")) {
    answer = "ForestTwin provides verified carbon credits with due-diligence support.";
  }

  if (message.includes("dmrv") || message.includes("mrv")) {
    answer = "ForestTwin DMRV automates measurement, reporting and verification with IoT, OCR and registry integrations.";
  }

  if (message.includes("machinery") || message.includes("machine")) {
    answer = "ForestTwin offers pellet machines, shredders, grinders and post-harvest solutions.";
  }

  if (message.includes("pellet")) {
    answer = "ForestTwin supplies high-quality biomass pellets for industrial and commercial use.";
  }

  if (message.includes("esg") || message.includes("brsr")) {
    answer = "ForestTwin provides ESG advisory and BRSR reporting services for enterprises.";
  }

  if (message.includes("about") || message.includes("who")) {
    answer = "ForestTwin is a sustainability platform powered by FusionPact, offering biochar, carbon credits, DMRV, and more.";
  }

  if (message.includes("contact") || message.includes("email")) {
    answer = "You can reach our marketing team at lalam.vasu@fusionpact.com.";
  }

  res.json({ answer });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ForestTwin chatbot running on port ${PORT}`);
});
