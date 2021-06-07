import { Message } from "discord.js"

import Command from "../../utils/Command"
import log4js from "log4js"
import client from "../../main"
import config from "../../data/config.json"
import { sendMessage } from "../../utils/Utils"

const Logger = log4js.getLogger("avatar")

export default class Avatar extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Sets avatar. Admins only.",
            usage: "avatar <URL>",
            aliases: ["setavatar"],
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (!config.admins.includes(message.author.id)) return sendMessage(message, "Admins only")

        const found = message.attachments?.find(k => !!k.url)
        let url
        if (args && args.length > 0 && (args[0].startsWith("http") || args[0].startsWith("<http")))
            url = args[0].replace(/^</, "").replace(/>$/, "")
        else if (found)
            url = found.url

        if (url == undefined) return sendMessage(message, "No link found")

        try {
            await client.user?.setAvatar(url)
            Logger.info(`Updated avatar to ${url} by ${message.author.id}`)
            return sendMessage(message, "Success!")
        } catch (err) {
            Logger.error(err)
            return sendMessage(message, "Failed")
        }
    }
}
