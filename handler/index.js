const fs = require("fs");

module.exports = async (client) => {
  const SlashsArray = [];

  // Usar readdirSync para garantizar que todos los comandos estén cargados
  // ANTES de que el bot esté listo — sin race conditions
  const subfolders = fs.readdirSync("./Comandos");

  for (const subfolder of subfolders) {
    const fullPath = `./Comandos/${subfolder}`;

    // Saltar archivos placeholder (solo procesar directorios reales)
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    const files = fs.readdirSync(fullPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
      const cmd = require(`../Comandos/${subfolder}/${file}`);
      if (!cmd?.name) continue;
      client.slashCommands.set(cmd.name, cmd);
      SlashsArray.push(cmd);
      console.log(`[Handler] Loaded command: ${cmd.name}`);
    }
  }

  console.log(`[Handler] Total commands loaded: ${SlashsArray.length}`);

  // Registrar comandos en todos los servidores cuando el bot esté listo
  // En discord.js v14 el evento correcto es "clientReady"
  client.on("clientReady", async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set(SlashsArray);
        console.log(`[Handler] Commands registered in: ${guild.name}`);
      } catch (err) {
        console.error(`[Handler] Error registering commands in ${guild.name}:`, err.message);
      }
    }
  });
};
