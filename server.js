require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("./sqlite");
const { sanitizeText, toInt, isValidUrl } = require("./validate");

const app = express();
app.use(express.urlencoded({ extended: true }));

function renderTemplate(raw, vars) {
  let out = raw;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

app.get("/", (_req, res) => res.status(200).send("OK - Bonde Form Bot"));
app.get("/health", (_req, res) => res.status(200).send("ok"));

app.get("/form", (req, res) => {
  const token = String(req.query.token || "").trim();
  if (!token) return res.status(400).send("Token ausente.");

  db.get(`SELECT token, userId, used FROM form_tokens WHERE token = ?`, [token], (err, row) => {
    if (err) return res.status(500).send("Erro interno.");
    if (!row) return res.status(404).send("Token inválido.");
    if (row.used) return res.status(410).send("Este link já foi usado.");

    const htmlPath = path.resolve(process.cwd(), "form.html"); // ✅ corrigido
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

  if (!token) return res.status(400).send("Token ausente.");
  if (!nick || !motivo || idade === null) return res.status(400).send("Campos inválidos.");
  if (!isValidUrl(linkBonde)) return res.status(400).send("Link inválido.");

  db.get(`SELECT token, userId, used FROM form_tokens WHERE token = ?`, [token], (err, row) => {
    if (err) return res.status(500).send("Erro interno.");
    if (!row) return res.status(404).send("Token inválido.");
    if (row.used) return res.status(410).send("Este link já foi usado.");

    db.run(`UPDATE form_tokens SET used = 1 WHERE token = ?`, [token]);

    db.run(
      `INSERT INTO form_submissions
        (token, userId, discordTag, nick, idade, motivo, linkBonde, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [token, row.userId, "PENDING_TAG", nick, idade, motivo, linkBonde, Date.now()],
      (e2) => {
        if (e2) return res.status(500).send("Erro ao salvar.");

        if (global.__onFormSubmitted) global.__onFormSubmitted({ token });

        res.status(200).send("<h2 style='font-family:Arial'>✅ Enviado! Aguarde aprovação no Discord.</h2>");
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

module.exports = { startWeb };