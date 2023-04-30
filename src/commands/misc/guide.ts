import { ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, Guide, SendMessage } from "../../utils/Types"
import { Colors, findFuzzy, findFuzzyBestCandidates, getLink, sendMessage, simplePaginator, urlify } from "../../utils/Utils"


export default class GuideCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            usage: "guide [name]",
            help: `Show a guide. Currently working on adding more!

You can view a list of guides with \`${config.prefix}guide\`.
To view a specific guide you can use \`${config.prefix}guide <name>\`.

Note: this command supports fuzzy search.`,
            aliases: ["g", "route", "guides"],
            options: [{
                name: "guide",
                description: "Name of the guide",
                type: ApplicationCommandOptionType.String,
                required: false,
                autocomplete: true
            }]
        })
    }
    targetNames = [...client.data.guides.map(g => g.name), ...client.data.guides.flatMap(g => g.pages.map(p => p.name))].filter((v, i, arr) => arr.indexOf(v) == i)

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                ...this.targetNames.filter((_, i) => i < 20).map(value => {
                    return { name: value, value }
                })
            ])
        }

        await source.respond(findFuzzyBestCandidates(this.targetNames, search, 20).map(value => {
            return { name: value, value }
        }))
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source
        const query = options.getString("guide") ?? ""

        if (query == "")
            return this.runList(source)

        return this.runSearch(source, query)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length == 0)
            return this.runList(source)

        return this.runSearch(source, args.join(" "))
    }

    async runList(source: CommandSource): Promise<SendMessage | undefined> {
        const pages = this.getGuides()

        if (pages.length == 0) return sendMessage(source, "No guides loaded")

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getGuidesPage(pages, relativePage, currentPage, maxPages), pages.length)
        return undefined
    }

    async runSearch(source: CommandSource, query: string): Promise<SendMessage | undefined> {
        const { guides } = client.data

        const result = findFuzzy(this.targetNames, query)
        const guide = guides.find(g => g.name == result) ?? guides.find(g => g.pages.some(p => p.name == result))

        if (!guide)
            return sendMessage(source, "Unable to find a guide with that term")

        const startPage = guide.name == result ? 0 : guide.pages.findIndex(p => p.name == result)

        await simplePaginator(source, (relativePage, currentPage, maxPages) => getGuidePage(guide, relativePage, currentPage, maxPages), guide.pages.length, startPage)
        return undefined
    }

    getGuides(): string[] {
        const { data } = client
        const guides = data.guides
            .map((guide) => `[**${guide.name}**](${data.baseURL}guides/${urlify(guide.name, false)}):
${guide.pages.map(p => `- ${p.url ? `[${p.name}](${p.url})` : p.name}`).join("\n")}`)

        const pages: string[] = [`**List of categories:**
${data.guides.map((guide) => `- *${guide.name}*: ${guide.pages.length} ${guide.pages.length == 1 ? "guide" : "guides"}`).join("\n")}`]

        let paging = "", c = 0
        for (const guide of guides) {
            if (paging.length + guide.length > 1900 || c > 20) {
                pages.push(paging.trim())
                paging = guide
                c = paging.split("\n").length
            } else {
                paging += "\n" + guide
                c += paging.split("\n").length
            }
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getGuidesPage(pages: string[], relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new EmbedBuilder()
            .setTitle("Guides")
            .setURL(`${client.data.baseURL}guides`)
            .setDescription(pages[relativePage])
            .setFooter({ text: `Page ${currentPage} / ${maxPages} - Use '${config.prefix}guide <name>' to view a guide` })
            .setColor(Colors.GREEN)

        return embed
    }
}

export function getGuidePage(guide: Guide, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
    if (relativePage >= guide.pages.length)
        return undefined

    const { data } = client
    const page = guide.pages[relativePage]

    const embed = new EmbedBuilder()
        .setTitle(page.name)
        .setURL(`${data.baseURL}guides/${urlify(guide.name, false)}/${urlify(page.name, true)}`)
        .setColor(Colors.GREEN)

    if (maxPages > 1)
        embed.setFooter({ text: `Page ${currentPage} / ${maxPages} - ${guide.name}` })
    else if (guide.name !== page.name)
        embed.setFooter({ text: guide.name })

    if (page.desc)
        embed.setDescription(page.desc.replace(/\${(.*?)}/g, (_, name) => data.emoji(name)) +
            (page.url ? `\n\n[View video](${page.url})` : "")
        )

    if (page.img)
        embed.setImage(getLink(page.img))

    return embed
}
