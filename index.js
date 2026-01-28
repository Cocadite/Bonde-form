require("dotenv").config();
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

const db = require("./db/sqlite");
const { startWeb } = require("./server"); // ✅ corrigido
const interactionHandler = require("./interactionHandler");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));
client.on("error", (e) => console.error("client error:", e));

interactionHandler(client);

// Hook chamado pelo site depois que o form é enviado
global.__onFormSubmitted = async ({ token }) => {
  try {
    const channelId = process.env.FORM_REVIEW_CHANNEL_ID;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    db.get(`SELECT * FROM form_submissions WHERE token = ? ORDER BY createdAt DESC LIMIT 1`, [token], async (err, row) => {
      if (err || !row) return;

      const user = await client.users.fetch(row.userId).catch(() => null);
      const discordTag = user ? user.tag : `ID:${row.userId}`;

      if (row.discordTag === "PENDING_TAG") {
        db.run(`UPDATE form_submissions SET discordTag=? WHERE id=?`, [discordTag, row.id]);
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Novo Formulário — Bonde")
        .setColor("#FFD700")
        .addFields(
          { name: "Nick do Discord", value: discordTag, inline: false },
          { name: "Nick", value: row.nick, inline: true },
          { name: "Idade", value: String(row.idade), inline: true },
          { name: "Por que quer entrar", value: row.motivo, inline: false },
          { name: "Link do bonde", value: row.linkBonde, inline: false }
        )
        .setFooter({ text: `UserID: ${row.userId}` })
        .setTimestamp(new Date(row.createdAt));

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approve:${token}`).setLabel("✅ Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject:${token}`).setLabel("❌ Recusar").setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [buttons] });
    });
  } catch (e) {
    console.error("notify error:", e);
  }
};

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

startWeb();
client.login(process.env.DISCORD_TOKEN);