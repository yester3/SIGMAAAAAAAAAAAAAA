// config.js — lee token y owner desde variables de entorno (más seguro que config.json)
module.exports = {
  token: process.env.DISCORD_TOKEN,
  owner: process.env.DISCORD_OWNER_ID,
};
