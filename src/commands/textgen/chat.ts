import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder,
	SlashCommandStringOption,
} from "discord.js";
import { UserMadeError, type ClientExtended } from "../../utils/classes.ts";
import { ObjectId } from "mongodb";
import { connect } from "puppeteer";
import {
	type ChatData,
	chatWithFuncs,
	convertBlobToUint8Array,
	imageAsk,
	verifySafeChat,
} from "../../utils/textgen.ts";
import type { ChatRequest, Message } from "ollama";
import { getData, setData } from "../../utils/mongohelper.ts";
import { EmbedBuilder } from "@discordjs/builders";
import { setConfig } from "openblox/config";
import { LuauExecutionApi } from "openblox/cloud";
import { pollMethod } from "openblox/helpers";

export const data = new SlashCommandBuilder()
	.setName("chat")
	.setDescription("Chat with RoTunes.")
	.setIntegrationTypes([
		ApplicationIntegrationType.UserInstall,
		ApplicationIntegrationType.GuildInstall,
	])
	.setContexts([
		InteractionContextType.BotDM,
		InteractionContextType.Guild,
		InteractionContextType.PrivateChannel,
	])
	.addStringOption((option: SlashCommandStringOption) =>
		option
			.setName("message")
			.setDescription("The message to send to RoTunes.")
			.setRequired(true)
	)
	.addAttachmentOption((option) =>
		option
			.setName("attachment1")
			.setDescription("An attachment to send to RoTunes.")
			.setRequired(false)
	)
	.addAttachmentOption((option) =>
		option
			.setName("attachment2")
			.setDescription("An attachment to send to RoTunes.")
			.setRequired(false)
	)
	.addAttachmentOption((option) =>
		option
			.setName("attachment3")
			.setDescription("An attachment to send to RoTunes.")
			.setRequired(false)
	)
	.addAttachmentOption((option) =>
		option
			.setName("attachment4")
			.setDescription("An attachment to send to RoTunes.")
			.setRequired(false)
	)
	.addAttachmentOption((option) =>
		option
			.setName("attachment5")
			.setDescription("An attachment to send to RoTunes.")
			.setRequired(false)
	);

function splitText(text: string, maxLength: number = 2000): string[] {
	const lines = text.split(/\r?\n/);
	const chunks: string[] = [];
	let currentChunk = "";
	let codeBlockOpen = false;

	const pushChunk = () => {
		if (codeBlockOpen) {
			currentChunk += "```\n";
			chunks.push(currentChunk.trim());
			currentChunk = "```\n";
		} else {
			chunks.push(currentChunk.trim());
			currentChunk = "";
		}
	};

	for (const line of lines) {
		if (line.trim().startsWith("```")) {
			codeBlockOpen = !codeBlockOpen;
		}

		if (currentChunk.length + line.length + 1 > maxLength) {
			if (line.length + 1 > maxLength) {
				let remainingLine = line;
				while (remainingLine.length > 0) {
					const spaceLeft = maxLength - currentChunk.length - 1;
					const segment = remainingLine.slice(0, spaceLeft);
					currentChunk += segment;
					remainingLine = remainingLine.slice(spaceLeft);
					if (remainingLine.length > 0) {
						pushChunk();
					}
				}
				currentChunk += "\n";
			} else {
				pushChunk();
				currentChunk += line + "\n";
			}
		} else {
			currentChunk += line + "\n";
		}
	}

	if (currentChunk.trim()) {
		if (codeBlockOpen) {
			currentChunk += "```";
		}
		chunks.push(currentChunk.trim());
	}

	return chunks;
}

async function executeEval(code: string): Promise<string> {
	const apiKey = process.env.ROBLOX_API_KEY!;
	const universeId = Number(process.env.ROBLOX_UNIVERSE_ID!);
	const placeId = Number(process.env.ROBLOX_PLACE_ID!);

	setConfig({
		cloudKey: apiKey,
	});

	const { data } = await LuauExecutionApi.executeLuau({
		universeId: universeId,
		placeId: placeId,
		script: code,
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
			(await stopPolling())
	);

	const { data: logs } = await LuauExecutionApi.listLuauExecutionLogs({
		universeId: data.universeId,
		placeId: data.placeId,
		version: data.version,
		sessionId: data.sessionId,
		taskId: data.taskId,
	});

	return `${afterData.error ? "Execution Errored!" : "Execution Successful!"}\n\nResults:\n${
		afterData.error
			? `\`\`\`${afterData.error.code}: ${afterData.error.message.substring(
					0,
					1004
				)}\`\`\``
			: `\`\`\`${
					afterData.output.results.join("\n") || "No Output"
				}\`\`\``
	}\n\nLogs:\n${logs[0].messages.join("\n") || "No Output"}`;
}

async function searchGoogle(query: string): Promise<string> {
	const searchResultsAmount = 3;
	const escapedTerm = encodeURIComponent(query);
	const url = `https://searx.clowdertech.com/search?q=${escapedTerm}&language=auto&time_range=&safesearch=0&categories=general&format=json`;

	let searchResults = "";
	let start = 0;

	const browser = await connect({
		browserWSEndpoint: process.env.BROWSER_WS_URL!,
	});
	const page = await browser.newPage();

	try {
		const response = await page.goto(url, {
			timeout: 30000,
			waitUntil: "load",
		});
		if (!response?.ok()) {
			return `Response not ok. Status ${response?.status()}.`;
		}
		const data = await response.json();
		const results = data.results;
		for (const result of results) {
			searchResults += `[${start + 1}] ${result.url} || ${result.content}\n`;
			start += 1;
			if (start === searchResultsAmount) {
				break;
			}
		}
	} catch (error) {
		return `An error occurred: ${error}`;
	} finally {
		await browser.close();
	}

	return searchResults;
}

async function scrapeWebsite(url: string): Promise<string> {
	const browser = await connect({
		browserWSEndpoint: process.env.BROWSER_WS_URL!,
	});

	const page = await browser.newPage();

	try {
		const response = await page.goto(url, {
			timeout: 30000,
			waitUntil: "load",
		});

		if (!response?.ok()) {
			return `Response not ok. Status ${response?.status()}.`;
		}

		await page.waitForSelector("body");

		const visibleTextWithLinks = await page.evaluate(() => {
			// Function to determine if an element is visible
			function isVisible(element: HTMLElement): boolean {
				const style = globalThis.getComputedStyle(element);
				return (
					style.display !== "none" &&
					style.visibility !== "hidden" &&
					style.opacity !== "0" &&
					element.offsetWidth > 0 &&
					element.offsetHeight > 0
				);
			}

			// Remove non-visible elements that might interfere with text extraction
			const elementsToRemove = document.querySelectorAll(
				"script, style, header, footer, nav, .ad, .popup, .hidden"
			);
			elementsToRemove.forEach((el) => el.remove());

			// Traverse the document and collect visible text and links
			const walker = document.createTreeWalker(
				document.body,
				NodeFilter.SHOW_TEXT,
				null
			);
			let node: Text | null;
			const textWithLinks: string[] = [];

			while ((node = walker.nextNode() as Text | null)) {
				const parentElement = node.parentElement;
				if (parentElement && isVisible(parentElement)) {
					const textContent = node.textContent?.trim();
					if (textContent) {
						if (parentElement.tagName.toLowerCase() === "a") {
							const href = (parentElement as HTMLAnchorElement)
								.href;
							textWithLinks.push(`[${textContent}](${href})`);
						} else {
							textWithLinks.push(textContent);
						}
					}
				}
			}

			return textWithLinks.join("\n");
		});

		return visibleTextWithLinks;
	} catch (error) {
		console.error("Error scraping website:", error);
		return "Error occurred during scraping.";
	} finally {
		await browser.close();
	}
}

export async function execute(interaction: ChatInputCommandInteraction) {
	const client = interaction.client as ClientExtended;

	const ollama = client.ollama;

	await interaction.deferReply();

	const message = interaction.options.getString("message", true); // Get the message content

	const attachments =
		interaction.options.data
			.filter(
				(option) =>
					option.type === ApplicationCommandOptionType.Attachment
			)
			.map((option) => option.attachment!) || []; // Get the attachment objects

	// Loop through each attachment and process it
	const attachmentContents: string[] = [];
	const attachmentURLs: Uint8Array[] = [];

	for (const attachment of attachments) {
		try {
			const response = await fetch(attachment.url); // Fetch the attachment

			if (!response.ok) {
				console.error(
					`Failed to fetch attachment: ${response.status} ${response.statusText}`
				);
				continue;
			}

			const contentType = attachment.contentType; // Get the content type

			// Check if the content type is text
			if (
				contentType &&
				(contentType.includes("text") ||
					contentType.includes("; charset=utf-8"))
			) {
				const text = await response.text(); // Read the text content
				attachmentContents.push(text.normalize().trim()); // Add the text content to the array
			} else if (
				contentType &&
				contentType.includes(
					"image"
				) /*|| contentType.includes("video")*/
			) {
				const image = await convertBlobToUint8Array(
					await response.blob()
				);

				attachmentURLs.push(image);
			}
		} catch (error) {
			console.error("Error processing attachment:", error);
		}
	}

	// Step 3: Create the prefix string
	const textPrefix: string = "\n\nText Attachments:\n\n";
	const imagePrefix: string =
		"\n\nImage attachments (please use your imageask tool call to describe it):\n\n";

	// Step 4: Initialize newMessage with the original message
	let newMessage: string = message;

	// Step 5: Check if there are attachments before appending
	if (attachmentContents.length > 0) {
		// If there are attachments
		const attachmentsString: string = attachmentContents.join("\n\n"); // Join the attachment contents
		newMessage += textPrefix + attachmentsString; // Append prefix and attachments to the message
	}

	const chatData = (await getData(client, "textgen", {
		userid: interaction.user.id,
	})) as ChatData[];

	let user_data: ChatData;

	if (chatData.length > 0) {
		user_data = chatData[0];
	} else {
		user_data = {
			_id: new ObjectId(),
			userid: interaction.user.id,
			messages: [
				{
					role: "system",
					content:
						"You are RoTunes, a helpful AI powered discord bot made by the Rodevs. You are here to help people with their problems (more specifically roblox issues). Your own website is https://www.rodevs.com/. Please make sure to use your tools and function calls whenever useful. You can search the internet, scrape websites, and execute luau (Roblox) code.",
				},
			],
			images: [],
		};
	}

	if (attachmentURLs.length > 0) {
		const attachmentsURLsNames: string[] = [];

		for (
			let i = 0;
			i != attachmentURLs.length + user_data.images.length;
			i++
		) {
			attachmentsURLsNames.push(`image${i}`);
		}

		const attachmentURLsString = attachmentsURLsNames.join(", ");
		newMessage += imagePrefix + attachmentURLsString;

		user_data.images.push(...attachmentURLs);
	}

	// Step 4: Push structuredContent into user_data.messages
	const newMessageJson: Message = {
		role: "user",
		content: newMessage,
	};

	user_data.messages.push(newMessageJson);

	if (await verifySafeChat(client, user_data.messages)) {
		throw new UserMadeError(
			"The messages in this chat seem to be inappropriate. Please try a different prompt or execute /chatreset"
		);
	}

	const request: ChatRequest = {
		model: "qwen2.5:14b",
		messages: user_data.messages,
		tools: [
			{
				type: "function",
				function: {
					name: "eval",
					description: "Execute luau (Roblox) code.",
					parameters: {
						type: "object",
						properties: {
							code: {
								type: "string",
								description:
									"The code to execute. Make sure to use print() or return to output data.",
							},
						},
						required: ["code"],
					},
				},
			},
			{
				type: "function",
				function: {
					name: "search",
					description: "Search on Google.",
					parameters: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "The search query.",
							},
						},
						required: ["query"],
					},
				},
			},
			{
				type: "function",
				function: {
					name: "scrape",
					description: "Scrape a website.",
					parameters: {
						type: "object",
						properties: {
							url: {
								type: "string",
								description:
									"The URL of the website to scrape.",
							},
						},
						required: ["url"],
					},
				},
			},
			{
				type: "function",
				function: {
					name: "imageask",
					description:
						"Answers a question about an image provided to you.",
					parameters: {
						type: "object",
						properties: {
							image: {
								type: "string",
								description: "The name of the image.",
							},
							question: {
								type: "string",
								description: "The question you want to ask.",
							},
						},
						required: ["image", "question"],
					},
				},
			},
		],
	};

	async function askAboutImage(
		image: string,
		question: string
	): Promise<string> {
		return await imageAsk(client, image, user_data.images, question);
	}

	const functions = {
		scrape: scrapeWebsite,
		eval: executeEval,
		search: searchGoogle,
		imageask: askAboutImage,
	};

	const { full_response, chat_response } = await chatWithFuncs(
		ollama,
		request,
		functions
	);

	user_data.messages = full_response;

	if (await verifySafeChat(client, user_data.messages)) {
		throw new UserMadeError(
			"The messages in this chat seem to be inappropriate. Please try a different prompt or execute /chatreset"
		);
	}

	await setData(client, "textgen", user_data);

	for (const chunk of splitText(chat_response.message.content, 4000)) {
		await interaction.followUp({
			embeds: [
				new EmbedBuilder()
					.setAuthor({
						name:
							client.application!.name ||
							client.user!.globalName ||
							client.user!.username,
						iconURL:
							client.application!.iconURL() ||
							client.application!.coverURL() ||
							client.user!.avatarURL() ||
							client.user!.defaultAvatarURL,
						url: client.application!.customInstallURL || undefined,
					})
					.setTitle("Response")
					.setDescription(chunk)
					.setTimestamp(Date.now())
					.setFooter({
						iconURL:
							interaction.user.avatarURL() ||
							interaction.user.defaultAvatarURL,
						text:
							interaction.user.globalName ||
							interaction.user.username,
					})
					.setColor(0x9a2d7d),
			],
			allowedMentions: { parse: [] },
		});
	}
}
