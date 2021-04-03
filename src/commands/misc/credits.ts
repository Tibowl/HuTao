import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"

export default class Credits extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: "Bot credits",
            usage: "credits",
            aliases: ["about"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        return message.channel.send(`This is an open-source bot created by @${(await client.users.fetch("127393188729192448")).tag}. The source-code is available on GitHub: <https://github.com/Tibowl/HuTao>.

Data is compiled from a vareity of sources by `)
    }
}
