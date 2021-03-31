import { Message, TextChannel } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { FollowCategory } from "../../utils/Types"
import { createTable } from "../../utils/Utils"
import config from "../../data/config.json"

const descriptions: { [x in FollowCategory]: string } = {
    birthday: "Birthday reminders of characters",
    maint: "Countdown towards maintance",
    twitter_en: "English Twitter feed",
    twitter_jp: "Japanese Twitter feed",
    twitter_kr: "Korean Twitter feed",
    twitter_es: "Spanish Twitter feed",
    twitter_fr: "French Twitter feed",
}

export default class Follow extends Command {
    constructor(name: string) {
        super({
            name,
            category: "News",
            usage: `follow <list|add|remove> <${Object.keys(descriptions).join("|")}>\` or just \`follow list`,
            help: `Follow certain events in a channel

**Possible events**:
${Object.entries(descriptions).map(([k, v]) => `  ${k}: *${v}*`).join("\n")}`,
            aliases: ["following", "reminders", "notifications", "subscribe"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (!(message.channel instanceof TextChannel) || message.guild == null)
            return message.reply("This command can only be executed in guild channels. You can invite this bot in your own server via `.invite`")

        if (!message.member?.hasPermission("ADMINISTRATOR") && !config.admins.includes(message.author.id))
            return message.reply("You do not have administrator rights in this server, and thus can't edit follows. If you still want to use this feature, add this bot in your own server via `.invite`")

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
                if (channels.length == 0) return message.channel.send("Following nothing")

                return message.channel.send(`Following per event: \`\`\`
${createTable(
        ["Event", "|", "Channel"],
        channels.map(
            k => [k.category, "|", k.channelname]
        ))}\`\`\``, {
                    split: {
                        append: "```",
                        prepend: "```",
                        maxLength: 1900
                    }
                })
            } else
                return this.sendHelp(message)

        const category: FollowCategory | undefined = Object.keys(descriptions).find(r => r.toLowerCase() == args[1].toLowerCase()) as (FollowCategory | undefined)
        if (!category)
            return message.reply(`Unknown event \`${args[1]}\`, valid events: ${Object.keys(descriptions).map(k => `\`${k}\``).join(", ")}`)

        if (["list", "l"].includes(args[0].toLowerCase())) {
            const follows = followManager.getFollows(message.channel, category)
            if (follows.length == 0) return message.channel.send(`Not following ${category}`)
            return message.channel.send(follows.map(k => `Following ${category} since ${new Date(k.addedOn).toLocaleString("en-UK", {
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

            return message.channel.send(`Unfollowed ${category} in <#${message.channel.id}>`)
        } else if (["add", "a", "follow", "enable", "on", "unfollow"].includes(args[0].toLowerCase())) {
            followManager.addFollow(message.guild, message.channel, category, message.author)

            return message.channel.send(`Now following ${category} in <#${message.channel.id}>`)
        } else
            return this.sendHelp(message)
    }
}
