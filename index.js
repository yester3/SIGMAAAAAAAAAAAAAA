const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  Partials 
} = require('discord.js');
const { token } = require('./config.js');
const evento = require('./handler/Events');

console.clear();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.Message, Partials.Channel],
});

module.exports = client;

client.slashCommands = new Collection();

// Evitar que errores de Discord API maten el proceso
client.on('error', (err) => {
  console.error('[Client Error]', err.message);
});

// Evitar que promesas rechazadas no manejadas maten el proceso
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err?.message || err);
});

evento.run(client);
require('./handler/index')(client);

client.login(token).then(() => {
  console.log('Bot connected successfully.');
}).catch((err) => {
  console.error('Error connecting bot:', err);
});
