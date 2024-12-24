import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandStringOption,
} from "discord.js";

import { LuauExecutionApi } from "openblox/cloud";
import { pollMethod } from "openblox/helpers";
import { setConfig } from "openblox/config";
import { ClientExtended } from "../../utils/classes.ts";
import { scanMessage } from "../../utils/textgen.ts";

export const data = new SlashCommandBuilder()
	.setName("executeluau")
	.setDescription(
		"Executes Luau code using Roblox's luau-execution-sessions API endpoint.",
	)
	.addStringOption((option: SlashCommandStringOption) =>
		option
			.setName("luau")
			.setDescription("The Luau code to be executed.")
			.setRequired(true)
	);

let client: ClientExtended;

async function format(output: string): Promise<string> {
	return await scanMessage(
			client,
			output.normalize().replaceAll("`", "").trim(),
		)
		? "Ommited due to possible bypass"
		: output.normalize().replaceAll("`", "").trim();
}

export async function execute(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply();

	client = interaction.client as ClientExtended;

	const luauCode = interaction.options.getString("luau", true);
	const apiKey = Deno.env.get("ROBLOX_API_KEY");
	const universeId = Number(Deno.env.get("ROBLOX_UNIVERSE_ID")!);
	const placeId = Number(Deno.env.get("ROBLOX_PLACE_ID")!);

	setConfig({
		cloudKey: apiKey,
	});

	const { data } = await LuauExecutionApi.executeLuau({
		universeId: universeId,
		placeId: placeId,
		script: luauCode,
	});

	const { data: afterData } = await pollMethod(
		LuauExecutionApi.luauExecutionTask({
			universeId: data.universeId,
			placeId: data.placeId,
			version: data.version,
			sessionId: data.sessionId,
			taskId: data.taskId,
		}),
		async ({ data }, stopPolling) =>
			(data.state === "COMPLETE" || data.state === "FAILED") &&
			await stopPolling(),
	);

	const { data: logs } = await LuauExecutionApi.listLuauExecutionLogs({
		universeId: data.universeId,
		placeId: data.placeId,
		version: data.version,
		sessionId: data.sessionId,
		taskId: data.taskId,
	});

	await interaction.editReply({
		content: afterData.error
			? `Execution Errored!\n\nResults:\`\`\`${afterData.error.code}: ${afterData.error.message}\`\`\`Logs:\`\`\`${
				await format(logs[0].messages.join("\n")) || "No Output"
			}\`\`\``
			: `Execution Successful!\n\nResults:\`\`\`${
				await format(afterData.output.results.join("\n")) || "No Output"
			}\`\`\`Logs:\`\`\`${
				await format(logs[0].messages.join("\n")) || "No Output"
			}\`\`\``,
		allowedMentions: { parse: [] },
	});
}
