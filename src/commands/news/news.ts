import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { Colors, findFuzzy, getNewsEmbed, paginator } from "../../utils/Utils"
import config from "../../data/config.json"

export default class News extends Command {
    constructor(name: string) {
        super({
            name,
            category: "News",
            usage: "news [language or id]",
            help: `Check up on latest news. You can follow the English ones with \`${config.prefix}follow add news_en-us\`
Supported languages: ${client.newsManager.getLanguages().map(l => `\`${l}\``).join(", ")}`,
            aliases: ["new", "n"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { newsManager } = client

        if (args.length == 0 || !args[0].match(/^\d+/)) {
            let lang = findFuzzy([
                ...newsManager.getLanguages(),
                ...newsManager.getLanguages().map(l => newsManager.getLanguageName(l))
            ], args[0] ?? "en-us") ?? "en-us"

            for (const l of newsManager.getLanguages())
                if (lang == newsManager.getLanguageName(l)) {
                    lang = l
                    break
                }

            const stored = newsManager
                .getNews(lang)
                .map(art => `[\`${art.post_id}\`](${art.lang == "bbs-zh-cn" ? `https://bbs.mihoyo.com/ys/article/${art.post_id}` : `https://www.hoyolab.com/genshin/article/${art.post_id}`}): ${art.subject}`)

            while (stored.join("\n").length > 1500) stored.pop()

            const embed = new MessageEmbed()
                .setColor(Colors.GREEN)
                .setTitle(`Most recent ${newsManager.getLanguageName(lang)} news articles:`)
                .setDescription(stored.join("\n"))

            return message.channel.send(embed)
        }

        const post = newsManager.getNewsById(args[0])
        if (!post)
            return message.channel.send(`Couldn't find article in cache. Try to see if it exists on the forum: <https://www.hoyolab.com/genshin/article/${args[0]}>`)

        const embed = getNewsEmbed(post, 0)
        if (embed == undefined)
            return message.channel.send(`Couldn't display article. Try to see you can on the forum: <https://www.hoyolab.com/genshin/article/${args[0]}>`)

        const reply = await message.channel.send(embed)

        await paginator(message, reply, (page) => getNewsEmbed(post, page))

        return undefined
    }
}
