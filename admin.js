const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.resolve(process.cwd(), "src", "config.json");

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const cfg = JSON.parse(raw);
    return { adminRoleIds: Array.isArray(cfg.adminRoleIds) ? cfg.adminRoleIds : [] };
  } catch {
    return { adminRoleIds: [] };
  }
}

function isAdmin(interaction) {
  try {
    if (!interaction.inGuild()) return false;
    const { adminRoleIds } = loadConfig();
    if (!adminRoleIds.length) return false;
    const roles = interaction.member?.roles?.cache;
    if (!roles) return false;
    return adminRoleIds.some((rid) => roles.has(rid));
  } catch {
    return false;
  }
}

module.exports = { loadConfig, isAdmin };
