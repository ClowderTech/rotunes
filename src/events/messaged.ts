import { Events, Message } from "discord.js";

export const eventType: Events = Events.MessageCreate;

export const once = false;

export function execute(message: Message) {
	if (message.author.bot) return;
}
