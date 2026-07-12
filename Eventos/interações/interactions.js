const { InteractionType } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {

        if (interaction.type === InteractionType.ApplicationCommand) {

            // Interacciones de DMs no tienen guild
            if (!interaction.guild) return;

            const cmd = client.slashCommands.get(interaction.commandName);

            if (!cmd) return interaction.reply({ content: `Error: command not found`, ephemeral: true });

            interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);

            // Atrapar errores del comando para que no maten el proceso
            try {
                await cmd.run(client, interaction);
            } catch (err) {
                console.error(`[Command Error] ${interaction.commandName}:`, err.message);
                try {
                    const msg = { content: `❌ An unexpected error occurred while running this command.`, ephemeral: true };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(msg);
                    } else {
                        await interaction.reply(msg);
                    }
                } catch { /* interaction ya expiró */ }
            }
        }
    }
}
