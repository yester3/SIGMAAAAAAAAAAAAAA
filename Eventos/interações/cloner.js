const { ModalBuilder, TextInputStyle, TextInputBuilder, ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags } = require("discord.js");
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs-extra');
const { General } = require("../../Database");

module.exports = {
    name: "interactionCreate",
    run: async (interaction) => {
        const { customId, user, client } = interaction;
        if (!customId) return;

        // ---------- Server cloning button ----------
        if (customId === "panel_cloner") {
            const modal = new ModalBuilder()
                .setCustomId(`panelclonermodal`)
                .setTitle("Server Cloning Panel");

            const original = new TextInputBuilder()
                .setCustomId("original")
                .setLabel("Source Server ID:")
                .setPlaceholder("Enter the ID of the server to clone")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const tokenInput = new TextInputBuilder()
                .setCustomId("token")
                .setLabel("Account Token:")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Enter the account token (selfbot)")
                .setRequired(true);

            const target = new TextInputBuilder()
                .setCustomId("alvo")
                .setLabel("Target Server ID:")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Enter the ID of the server where to paste")
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(original));
            modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
            modal.addComponents(new ActionRowBuilder().addComponents(target));

            return interaction.showModal(modal);
        }

        // ---------- Handle server cloning modal ----------
        if (customId === "panelclonermodal") {
            const original = interaction.fields.getTextInputValue("original");
            const token = interaction.fields.getTextInputValue("token");
            const target = interaction.fields.getTextInputValue("alvo");

            await interaction.reply({ content: `⏳ Verifying the provided information...`, flags: [MessageFlags.Ephemeral] });

            // Helper: editar la reply sin crashear si la interacción ya expiró o el canal fue borrado
            const safeEdit = async (content) => {
                try {
                    await interaction.editReply({ content });
                } catch {
                    // El canal fue borrado o la interacción expiró — continuar silenciosamente
                }
            };

            // Helper: pausa para respetar rate limits de Discord
            const sleep = ms => new Promise(r => setTimeout(r, ms));

            // Helper: construye permissionOverwrites mapeando roles origen → destino
            // permissionOverwrites en selfbot-v13 es un Manager; los overwrites viven en .cache
            // Si un rol del origen no existe en el destino, se salta (no se asigna a @everyone)
            const buildOverwrites = (channel, sourceGuild, targetGuild) => {
                const cache = channel.permissionOverwrites?.cache;
                if (!cache) return [];
                return [...cache.values()].map(v => {
                    const sourceRole = sourceGuild.roles.cache.get(v.id);
                    if (!sourceRole) return null; // overwrite de usuario — saltarlo
                    const targetRole = targetGuild.roles.cache.find(r => r.name === sourceRole.name);
                    if (!targetRole) return null; // rol no existe en destino — saltarlo
                    return { id: targetRole.id, allow: v.allow, deny: v.deny };
                }).filter(Boolean);
            };

            // Login del selfbot
            const self = new Client();
            let loginError = false;
            try {
                await self.login(token).catch(() => { loginError = true; });
            } catch {
                loginError = true;
            }
            if (loginError) {
                return safeEdit(`❌ **| Invalid token.** Please check and try again.`);
            }

            // Verificar que el selfbot está en ambos servidores
            const sourceGuild = self.guilds.cache.get(original);
            const targetGuild = self.guilds.cache.get(target);

            if (!sourceGuild || !targetGuild) {
                await self.logout().catch(() => {});
                return safeEdit(`❌ **| The account is not in both servers.** Join both servers for cloning to work.`);
            }

            // Enviar log si hay canal configurado
            const logChannel = client.channels.cache.get(General.get(`logs_cloner`));
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle("New Cloning Started")
                    .setDescription("Cloning process initiated.")
                    .setThumbnail(interaction.client.user.displayAvatarURL())
                    .setColor('#A5A5A5')
                    .addFields(
                        { name: "**User**", value: `${user} (\`${user.id}\`)`, inline: true },
                        { name: "**Source Server**", value: `\`${sourceGuild.name} (${sourceGuild.id})\``, inline: true },
                        { name: "**Target Server**", value: `\`${targetGuild.name} (${targetGuild.id})\``, inline: true },
                        { name: "**Account Info**", value: `${self.user.username} (\`${self.user.id}\`)`, inline: false }
                    );
                logChannel.send({ embeds: [embed] }).catch(() => {});
            }

            // Recopilar canales y roles del servidor origen
            const items = {
                // Incluye GUILD_TEXT y GUILD_ANNOUNCEMENT (canales de anuncios)
                text:     [...sourceGuild.channels.cache.filter(c => c.type === "GUILD_TEXT" || c.type === "GUILD_ANNOUNCEMENT").sort((a, b) => a.calculatedPosition - b.calculatedPosition).values()],
                voice:    [...sourceGuild.channels.cache.filter(c => c.type === "GUILD_VOICE").sort((a, b) => a.calculatedPosition - b.calculatedPosition).values()],
                category: [...sourceGuild.channels.cache.filter(c => c.type === "GUILD_CATEGORY").sort((a, b) => a.calculatedPosition - b.calculatedPosition).values()],
                roles:    [...sourceGuild.roles.cache.sort((a, b) => b.calculatedPosition - a.calculatedPosition).values()]
            };

            await safeEdit(`⏳ **|** Cloning server: \`${sourceGuild.name}\`\n- Deleting all **roles & channels** in target...`);

            // Eliminar correctamente esperando todas las promesas
            await Promise.all([...targetGuild.channels.cache.values()].map(c => c.delete().catch(() => {})));
            await Promise.all([...targetGuild.roles.cache.values()].map(r => r.delete().catch(() => {})));
            await Promise.all([...targetGuild.emojis.cache.values()].map(e => e.delete().catch(() => {})));

            // Ícono y nombre (el iconURL puede ser null si no tiene ícono)
            const iconURL = sourceGuild.iconURL({ dynamic: true, size: 512 });
            if (iconURL) await targetGuild.setIcon(iconURL).catch(() => {});
            await targetGuild.setName(sourceGuild.name).catch(() => {});

            // ---- Roles ----
            await safeEdit(`⏳ **|** Cloning server: \`${sourceGuild.name}\`\n- Copying **roles**...`);
            for (const role of items.roles) {
                if (role.managed || role.id === sourceGuild.id) continue; // saltar @everyone y roles gestionados
                await targetGuild.roles.create({
                    name: role.name,
                    colors: role.color,
                    permissions: role.permissions,
                    mentionable: role.mentionable,
                    position: role.position
                }).catch(() => {});
                await sleep(300);
            }

            // ---- Emojis ----
            await safeEdit(`⏳ **|** Cloning server: \`${sourceGuild.name}\`\n- Copying **emojis**...`);
            for (const e of sourceGuild.emojis.cache.values()) {
                await targetGuild.emojis.create(e.url, e.name).catch(() => {});
                await sleep(300);
            }

            // ---- Categorías ----
            await safeEdit(`⏳ **|** Cloning server: \`${sourceGuild.name}\`\n- Copying **categories**...`);
            for (const category of items.category) {
                await targetGuild.channels.create(category.name, {
                    type: "GUILD_CATEGORY",
                    permissionOverwrites: buildOverwrites(category, sourceGuild, targetGuild),
                    position: category.position
                }).catch(() => {});
                await sleep(300);
            }

            // ---- Canales de texto (y anuncios) ----
            await safeEdit(`⏳ **|** Cloning server: \`${sourceGuild.name}\`\n- Copying **text channels**...`);
            for (const channel of items.text) {
                const chn = await targetGuild.channels.create(channel.name, {
                    type: channel.type === "GUILD_ANNOUNCEMENT" ? "GUILD_NEWS" : "GUILD_TEXT",
                    permissionOverwrites: buildOverwrites(channel, sourceGuild, targetGuild),
                    position: channel.position
                }).catch(() => null);

                if (!chn) { await sleep(300); continue; }
                if (channel.topic) await chn.setTopic(channel.topic).catch(() => {});

                if (channel.parent) {
                    const parentInTarget = targetGuild.channels.cache.find(c => c.name === channel.parent.name && c.type === "GUILD_CATEGORY");
                    if (parentInTarget) await chn.setParent(parentInTarget.id).catch(() => {});
                }
                await sleep(300);
            }

            // ---- Canales de voz ----
            await safeEdit(`⏳ **|** Cloning server: \`${sourceGuild.name}\`\n- Copying **voice channels**...`);
            for (const channel of items.voice) {
                const chn = await targetGuild.channels.create(channel.name, {
                    type: "GUILD_VOICE",
                    permissionOverwrites: buildOverwrites(channel, sourceGuild, targetGuild),
                    position: channel.position,
                    userLimit: channel.userLimit
                }).catch(() => null);

                if (!chn) { await sleep(300); continue; }

                if (channel.parent) {
                    const parentInTarget = targetGuild.channels.cache.find(c => c.name === channel.parent.name && c.type === "GUILD_CATEGORY");
                    if (parentInTarget) await chn.setParent(parentInTarget.id).catch(() => {});
                }
                await sleep(300);
            }

            await safeEdit(`✅ **| Success!** Server cloned successfully. Enjoy your new cloned server!`);
            await self.logout().catch(() => {});
        }

        // ---------- Website cloning button ----------
        if (interaction.isButton() && customId === "clonersite") {
            const modal = new ModalBuilder()
                .setCustomId('url-cop')
                .setTitle('Clone Website');

            const option1 = new TextInputBuilder()
                .setCustomId('name-site')
                .setLabel('Site name:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Portfolio')
                .setMaxLength(50)
                .setRequired(true);

            const option2 = new TextInputBuilder()
                .setCustomId('url-input')
                .setLabel('Website URL:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://example.com')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(option1),
                new ActionRowBuilder().addComponents(option2)
            );
            await interaction.showModal(modal);
        }

        // ---------- Handle website cloning modal ----------
        if (interaction.isModalSubmit() && customId === "url-cop") {
            try {
                const sanitizeFilename = (filename) => filename.replace(/[^a-zA-Z0-9_\- ]/g, '_');
                const filename = sanitizeFilename(interaction.fields.getTextInputValue('name-site'));
                const url = interaction.fields.getTextInputValue('url-input');

                await interaction.reply({ content: `⏳ **|** Cloning website, please wait...`, flags: [MessageFlags.Ephemeral] });

                const fetchPage = async (pageUrl) => {
                    try {
                        const response = await axios.get(pageUrl);
                        return response.data;
                    } catch (error) {
                        console.error(`Error fetching page: ${error.message}`);
                        return null;
                    }
                };

                const updateLinks = async (html, baseUrl) => {
                    const $ = cheerio.load(html);
                    const promises = [];

                    const updateLink = async (elem, attr) => {
                        const link = $(elem).attr(attr);
                        if (link) {
                            try {
                                const absoluteLink = new URL(link, baseUrl).href;
                                await axios.get(absoluteLink, { responseType: 'arraybuffer' });
                                const localPath = path.basename(new URL(absoluteLink).pathname);
                                $(elem).attr(attr, localPath);
                            } catch {
                                // recurso no descargable, ignorar
                            }
                        }
                    };

                    $('a[href]').each((i, elem) => promises.push(updateLink(elem, 'href')));
                    $('img[src]').each((i, elem) => promises.push(updateLink(elem, 'src')));
                    $('link[href]').each((i, elem) => promises.push(updateLink(elem, 'href')));
                    $('script[src]').each((i, elem) => promises.push(updateLink(elem, 'src')));

                    await Promise.all(promises);
                    return $.html();
                };

                const html = await fetchPage(url);
                if (!html) {
                    return interaction.editReply({ content: `❌ **|** Could not fetch the website. Please check the URL and try again.` });
                }

                const htmlBuffer = await updateLinks(html, url);

                await interaction.editReply({
                    content: `✅ **| Success!** Website cloned successfully!`,
                    files: [{ attachment: Buffer.from(htmlBuffer), name: `${filename}.html` }]
                });

                const logChannel = client.channels.cache.get(General.get(`logs_cloner`));
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#A5A5A5')
                        .setTitle("New Website Clone")
                        .setDescription("Website cloning completed.")
                        .addFields(
                            { name: '**User:**', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                            { name: '**Site Name:**', value: filename, inline: true },
                            { name: '**Original URL:**', value: url, inline: true }
                        )
                        .setThumbnail(interaction.client.user.displayAvatarURL());
                    logChannel.send({ embeds: [embed], files: [{ attachment: Buffer.from(htmlBuffer), name: `${filename}.html` }] }).catch(() => {});
                }

            } catch (error) {
                console.error('Error during website cloning:', error);
                try {
                    await interaction.editReply({ content: `❌ **|** An error occurred while cloning the website. Please try again later.` });
                } catch { /* interacción expirada */ }
            }
        }
    }
};
