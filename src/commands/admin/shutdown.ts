import { Message, MessageReaction } from "discord.js"
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
            aliases: ["exit"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        if (!config.admins.includes(message.author.id)) return message.reply("Admins only")

        Logger.info(`Shutting down by ${message.author.id}`)
        let toRemove: (Promise<MessageReaction> | undefined)[] = []

        const user = client.user
        if (user != undefined) {
            await user.setStatus("dnd")

            toRemove = client.recentMessages
                .map(reply => reply?.reactions?.cache.map((reaction) => reaction.me ? reaction.users.remove(user) : undefined).find(k => k))
                .filter(k => k)
        }
        const reply = await message.reply(`Shutting down after cleanup. ${toRemove.length ? `Removing ${toRemove.length} reactions...` : ""}`)

        try {
            await Promise.all(toRemove)
            await reply.edit("poof")
        } catch (error) {
            await reply.edit("poof, some reactions not removed")
        }
        await client.destroy()
        process.exit()
        return reply
    }
}
