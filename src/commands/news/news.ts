import { ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js"

import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, NewsLang, SendMessage } from "../../utils/Types"
import { Colors, findFuzzy, findFuzzyBestCandidatesForAutocomplete, getNewsEmbed, parseNewsContent, sendMessage, simplePaginator } from "../../utils/Utils"

export default class News extends Command {
    constructor(name: string) {
        super({
            name,
            category: "News",
            usage: "news [language] [id]",
            shortHelp: "Check up on latest news. You can follow them using the follow command",
            help: `Check up on latest news. You can follow the English ones with \`${config.prefix}follow add news_en-us\` (see \`${config.prefix}help follow\` for the others)
Supported languages: ${client.newsManager.getLanguages().map(l => `\`${l}\``).join(", ")}`,
            aliases: ["new", "n"],
            options: [{
                name: "id",
                description: "ID of the article",
                type: ApplicationCommandOptionType.Number,
            }, {
                name: "lang",
                description: "Language of the article (default: en-us)",
                type: ApplicationCommandOptionType.String,
                autocomplete: true
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = [
            ...client.newsManager.getLanguages(),
            ...client.newsManager.getLanguages().map(l => client.newsManager.getLanguageName(l))
        ]
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                ...targetNames.filter((_, i) => i < 20).map(value => {
                    return { name: value, value }
                })
            ])
        }

        await source.respond(findFuzzyBestCandidatesForAutocomplete(targetNames, search, 20).map(value => {
            return { name: value, value }
        }))
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const id = options.getNumber("id")
        const lang = options.getString("lang")

        return this.run(source, id?.toString(), lang)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        let idMatch = args[0], langMatch = "en-us"
        if (args[0]?.match(/^\d+/)) {
            idMatch = args[0]
            langMatch = args[1]
        } else {
            idMatch = args[1]
            langMatch = args[0]
        }

        return this.run(source, idMatch, langMatch)
    }

    async run(source: CommandSource, id?: string | null, langMatch?: string | null): Promise<SendMessage | undefined> {
        const { newsManager } = client

        const lang = this.getFuzzyLang(langMatch ?? "en-us")

        if (!id) {
            const stored = newsManager
                .getNews(lang)
                .map(art => `[\`${art.post_id}\`](${art.lang == "bbs-zh-cn" ? `https://bbs.mihoyo.com/ys/article/${art.post_id}` : `https://www.hoyolab.com/article/${art.post_id}`}): ${art.subject}`)

            while (stored.join("\n").length > 1500) stored.pop()

            const embed = new EmbedBuilder()
                .setColor(Colors.GREEN)
                .setTitle(`Most recent ${newsManager.getLanguageName(lang)} news articles:`)
                .setFooter({ text: `You can use open the links or use \`${config.prefix}news <post id>\` to view more details about a post` })
                .setDescription(stored.join("\n"))

            return sendMessage(source, embed)
        }

        const post = newsManager.getNewsByIdLang(id, lang)
        if (!post)
            return sendMessage(source, `Couldn't find article in cache. Try to see if it exists on the forum: <https://www.hoyolab.com/article/${id}>`)

        await simplePaginator(source, (relativePage, currentPage, maxPages) => getNewsEmbed(post, relativePage, currentPage, maxPages), parseNewsContent(post.content).length)

        return undefined
    }

    getFuzzyLang(search: string): NewsLang {
        const { newsManager } = client

        let lang = findFuzzy([
            ...newsManager.getLanguages(),
            ...newsManager.getLanguages().map(l => newsManager.getLanguageName(l))
        ], search ?? "en-us") ?? "en-us"

        for (const l of newsManager.getLanguages())
            if (lang == newsManager.getLanguageName(l)) {
                lang = l
                break
            }

        return lang as NewsLang
    }
}
