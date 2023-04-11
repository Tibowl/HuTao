import { ChatInputCommandInteraction, Message } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


const Logger = log4js.getLogger("ready")

export default class ReadyCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Readies the current thread, can only be used in own Discord. Bot developer only.",
            usage: "ready",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id)
    }

    async run(source: CommandSource, id: string): Promise<SendMessage | undefined> {
        if (!config.admins.includes(id))
            return sendMessage(source, "This command is only for the bot developer", undefined, true)

        const channel = source.channel
        await channel?.fetch()

        if (!(channel?.isThread() && channel.parentId && config.allowedArchive.includes(channel.parentId)))
            return sendMessage(source, "This command can not be used here.", undefined, true)

        const name = channel.name.replace(/\[.*\]/, "").trim()
        Logger.info(`Readying ${channel.id} (${name}) for ${id} in ${channel.guildId} (${channel.guild.name})`)

        await channel.setName(`[READY] ${name}`)
        await channel.send({
            content: `${(await client.users.fetch("127393188729192448"))} this thread is ready.`,
            allowedMentions: {
                users: ["127393188729192448"]
            }
        })
    }
}
