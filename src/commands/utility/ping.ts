const { SlashCommandBuilder, CommandInteraction } = require("discord.js")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction: typeof CommandInteraction) {
        await interaction.reply(`Pong! \`${interaction.client.ws.ping}ms\``);
    }
}