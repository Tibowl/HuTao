import { AutocompleteInteraction, CommandInteraction, Message } from "discord.js"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage, simplePaginator } from "../../utils/Utils"
import { getGuidePage } from "../misc/guide"


export default class TestGuideCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            usage: "testguide <json>",
            help: "Test a guide.",
            aliases: ["tg"],
            options: [{
                name: "data",
                description: "Data of the guide",
                type: "STRING",
                required: true
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        await source.respond([])
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source
        return this.run(source, options.getString("data", true))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length == 0)
            return this.sendHelp(source)

        return this.run(source, args.join(" "))
    }

    async run(source: CommandSource, query: string): Promise<SendMessage | undefined> {
        query = query.replace(/^[^{]+/, "").replace(/[^}]+$/, "")
        const guide = JSON.parse(query)

        if (!guide)
            return sendMessage(source, "Unable to find a guide with that term")

        await simplePaginator(source, (relativePage, currentPage, maxPages) => getGuidePage(guide, relativePage, currentPage, maxPages), guide.pages.length)
        return undefined
    }
}
