import { ChatInputCommandInteraction, Message } from "discord.js"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


export default class TestGuideCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            usage: "emojidump",
            help: "Dump emoji data for config.",
            aliases: [],
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
        const entries = source.guild?.emojis.cache.entries()
        if (!entries)
            return undefined

        let a = ""
        for (const entry of  [...entries].sort((a, b) => a[0].localeCompare(b[0]))) {
            const line = `"${entry[1].name?.replace(/_/g, " ")}": "<:${entry[1].name}:${entry[0]}>",\n`
            if (a.length + line.length > 1900) {
                await sendMessage(source, "```\n" + a + "```")
                a = ""
            }
            a+= line
        }

        return await sendMessage(source, "```\n" + a + "```")
    }
}
