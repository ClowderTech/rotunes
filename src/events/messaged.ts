import { Events, Message } from "discord.js";

const eventType: Events = Events.MessageCreate;

const once = false;

async function execute(message: Message) {
    if (message.content.startsWith(`<@${message.client.user.id}>`)) {
        await message.reply({content: "I can now only use slash commands to execute commands."})
    }
}

export {
    eventType,
    once,
    execute
}