// server/index.js
const express = require("express");
const cors = require("cors");
const env = require("./config/env");

const leadsRoutes = require("./routes/leads.routes");
const webhookRoutes = require("./routes/webhook.routes");//added bot.service.js
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const requireAuth = require("./middleware/requireAuth");
//ADDED
const usersRoutes = require("./routes/users.routes");

const app = express();

app.use(cors({ origin: process.env.APP_URL || "http://localhost:3000" }));
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

app.get("/health", (req, res) => res.json({ ok: true }));

// app.use("/api/leads", leadsRoutes);
// app.use("/webhook", webhookRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/leads", requireAuth, leadsRoutes);  // <-- protected!
app.use("/webhook", webhookRoutes);                // <-- still public (Meta calls it)//AADDEDD BOT.SERVICE.JS

//ADDED
app.use("/api/users", requireAuth, usersRoutes);  // <-- protected!

//ussd added routes
app.use("/ussd", require("./routes/ussd.routes"));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`CRM server running on :${env.PORT}`);
});