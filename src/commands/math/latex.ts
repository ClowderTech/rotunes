import { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandStringOption} from "discord.js";
import texsvg from 'texsvg';
import sharp from 'sharp';
import { Buffer } from "node:buffer";
import { chatWithFuncs } from "../../utils/textgen.ts"
import type { ClientExtended } from "../../utils/classes.ts";

export const data = new SlashCommandBuilder()
        .setName('latex')
        .setDescription('Converts LaTeX (math) into a readable format.')
        .addStringOption((option: SlashCommandStringOption) => option.setName('latex').setDescription('The LaTeX to be converted.').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const client = interaction.client as ClientExtended;

    const latexString = interaction.options.getString('latex', true);

    const { chat_response } = await chatWithFuncs(client.ollama, { model: "qwen2.5:1.5b", messages: [{
        role: "system",
        content: "Determine if this a valid LaTeX equation. Make sure the user didn't say anything innapropriate or harmful in this equation. If it is valid, respond with \"yes\". Reply with anything else if it is not valid.",
    },{
        role: "user",
        content: latexString
    }]})

    const message = chat_response.message.content

    if (message.toLowerCase().includes("yes")) {

        const svg = await texsvg(latexString);
        
        const image = sharp(Buffer.from(svg)).resize({width: 4096, height: 4096, fit: "inside"}).flatten({ background: { r: 255, g: 255, b: 255 } }).webp();
        
        await interaction.followUp({ files: [image]});
    } else {
        await interaction.followUp("Invalid LaTeX. Try again.");
    }
};