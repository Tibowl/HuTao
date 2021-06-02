import { Message } from "discord.js"
import log4js from "log4js"

import Command from "../../utils/Command"
import client from "../../main"
import config from "../../data/config.json"

const Logger = log4js.getLogger("shutdown")

export default class Shutdown extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Kills bot. Admins only.",
            usage: "shutdown",
            aliases: ["exit", "restart"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        if (!config.admins.includes(message.author.id)) return message.reply("Admins only")

        Logger.info(`Shutting down by ${message.author.id}`)
        let toRemove: (Promise<unknown> | undefined)[] = []

        const user = client.user
        if (user != undefined) {
            await user.setStatus("dnd")

            toRemove = client.recentMessages
                .map(async (reply) => {
                    try {
                        if (reply.components.length > 0)
                            return reply.edit(reply.content, { components: [] })
                        else
                            return reply.reactions.removeAll()
                    } catch (error) {
                        return reply?.reactions?.cache.map((reaction) => client.user && reaction.users.cache.has(client.user.id) ? reaction.users.remove(user) : undefined).filter(k => k)
                    }
                })
                .flat()
        }
        const reply = await message.reply(`Shutting down after cleanup. ${toRemove.length ? `Removing ${toRemove.length} reactions...` : ""}`)

        try {
            const settled = await Promise.allSettled(toRemove)
            if (settled.some(s => s.status == "rejected"))
                await reply.edit("poof, some reactions not removed")
            else
                await reply.edit("poof")
        } catch (error) {
            await reply.edit("poof, some reactions not removed")
        }
        await client.destroy()
        process.exit()
        return reply
    }
}
