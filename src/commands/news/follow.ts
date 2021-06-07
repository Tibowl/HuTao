import { Message, TextChannel } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { FollowCategory } from "../../utils/Types"
import { createTable, sendMessage } from "../../utils/Utils"
import config from "../../data/config.json"

const descriptions: { [x in FollowCategory]: string } = {
    "events": "Get event reminders",

    "news_en-us": "English forum news articles",
    "news_es-es": "Español forum news articles",
    "news_fr-fr": "Français forum news articles",
    "news_ja-jp": "日本語 forum news articles",
    "news_ko-kr": "한국어 forum news articles",

    "news_zh-cn": "简体中文 forum news articles (from hoyolab.com)",
    "news_bbs-zh-cn": "简体中文 forum news articles (from bbs.mihoyo.com)",
    "news_zh-tw": "繁體中文 forum news articles",
    "news_de-de": "Deutsch forum news articles",
    "news_id-id": "Indonesia forum news articles",
    "news_pt-pt": "Português forum news articles",
    "news_ru-ru": "Pусский forum news articles",
    "news_th-th": "ภาษาไทย forum news articles",
    "news_vi-vn": "Tiếng Việt forum news articles",

    twitter_en: "English Twitter feed",
    // twitter_es: "Español Twitter feed",
    // twitter_fr: "Français Twitter feed",
    twitter_jp: "日本語 Twitter feed",
    // twitter_ko: "한국어 Twitter feed",
}

export default class Follow extends Command {
    constructor(name: string) {
        super({
            name,
            category: "News",
            usage: `follow <list|add|remove> <${Object.keys(descriptions).join("|")}>\` or just \`follow list`,
            help: `Follow certain events in a channel

**Possible events**:
${Object.entries(descriptions).map(([k, v]) => `  ${k}: *${v}*`).join("\n")}

Example of adding news: \`${config.prefix}follow add news\``,
            aliases: ["following", "notifications", "subscribe"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (!(message.channel instanceof TextChannel) || message.guild == null)
            return sendMessage(message, "This command can only be executed in guild channels. You can invite this bot in your own server via `.invite`")

        if (!message.member?.permissions.has("ADMINISTRATOR") && !config.admins.includes(message.author.id))
            return sendMessage(message, "You do not have administrator rights in this server, and thus can't edit follows. If you still want to use this feature, add this bot in your own server via `.invite`")

        const { followManager } = client

        if (args.length < 2)
            if (args.length > 0 && ["list"].includes(args[0].toLowerCase())) {
                const following = followManager.following(message.guild)

                const channels: {category: string, channelname: string}[] = []
                for (const follow of following)
                    try {
                        const channel = await client.channels.fetch(follow.channelID)
                        if (channel instanceof TextChannel)
                            channels.push({
                                channelname: channel.name,
                                category: follow.category
                            })
                    } catch (error) {
                        followManager.dropChannel(follow.channelID)
                    }
                if (channels.length == 0) return sendMessage(message, "Following nothing")

                return sendMessage(message, `Following per event: \`\`\`
${createTable(
        ["Event", "|", "Channel"],
        channels.map(
            k => [k.category, "|", k.channelname]
        ))}\`\`\``)
            } else
                return this.sendHelp(message)

        const category: FollowCategory | undefined = Object.keys(descriptions).find(r => r.toLowerCase() == args[1].toLowerCase()) as (FollowCategory | undefined)
        if (!category)
            return sendMessage(message, `Unknown event \`${args[1]}\`, valid events: ${Object.keys(descriptions).map(k => `\`${k}\``).join(", ")}`)

        if (["list", "l"].includes(args[0].toLowerCase())) {
            const follows = followManager.getFollows(message.channel, category)
            if (follows.length == 0) return sendMessage(message, `Not following ${category}`)
            return sendMessage(message, follows.map(k => `Following ${category} since ${new Date(k.addedOn).toLocaleString("en-UK", {
                timeZone: "GMT",
                hour12: false,
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })} by ${k.addedBy}`).join("\n"))

        } else if (["remove", "delete", "d", "r", "disable", "off", "follow"].includes(args[0].toLowerCase())) {
            followManager.unfollow(message.channel, category)

            return sendMessage(message, `Unfollowed ${category} in <#${message.channel.id}>`)
        } else if (["add", "a", "follow", "enable", "on", "unfollow"].includes(args[0].toLowerCase())) {
            followManager.addFollow(message.guild, message.channel, category, message.author)

            return sendMessage(message, `Now following ${category} in <#${message.channel.id}>`)
        } else
            return this.sendHelp(message)
    }
}
