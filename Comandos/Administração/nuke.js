const { ApplicationCommandType, PermissionsBitField } = require("discord.js");

module.exports = {
    name: `nuke`,
    description: `[🤖 | Admin] Recreate a channel.`,
    type: ApplicationCommandType.ChatInput,

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: `<:error:1411770137186533632> **| No Permission!** You don't have permission to use this command!`,
                ephemeral: true
            });
        }

        const newChannel = await interaction.channel.clone();

        await interaction.channel.delete();

        newChannel.send({
            content: `**Nuked by** \`${interaction.user.username}\``
        });
    }
};
