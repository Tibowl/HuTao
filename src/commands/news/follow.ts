import { APIInteractionDataResolvedGuildMember } from "discord-api-types/v10"
import { CommandInteraction, Message, MessageMentions } from "discord.js"

import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, FollowCategory, SendMessage } from "../../utils/Types"
import { createTable, getUserID, isNewsable, sendMessage } from "../../utils/Utils"

const descriptions: { [x in FollowCategory]: string } = {
    "events": "Get event reminders",
    "events_no_daily": "Get event reminders (without dailies)",

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
            usage: `follow <list|add|remove> <${Object.keys(descriptions).join("|")}> [pingRole, in the case of add]\` or just \`follow list`,
            help: `Follow certain events in a channel

**Possible events**:
${Object.entries(descriptions).map(([k, v]) => `  ${k}: *${v}*`).join("\n")}

Example of adding news: \`${config.prefix}follow add news\``,
            aliases: ["following", "notifications", "subscribe"],
            options: [{
                name: "list",
                description: "List the currently following events",
                type: "SUB_COMMAND",
                options: [{
                    name: "category",
                    description: "Category of the event",
                    type: "STRING",
                    required: false,
                    choices: Object.keys(descriptions).map(d => {
                        return {
                            name: d,
                            value: d
                        }
                    })
                }]
            }, {
                name: "add",
                description: "Add an category to follow in this channel",
                type: "SUB_COMMAND",
                options: [{
                    name: "category",
                    description: "Category of the event",
                    type: "STRING",
                    required: true,
                    choices: Object.keys(descriptions).map(d => {
                        return {
                            name: d,
                            value: d
                        }
                    })
                }, {
                    name: "pingrole",
                    description: "Role to ping",
                    type: "MENTIONABLE"
                }]
            }, {
                name: "remove",
                description: "Remove an category to follow in this channel",
                type: "SUB_COMMAND",
                options: [{
                    name: "category",
                    description: "Category of the event",
                    type: "STRING",
                    required: true,
                    choices: Object.keys(descriptions).map(d => {
                        return {
                            name: d,
                            value: d
                        }
                    })
                }]
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const channel = await source.channel?.fetch()
        if (!channel || !isNewsable(channel) || source.guild == null)
            return sendMessage(source, "This command can only be executed in guild channels. You can invite this bot in your own server via `.invite`", undefined, true)

        if (typeof source.member?.permissions == "string")
            return sendMessage(source, "Unable to check permissions", undefined, true)

        if (!source.member?.permissions.has("ADMINISTRATOR") && !config.admins.includes(getUserID(source)))
            return sendMessage(source, "You do not have administrator rights in this server, and thus can't edit follows. If you still want to use this feature, add this bot in your own server via `.invite`", undefined, true)

        const { options } = source
        const sub = options.getSubcommand()

        if (sub == "list") {
            return this.runList(source, options.getString("category") as (FollowCategory | null))
        } else if (sub == "add") {
            return this.runFollow(source, options.getString("category", true) as FollowCategory, options.getMentionable("pingrole", false))
        } else if (sub == "remove") {
            return this.runUnfollow(source, options.getString("category", true) as FollowCategory)
        }
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        const channel = await source.channel?.fetch()
        if (!channel || !isNewsable(channel) || source.guild == null)
            return sendMessage(source, "This command can only be executed in guild channels. You can invite this bot in your own server via `.invite`", undefined, true)

        if (!source.member?.permissions.has("ADMINISTRATOR") && !config.admins.includes(getUserID(source)))
            return sendMessage(source, "You do not have administrator rights in this server, and thus can't edit follows. If you still want to use this feature, add this bot in your own server via `.invite`", undefined, true)

        const sub = args[0]?.toLowerCase() ?? "help"
        args.shift()
        const otherArgs = args[0]?.toLowerCase()
        args.shift()

        const category: FollowCategory | undefined = otherArgs ? Object.keys(descriptions).find(r => r.toLowerCase() == otherArgs) as (FollowCategory | undefined) : undefined
        if (!category)
            if (["list", "l"].includes(sub))
                return this.runList(source)
            else if (otherArgs)
                return sendMessage(source, `Unknown event \`${otherArgs}\`, valid events: ${Object.keys(descriptions).map(k => `\`${k}\``).join(", ")}`, undefined, true)
            else
                return sendMessage(source, `Need to provide an event, valid events: ${Object.keys(descriptions).map(k => `\`${k}\``).join(", ")}`, undefined, true)

        if (["list", "l"].includes(sub)) {
            return this.runList(source, category)
        } else if (["add", "a", "follow", "enable", "on"].includes(sub)) {
            return this.runFollow(source, category, args[0])
        } else if (["remove", "delete", "d", "r", "disable", "off", "unfollow"].includes(sub)) {
            return this.runUnfollow(source, category)
        } else {
            return sendMessage(source, `Unknown subcommand \`${sub}\``)
        }
    }

    async runList(source: CommandSource, category?: FollowCategory | null): Promise<SendMessage | undefined> {
        const channel = await source.channel?.fetch()
        if (!channel || !isNewsable(channel) || source.guild == null)
            return sendMessage(source, "Unable to check channel", undefined, true)

        const { followManager } = client
        if (!category) {
            const following = followManager.following(source.guild)

            const channels: {category: string, channelname: string, pingRole: string}[] = []
            for (const follow of following)
                try {
                    const channel = await client.channels.fetch(follow.channelID)
                    if (isNewsable(channel))
                        channels.push({
                            channelname: channel.name,
                            category: follow.category,
                            pingRole: follow.pingRole
                        })
                } catch (error) {
                    followManager.dropChannel(follow.channelID)
                }
            if (channels.length == 0) return sendMessage(source, "Following nothing", undefined, true)

            return sendMessage(source, `Following per event: \`\`\`
${createTable(
        ["Event", "|", "Channel", "|", "Ping role ID"],
        channels.map(
            k => [k.category, "|", k.channelname, "|", k.pingRole]
        ))}\`\`\``, undefined, true)
        }

        const follows = followManager.getFollows(channel, category)
        if (follows.length == 0) return sendMessage(source, `Not following ${category}`, undefined, true)
        return sendMessage(source, follows.map(k => `Following ${category} since ${new Date(k.addedOn).toLocaleString("en-UK", {
            timeZone: "GMT",
            hour12: false,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })} by ${k.addedBy}`).join("\n"), undefined, true)
    }

    async runUnfollow(source: CommandSource, category: FollowCategory): Promise<SendMessage | undefined> {
        const channel = await source.channel?.fetch()
        if (!channel || !isNewsable(channel) || source.guild == null)
            return sendMessage(source, "Unable to unfollow in this channel", undefined, true)

        const { followManager } = client

        followManager.unfollow(channel, category)

        return sendMessage(source, `Unfollowed ${category} in <#${channel.id}>`, undefined, true)
    }
    async runFollow(source: CommandSource, category: FollowCategory, pingRole: string | { id: string } | APIInteractionDataResolvedGuildMember | null): Promise<SendMessage | undefined> {
        const channel = await source.channel?.fetch()
        if (!channel || !isNewsable(channel) || source.guild == null)
            return sendMessage(source, "Unable to follow in this channel", undefined, true)

        let pingedRole = ""
        if (typeof pingRole == "string") {
            if (pingRole.match(/^\d+$/))
                pingedRole = pingRole
            else {
                const response = MessageMentions.ROLES_PATTERN.exec(pingRole)
                if (response == null)
                    return sendMessage(source, "Unable to extract ping role from message", undefined, true)
                pingedRole = response[1]
            }
        } else if ((pingRole as {id: string})?.id) {
            const role = await source.guild.roles.fetch((pingRole as {id: string}).id)
            if (!role)
                return sendMessage(source, "Unable to extract ping role from command", undefined, true)
            pingedRole = role.id
        } else if (pingRole)
            return sendMessage(source, "Unable to extract ping role from command", undefined, true)

        const { followManager } = client

        followManager.addFollow(source.guild, channel, category, getUserID(source), pingedRole)

        return sendMessage(source, `Now following ${category} in <#${channel.id}> (Ping role: ${pingedRole == "" ? "none" : `<@&${pingedRole}> - make sure the bot can ping this role - this might require the @everyone permission!`})`, undefined, true)
    }
}
