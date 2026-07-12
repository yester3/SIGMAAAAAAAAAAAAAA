const { ApplicationCommandType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "clonepanel",
  description: "[🤖 | Admin] Send the cloning panel.",
  type: ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "<:error:1411770137186533632> **| No Permission!** You don't have permission to use this command!",
        ephemeral: true,
      });
    }

    try {
      await interaction.reply({
        content: "<:Check:1411770745536643092> **| Success!** Cloning panel sent successfully!",
        ephemeral: true,
      });

      const botAvatar = client.user.displayAvatarURL({ format: "png", dynamic: true, size: 1024 });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("panel_cloner")
            .setLabel("Clone Server")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("1411771441317154971"), // Verify emoji IDs
          new ButtonBuilder()
            .setCustomId("clonersite")
            .setLabel("Clone Website")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("1411771384576610427")
        );

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle("BOT CLONER")
        .setDescription(
          "> **Hello Member!** Use the buttons below to access the server & website cloning panel.\n\n" +
          "## HOW TO USE & TIPS\n" +
          "> To clone a server you will need:\n" +
          "- **ID of the server to be cloned**\n" +
          "- **ID of the server where it will be copied**\n" +
          "- **Token of an account (TIP: I don't recommend using your main account)**\n\n" +
          "> The account must be in both servers for it to work. I also recommend changing your account password to reset the token.\n\n" +
          "> To clone a website you only need the site URL.\n" +
          "**WARNING:** Do not try to clone large sites, the bot does not yet support large or very complex sites, clone only portfolios, etc."
        )
        .setThumbnail(botAvatar)
        .setFooter({ text: "Technology and Innovation" });

      await interaction.channel.send({
        embeds: [embed],
        components: [row],
      });

    } catch (error) {
      console.error("Error in clonepanel:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "<:error:1411770137186533632> **| Failure!** An unexpected error occurred!",
          ephemeral: true,
        });
      }
    }
  },
};
