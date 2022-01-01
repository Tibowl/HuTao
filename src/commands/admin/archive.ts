import { CommandInteraction, Message } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


const Logger = log4js.getLogger("archive")

export default class Archive extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Archives the current thread, can only be used in own Discord. Bot developer only.",
            usage: "archive",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
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
        Logger.info(`Archiving ${channel.id} (${name}) for ${id} in ${channel.guildId} (${channel.guild.name})`)
        await channel.setName(`[ADDED] ${name}`)
        await channel.setArchived(true)

        const starter = await channel.fetchStarterMessage()
        if (starter) {
            await starter.react("✅")
            if (starter.pinned)
                await starter.unpin()
        }
    }
}
