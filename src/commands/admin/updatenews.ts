import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, Cover, NewsLang, SendMessage } from "../../utils/Types"
import { Colors, findFuzzy, sendMessage } from "../../utils/Utils"


export default class UpdateNews extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            usage: "updatenews [language] <id>",
            shortHelp: "Update a news post.",
            help: `Update a news post.
Supported languages: ${client.newsManager.getLanguages().map(l => `\`${l}\``).join(", ")}`,
            aliases: [],
            options: []
        })
    }


    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return sendMessage(source, "Slash command not supported")
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

            const embed = new MessageEmbed()
                .setColor(Colors.GREEN)
                .setTitle(`Most recent ${newsManager.getLanguageName(lang)} news articles:`)
                .setFooter(`You can use open the links or use \`${config.prefix}news <post id>\` to view more details about a post`)
                .setDescription(stored.join("\n"))

            return sendMessage(source, embed)
        }

        const post = newsManager.getNewsByIdLang(id, lang)
        if (!post)
            return sendMessage(source, `Couldn't find article in cache. Try to see if it exists on the forum: <https://www.hoyolab.com/article/${id}>`)

        await newsManager.fetchPost({
            image_list: JSON.parse(post.image_url) as Cover[],
            post: {
                content: post.content,
                created_at: post.created_at,
                post_id: post.post_id,
                subject: post.subject
            },
            user: {
                nickname: post.nickname
            }
        }, lang, post.type)


        return sendMessage(source, "Updated!")
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
