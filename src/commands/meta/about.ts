import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { sendMessage } from "../../utils/Utils"

export default class About extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Meta",
            help: "Bot credits",
            usage: "credits",
            aliases: ["credits", "invite", "support"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        const me = (await client.users.fetch("127393188729192448")).tag
        return sendMessage(message, `This is an open-source bot created by @${me}. The source-code is available on GitHub: <https://github.com/Tibowl/HuTao>.
Data is compiled from a variety of sources (including but not limited to official forum posts/e-mails/videos/posts elsewhere and Genshin Impact Wiki <https://genshin-impact.fandom.com/wiki/Genshin_Impact_Wiki>).
© All rights reserved by miHoYo. Other properties belong to their respective owners.

You can invite this bot with <https://discord.com/api/oauth2/authorize?client_id=826550363355086918&scope=bot&permissions=319552>.

Feel free to contact me in case there's an error/need support/got a suggestion via <https://discord.gg/BM3Srp8j8G> or via GitHub issues (link above).`)
    }
}
