import { Client, Collection, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { MongoClient } from "mongodb";
import type { MoonlinkManager } from "moonlink.js";
import type { Ollama } from "ollama";

export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => void
}

export interface ClientExtended extends Client {
    commands: Collection<string, Command>;
    mongoclient: MongoClient;
    ollama: Ollama;
    moonlink: MoonlinkManager;
}

export class UserMadeError extends Error {
    constructor(message: string) {
        super(message);

        this.name = this.constructor.name;

        Error.captureStackTrace(this, this.constructor);

        Object.setPrototypeOf(this, UserMadeError.prototype);

        this.message = message;

        this.name = "UserMadeError";
    }
}