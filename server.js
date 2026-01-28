require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../db/sqlite");
const { sanitizeText, toInt, isValidUrl } = require("../utils/validate");

const app = express();

// ✅ aceita form e JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
    if (row.used) return res.status(410).send("Este link já foi usado. Peça /form de novo.");

    const htmlPath = path.resolve(process.cwd(), "views", "form.html");
    const raw = fs.readFileSync(htmlPath, "utf-8");
    res.send(renderTemplate(raw, { TOKEN: token, DISCORD_TAG: "SeuDiscord#0000" }));
  });
});

app.post("/submit", (req, res) => {
  const token = sanitizeText(req.body.token, 120);
  const nick = sanitizeText(req.body.nick, 64);

  // ✅ você disse que removeu “recrutador”, então não valida mais
  const motivo = sanitizeText(req.body.motivo, 700);
  const idade = toInt(req.body.idade, 5, 120);
  const linkBonde = sanitizeText(req.body.linkBonde, 300);

  if (!token) return res.status(400).send("Token ausente.");
  if (!nick || !motivo || idade === null) return res.status(400).send("Campos inválidos.");
  if (!isValidUrl(linkBonde)) return res.status(400).send("Link inválido.");

  db.get(`SELECT token, userId, used FROM form_tokens WHERE token = ?`, [token], (err, row) => {
    if (err) return res.status(500).send("Erro interno.");
    if (!row) return res.status(404).send("Token inválido.");
    if (row.used) return res.status(410).send("Este link já foi usado. Peça /form de novo.");

    db.run(`UPDATE form_tokens SET used = 1 WHERE token = ?`, [token]);

    db.run(
      `INSERT INTO form_submissions
        (token, userId, discordTag, nick, idade, recrutador, motivo, linkBonde, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        token,
        row.userId,
        "PENDING_TAG",
        nick,
        idade,
        null, // ✅ não tem mais recrutador
        motivo,
        linkBonde,
        Date.now(),
      ],
      (e2) => {
        if (e2) return res.status(500).send("Erro ao salvar.");

        if (global.__onFormSubmitted) global.__onFormSubmitted({ token });

        res
          .status(200)
          .send("<h2 style='font-family:Arial'>✅ Enviado! Aguarde aprovação no Discord.</h2>");
      }
    );
  });
});

let started = false;

function startWeb() {
  if (started) return;
  started = true;

  const port = Number(process.env.PORT || 3000);

  // ✅ o mais importante pro Render:
  app.listen(port, "0.0.0.0", () => {
    console.log(`🌐 Web online na porta ${port}`);
  });
}

module.exports = { startWeb };