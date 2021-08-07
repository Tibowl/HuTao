import Discord, { Message } from "discord.js"
import config from "../data/config.json"
import { sendMessage } from "./Utils"

export type CommandCategory = "Character" | "Weapons" | "Artifact" | "News" | "Misc" | "Meta" | "Admin" | "Hidden"
export interface CommandOptions {
    name: string
    help: string
    usage: false | string
    category: CommandCategory
    aliases?: string[]
}

export default abstract class Command {
    public readonly commandName: string
    public readonly aliases: string[]
    public readonly usage: string | false
    public readonly help: string
    public readonly category: CommandCategory

    protected constructor(options: CommandOptions) {
        this.commandName = options.name
        this.aliases = options.aliases ?? []
        this.usage = options.usage
        this.help = options.help
        this.category = options.category
    }

    abstract run(message: Discord.Message, args: string[], command: string): Promise<Discord.Message | Discord.Message[] | undefined> | undefined

    async sendHelp(message: Discord.Message): Promise<Message | Message[]> {
        return sendMessage(message, `Usage: \`${this.usage}\`
See \`${config.prefix}help ${this.commandName}\` for more info`)
    }
}
