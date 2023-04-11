import { ChatInputCommandInteraction, Message } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { isMessage, sendMessage } from "../../utils/Utils"


const Logger = log4js.getLogger("shutdown")

export default class Shutdown extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Kills bot. Bot developer only.",
            usage: "shutdown",
            aliases: ["exit", "restart"],
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
        if (!config.admins.includes(id)) return sendMessage(source, "This command is only for the bot developer", undefined, true)

        Logger.info(`Shutting down by ${id}`)
        let toRemove: (Promise<unknown> | undefined)[] = []

        const user = client.user
        if (user != undefined) {
            toRemove = client.recentMessages
                .map(async (reply) => {
                    try {
                        if (reply.components.length > 0 && reply.editable)
                            return reply.edit({ components: [] })
                    } catch (e) {
                        Logger.error(e)
                    }
                })
                .flat()
        }
        const reply = await sendMessage(source, `Shutting down after cleanup. ${toRemove.length ? `Removing ${toRemove.length} buttons...` : ""}`, [], true)
        try {
            const settled = await Promise.allSettled(toRemove)

            const response = settled.some(s => s.status == "rejected") ? "poof, some buttons not removed" : "poof"
            if (isMessage(reply) && isMessage(source))
                await reply.edit(response)
            else if (!isMessage(source))
                await source.followUp({ content: response, ephemeral: true })
        } catch (error) {
            if (isMessage(reply) && isMessage(source))
                await reply.edit("poof, some buttons not removed")
            else if (!isMessage(source))
                await source.followUp({ content: "poof, some buttons not removed", ephemeral: true })
        }
        await client.destroy()
        process.exit()
    }
}
