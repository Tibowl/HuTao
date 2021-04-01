import { Message } from "discord.js"

import Command from "../../utils/Command"

export default class Invite extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: "Get a link to the invite URL",
            usage: "invite"
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        return message.channel.send("You can invite this bot with <https://discord.com/api/oauth2/authorize?client_id=826550363355086918&scope=bot&permissions=319552>")
    }
}
