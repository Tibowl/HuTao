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
        const { materials } = data

        const allBooks = Object.values(materials)
            .filter(x => x.type == "Talent Level-Up Material" && x.stars == 3)

        const days = [
            ["Monday & Thursday", "Monday/Thursday/Sunday"],
            ["Tuesday & Friday", "Tuesday/Friday/Sunday"],
            ["Wednesday & Saturday", "Wednesday/Saturday/Sunday"]
        ].map(([days, source]) => {
            const books = allBooks.filter(b => b.sources?.some(s => s.endsWith(`(${source})`))).map(b => b.name)
            return { days, books }
        })

        return sendMessage(source, `**Talent Books**:
${days.map(({ days, books }) => `**${days}**: ${books.map(book => `${data.emoji(book)} ${book.split(" ").pop()}`).join(" / ")}`).join("\n")}
**Sunday**: All books are available`)
    }
}
