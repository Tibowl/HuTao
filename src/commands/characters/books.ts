import { CommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { sendMessage } from "../../utils/Utils"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class Books extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            help: "List talent book days.",
            usage: "books",
            aliases: ["talent", "talents", "talentbook", "tb", "t", "b"],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        const { data } = client

        const books = {
            "Monday & Thursday": ["Freedom", "Prosperity", "Transience"],
            "Tuesday & Friday": ["Resistance", "Diligence", "Elegance"],
            "Wednesday & Saturday": ["Ballad", "Gold", "Light"],
        }

        return sendMessage(source, `**Talent Books**:
${Object.entries(books).map(([day, books]) => `**${day}**: ${books.map(book => `${data.emoji(`Guide to ${book}`)} ${book}`).join(" / ")}`).join("\n")}
**Sunday**: All books are available`)
    }
}
