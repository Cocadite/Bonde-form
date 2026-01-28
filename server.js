require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
require("./sqlite");
const { sanitizeText, toInt, isValidUrl } = require("./validate");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// rota teste (Render usa isso)
app.get("/", (_req, res) => {
  res.status(200).send("OK — Bonde Form Bot rodando");
});

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

function renderTemplate(raw, vars) {
  let out = raw;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

app.get("/form", (req, res) => {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).send("Token ausente.");

  db.get(`SELECT token, userId, used FROM form_tokens WHERE token = ?`, [token], (err, row) => {
    if (err) return res.status(500).send("Erro interno.");
    if (!row) return res.status(404).send("Token inválido.");
    if (row.used) return res.status(410).send("Link já usado.");

    const htmlPath = path.resolve(process.cwd(), "form.html");
    const raw = fs.readFileSync(htmlPath, "utf-8");

    res.send(renderTemplate(raw, {
      TOKEN: token,
      DISCORD_TAG: "SeuDiscord#0000"
    }));
  });
});

app.post("/submit", (req, res) => {
  const token = sanitizeText(req.body.token, 120);
  const nick = sanitizeText(req.body.nick, 64);
  const motivo = sanitizeText(req.body.motivo, 700);
  const idade = toInt(req.body.idade, 5, 120);
  const linkBonde = sanitizeText(req.body.linkBonde, 300);

  if (!token || !nick || idade === null || !motivo) {
    return res.status(400).send("Campos inválidos.");
  }

  if (!isValidUrl(linkBonde)) {
    return res.status(400).send("Link inválido.");
  }

  db.get(`SELECT token, userId, used FROM form_tokens WHERE token = ?`, [token], (err, row) => {
    if (err) return res.status(500).send("Erro interno.");
    if (!row) return res.status(404).send("Token inválido.");
    if (row.used) return res.status(410).send("Token já usado.");

    db.run(`UPDATE form_tokens SET used = 1 WHERE token = ?`, [token]);

    db.run(
      `INSERT INTO form_submissions
      (token, userId, discordTag, nick, idade, motivo, linkBonde, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [token, row.userId, "PENDING_TAG", nick, idade, motivo, linkBonde, Date.now()],
      () => {
        if (global.__onFormSubmitted) global.__onFormSubmitted({ token });

        res.send("<h2>✅ Formulário enviado! Aguarde aprovação no Discord.</h2>");
      }
    );
  });
});

function startWeb() {
  const port = Number(process.env.PORT || 3000);

  app.listen(port, "0.0.0.0", () => {
    console.log(`🌐 Web online na porta ${port}`);
  });
}

module.exports = { startWeb };,