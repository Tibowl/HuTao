import { ApplicationCommandOptionData, AutocompleteInteraction, ChatInputCommandInteraction, Message } from "discord.js"

import config from "../data/config.json"
import { CommandResponse, CommandSource, SendMessage } from "./Types"
import { sendMessage } from "./Utils"

export type CommandCategory = "Character" | "Weapons" | "Artifact" | "News" | "Misc" | "Meta" | "Admin" | "Hidden"
export interface CommandOptions {
    name: string
    aliases?: string[]
    help: string
    shortHelp?: string
    usage: false | string
    category: CommandCategory
    options: ApplicationCommandOptionData[]
}

export default abstract class Command {
    public readonly commandName: string
    public readonly aliases: string[]
    public readonly usage: string | false
    public readonly help: string
    public readonly shortHelp?: string
    public readonly category: CommandCategory
    public readonly options: ApplicationCommandOptionData[]

    protected constructor(options: CommandOptions) {
        this.commandName = options.name
        this.aliases = options.aliases ?? []
        this.usage = options.usage
        this.help = options.help
        this.category = options.category
        this.shortHelp = options.shortHelp
        this.options = options.options
    }

    abstract runInteraction(source: ChatInputCommandInteraction, command: string): CommandResponse
    abstract runMessage(source: Message, args: string[], command: string): CommandResponse
    async autocomplete(source: AutocompleteInteraction, _command: string): Promise<void> {
        await source.respond([{
            name: source.options.getFocused().toString() || "Empty",
            value: source.options.getFocused()
        }])
    }

    async sendHelp(source: CommandSource): Promise<SendMessage | undefined> {
        return sendMessage(source, `Usage: \`${this.usage}\`
See \`${config.prefix}help ${this.commandName}\` for more info`, undefined, true)
    }
}
