const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const { owner } = require("../../config.js");

module.exports = {
  name: 'servers',
  description: '[🛠️ | Owner] List the servers the bot is in.',

  run: async (client, interaction) => {
    if (interaction.user.id !== owner) {
      return interaction.reply({
        content: "<:error:1411770137186533632> **| No Permission!** You don't have permission to use this command!",
        ephemeral: true
      });
    }

    const generateEmbed = () => {
      const guilds = client.guilds.cache
        .map(guild => `**Server Name:** ${guild.name}\n<:Discord_Copy_ID_white:1411814191966453794> \`${guild.id}\``)
        .join('\n\n');

      return new EmbedBuilder()
        .setTitle('<:discord_white:1411771441317154971> **| Servers the Bot Is In**')
        .setDescription(guilds || '\`❌\` | The bot is not in **any server!**')
        .setFooter({ text: `Total: ${client.guilds.cache.size} servers` });
    };

    const leaveButton = new ButtonBuilder()
      .setCustomId('leave_server')
      .setLabel('Leave a Server')
      .setEmoji('<:sair:1411812176624091270>')
      .setStyle(ButtonStyle.Secondary);

    const refreshButton = new ButtonBuilder()
      .setCustomId('refresh_panel')
      .setLabel('Refresh Panel')
      .setEmoji('<a:Atualizar:1411812233595326476>')
      .setStyle(ButtonStyle.Secondary);

    const infoButton = new ButtonBuilder()
      .setCustomId('server_info')
      .setLabel('Server Info')
      .setEmoji('<:Info:1411813139527503923>')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(
      leaveButton,
      refreshButton,
      infoButton
    );

    const botMessage = await interaction.reply({
      embeds: [generateEmbed()],
      components: [row],
      ephemeral: true,
      fetchReply: true
    });

    const collector = botMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: '<:error:1411770137186533632> **| Error!** Only the command user can interact!',
          ephemeral: true
        });
      }

      if (i.customId === 'leave_server') {
        await i.reply({
          content: '📥 Send now the **server ID** you want the bot to leave.',
          ephemeral: true
        });

        const filter = m => m.author.id === interaction.user.id;
        const idCollector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        idCollector.on('collect', async m => {
          const guildId = m.content.trim();
          const guild = client.guilds.cache.get(guildId);

          if (!guild) {
            return m.reply('<:error:1411770137186533632> **|** The bot is not in a server with that ID!');
          }

          try {
            await guild.leave();
            m.reply(`<:Check:1411770745536643092> **| Success!** The bot left the server **${guild.name}** successfully!`);
          } catch (err) {
            console.error(err);
            m.reply('<:error:1411770137186533632> **|** An error occurred while trying to leave the server!');
          }
        });
      }

      else if (i.customId === 'refresh_panel') {
        await i.update({
          embeds: [generateEmbed()],
          components: [row],
          ephemeral: true
        });
      }

      else if (i.customId === 'server_info') {
        await i.reply({
          content: '📥 Send now the **server ID** you want to see information for.',
          ephemeral: true
        });

        const filter = m => m.author.id === interaction.user.id;
        const infoCollector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        infoCollector.on('collect', async m => {
          const guildId = m.content.trim();
          const guild = client.guilds.cache.get(guildId);

          if (!guild) {
            return m.reply('<:error:1411770137186533632> **|** The bot is not in a server with that ID!');
          }

          try {
            const ownerUser = await guild.fetchOwner();
            const infoEmbed = new EmbedBuilder()
              .setTitle('<:Info:1411813139527503923> **| Server Information:**')
              .addFields(
                { name: '📛 Name', value: guild.name, inline: true },
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `${ownerUser.user.tag} (\`${ownerUser.id}\`)`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '🌍 Region', value: guild.preferredLocale || 'Unknown', inline: true },
                { name: '📆 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
              )
            m.reply({ embeds: [infoEmbed] });
          } catch (err) {
            console.error(err);
            m.reply('<:error:1411770137186533632> **| Error!** Could not fetch information for that server!');
          }
        });
      }
    });
  }
};
