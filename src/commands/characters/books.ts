import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"

export default class Books extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            help: "List talent book days.",
            usage: "books",
            aliases: ["talent", "talents", "talentbook", "tb", "t", "b"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        const { data } = client

        const books = {
            "Monday & Thursday": ["Freedom", "Prosperity"],
            "Tuesday & Friday": ["Resistance", "Diligence"],
            "Wednesday & Saturday": ["Ballad", "Gold"],
        }

        return message.channel.send(`**Talent Books**:
${Object.entries(books).map(([day, books]) => `**${day}**: ${books.map(book => `${data.emoji(`Guide to ${book}`)} ${book}`).join(" / ")}`).join("\n")}
**Sunday**: All books are available`)
    }
}
