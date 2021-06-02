import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import config from "../../data/config.json"
import { sendMessage } from "../../utils/Utils"

export default class Eval extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Hidden",
            help: "Evaluate stuff. Tibi only.",
            usage: "eval [code]",
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (config.admins[0] !== message.author.id) return sendMessage(message, "Admins only")

        try {
            const result = await eval(args.join(" "))
            if (result === undefined)
                return this.format(message, "undefined")
            if (result === null)
                return this.format(message, "null")
            return this.format(message, JSON
                .stringify(result, null, 2)
                .substring(0, 1900)
                .replace(
                    new RegExp(client.token?.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&") ?? "", "gi"),
                    ""
                ))
        } catch (error) {
            return sendMessage(message, `${error.name}: ${error.message}`)
        }
    }

    async format(message: Message, obj: unknown): Promise<Message | Message[]> {
        return sendMessage(message, `\`\`\`json\n${obj}\`\`\``)
    }
}
