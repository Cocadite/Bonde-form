const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const crypto = require("crypto");
const db = require("../db/sqlite");
const { isAdmin } = require("../utils/admin");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "form") {
        const token = crypto.randomBytes(16).toString("hex");
        const userId = interaction.user.id;

        db.run(
          `INSERT INTO form_tokens (token, userId, createdAt, used) VALUES (?, ?, ?, 0)`,
          [token, userId, Date.now()],
          async (err) => {
            if (err) return interaction.reply({ content: "❌ Erro ao gerar seu formulário.", ephemeral: true });

            const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");
            const link = `${baseUrl}/form?token=${token}`;

            const dmOk = await interaction.user.send(`📋 Seu formulário (link único):\n${link}`)
              .then(() => true)
              .catch(() => false);

            if (dmOk) return interaction.reply({ content: "✅ Te enviei o formulário na DM.", ephemeral: true });
            return interaction.reply({ content: `⚠️ Não consegui DM. Aqui está o link:\n${link}`, ephemeral: true });
          }
        );
      }
      return;
    }

    if (interaction.isButton()) {
      const [action, token] = String(interaction.customId || "").split(":");
      if (!action || !token) return;

      if (!isAdmin(interaction)) {
        return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
      }

      db.get(`SELECT * FROM form_submissions WHERE token = ? ORDER BY createdAt DESC LIMIT 1`, [token], async (err, row) => {
        if (err || !row) return interaction.reply({ content: "❌ Formulário não encontrado.", ephemeral: true });
        if (row.status !== "PENDING") return interaction.reply({ content: `⚠️ Já decidido: ${row.status}`, ephemeral: true });

        const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
        if (!guild) return interaction.reply({ content: "❌ GUILD_ID inválido.", ephemeral: true });

        const user = await client.users.fetch(row.userId).catch(() => null);
        const discordTag = user ? user.tag : `ID:${row.userId}`;

        const embed = new EmbedBuilder()
          .setTitle("📋 Formulário — Bonde")
          .setColor("#FFD700")
          .addFields(
            { name: "Nick do Discord", value: discordTag, inline: false },
            { name: "Nick", value: row.nick, inline: true },
            { name: "Idade", value: String(row.idade), inline: true },
            { name: "Recrutado por", value: row.recrutador, inline: false },
            { name: "Por que quer entrar", value: row.motivo, inline: false },
            { name: "Link do bonde", value: row.linkBonde, inline: false }
          )
          .setFooter({ text: `UserID: ${row.userId}` })
          .setTimestamp(new Date(row.createdAt));

        if (action === "approve") {
          const roleId = process.env.APPROVED_ROLE_ID;
          if (!roleId) return interaction.reply({ content: "❌ APPROVED_ROLE_ID não configurado.", ephemeral: true });

          const member = await guild.members.fetch(row.userId).catch(() => null);
          if (!member) {
            db.run(`UPDATE form_submissions SET status='APPROVED', staffId=?, staffTag=? WHERE id=?`,
              [interaction.user.id, interaction.user.tag, row.id]);
            embed.setColor("#00ff88").setTitle("✅ Aprovado (usuário não está no servidor)");
            return interaction.update({ embeds: [embed], components: [] });
          }

          const ok = await member.roles.add(roleId).then(() => true).catch(() => false);
          if (!ok) {
            return interaction.reply({ content: "❌ Não consegui dar o cargo (verifique hierarquia/permissões).", ephemeral: true });
          }

          db.run(`UPDATE form_submissions SET status='APPROVED', staffId=?, staffTag=? WHERE id=?`,
            [interaction.user.id, interaction.user.tag, row.id]);

          embed.setColor("#00ff88").setTitle("✅ Formulário Aprovado")
            .addFields({ name: "Aprovado por", value: interaction.user.tag, inline: false });

          return interaction.update({ embeds: [embed], components: [] });
        }

        if (action === "reject") {
          db.run(`UPDATE form_submissions SET status='REJECTED', staffId=?, staffTag=? WHERE id=?`,
            [interaction.user.id, interaction.user.tag, row.id]);

          embed.setColor("#ff4d4d").setTitle("❌ Formulário Recusado")
            .addFields({ name: "Recusado por", value: interaction.user.tag, inline: false });

          return interaction.update({ embeds: [embed], components: [] });
        }
      });
    }
  });
};
