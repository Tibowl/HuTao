import { ChatInputCommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { getServerTimeInfo, sendMessage } from "../../utils/Utils"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class PaimonsBargains extends Command {
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: "Look up rotation of Paimon's Bargains.",
            usage: "paimonsbargains",
            aliases: ["pb", "paimon", "paimonshop", "pshop", "shop"],
            options: []
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        const { data } = client
        const { paimonsBargains } = data

        const serverTimes = getServerTimeInfo()
        const currentMonths = serverTimes.map(st => st.time.getMonth())

        let bargains = "**Paimon's Bargains**:\n"
        for (let i = 0; i < paimonsBargains.length; i++) {
            const shop = paimonsBargains[i]
            const shopStuff = `**${data.emoji(shop.weapon, true)}** Series / ${shop.char.map(char => `**${data.emoji(char, true)}**`).join(" / ")}`

            if (currentMonths.some(mo => mo == i))
                bargains += `**\`${this.months[i]}\`**\`${this.months[i + 6]}\`: ${shopStuff}\n`
            else if (currentMonths.some(mo => mo == i + 6))
                bargains += `\`${this.months[i]}\`**\`${this.months[i + 6]}\`**: ${shopStuff}\n`
            else
                bargains += `\`${this.months[i]}\`\u200B\`${this.months[i + 6]}\`: ${shopStuff}\n`
        }

        return sendMessage(source, bargains)
    }
}
