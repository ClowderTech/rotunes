import { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption} from "discord.js";
import texsvg from 'texsvg';
import sharp from 'sharp';
import { Buffer } from "node:buffer";

export const data = new SlashCommandBuilder()
        .setName('latex')
        .setDescription('Converts LaTeX (math) into a readable format.')
        .addStringOption((option: SlashCommandStringOption) => option.setName('latex').setDescription('The LaTeX to be converted.').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    const latexString = interaction.options.getString('latex', true);
    const svg = await texsvg(latexString);
    const image = sharp(Buffer.from(svg)).resize({width: 4096, height: 4096, fit: "inside"}).flatten({ background: { r: 255, g: 255, b: 255 } }).webp();
    await interaction.reply({ files: [image]});
};