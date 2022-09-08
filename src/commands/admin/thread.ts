import { CommandInteraction, Message, Snowflake } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
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
            options: [{
                name: "name",
                description: "Name of thread",
                type: "STRING",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id, source.options.getString("name", true))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id, args.join(" "))
    }

    async run(source: CommandSource, id: Snowflake, name: string): Promise<SendMessage | undefined> {
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
        const msg = await channel.send({ content: `<@${id}>: ${name}` })
        await msg.startThread({
            name,
            autoArchiveDuration: "MAX"
        })

        if (msg.pinnable)
            await msg.pin()

        return sendMessage(source, "Done!", undefined, true)
    }
}
