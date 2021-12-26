import { CommandInteraction, Message } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import Command from "../../utils/Command"
import { SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


const Logger = log4js.getLogger("thread")

export default class ThreadCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Create a new thread, can only be used in own Discord. Bot developer only.",
            usage: "thread <name>",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return sendMessage(source, "Slash command not supported")

    }
    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        const id = source.author.id
        let name = args.join(" ")

        if (!config.admins.includes(id))
            return sendMessage(source, "This command is only for the bot developer", undefined, true)

        const channel = source.channel
        await channel?.fetch()

        if (!(channel?.isText() && channel.type == "GUILD_TEXT" && channel.id && config.allowedArchive.includes(channel.id)))
            return sendMessage(source, "This command can not be used here.", undefined, true)

        const matched = name.match(/^\[(.*)\]/)
        const type = matched ? matched[1] : "WIP"
        name = `[${type}] ${name}`

        Logger.info(`Creating thread ${name} for ${id} in ${channel.id} (${channel.guild.name})`)
        await source.startThread({
            name,
            autoArchiveDuration: "MAX"
        })
    }
}
