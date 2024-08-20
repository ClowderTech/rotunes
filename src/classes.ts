import { Client, Collection, SlashCommandBuilder } from "discord.js";
import type { Manager } from "moonlink.js";

export interface Command {
    data: SlashCommandBuilder;
    execute: Function
}

export interface ClientExtended extends Client {
    commands: Collection<string, Command>;
    moonlink: Manager;
}

export class UserMadeError extends Error {
    constructor(message: string) {
        super(message);

        this.name = this.constructor.name;

        Error.captureStackTrace(this, this.constructor);

        Object.setPrototypeOf(this, UserMadeError.prototype);

        this.message = message;

        this.stack = this.stack;

        this.name = "UserMadeError";
    }
}