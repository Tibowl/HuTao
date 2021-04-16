import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { Colors, getDate, getEventEmbed, paginator } from "../../utils/Utils"
import { Event } from "../../utils/Types"

export default class Events extends Command {
    constructor(name: string) {
        super({
            name,
            category: "News",
            usage: "events",
            help: "List upcoming and ongoing events",
            aliases: ["e"]
        })
    }

    async run(message: Message): Promise<Message | Message[] | undefined> {
        const now = Date.now()
        const { events } = client.data

        const ongoing = events
            .filter(e =>
                e.start &&
                getDate(e.start, e.timezone).getTime() <= now &&
                (
                    (e.end && getDate(e.end, e.timezone).getTime() >= now) ||
                    (!e.end && e.reminder == "daily")
                )
            ).sort((a, b) => {
                if (!a.end) return 1
                if (!b.end) return -1
                return getDate(a.end, a.timezone).getTime() - getDate(b.end, b.timezone).getTime()
            })

        const upcoming = events
            .filter(e => e.start == undefined || getDate(e.start, e.timezone).getTime() > now)
            .sort((a, b) => {
                if (!a.start) return 1
                if (!b.start) return -1
                return getDate(a.start, a.timezone).getTime() - getDate(b.start, b.timezone).getTime()
            })

        const embed = this.getEvent(ongoing, upcoming, ongoing.length)
        if (!embed) return message.channel.send("No event data loaded")

        const reply = await message.channel.send(embed)
        await paginator(message, reply, (page) => this.getEvent(ongoing, upcoming, page), undefined, ongoing.length)
        return undefined
    }

    getEvent(ongoing: Event[], upcoming: Event[], page: number): MessageEmbed | undefined {
        const currentPage = page - ongoing.length
        const total = ongoing.length + upcoming.length + 1

        if (currentPage == 0) {
            return new MessageEmbed()
                .setTitle("Events")
                .addField("Current Events",
                          ongoing.length == 0 ? "None" : ongoing
                              .map(e =>
                                  `${e.end ? `Ending on ${e.end}${e.timezone?` (GMT${e.timezone})`:""}` : "Ongoing"}: ${e.link ? `[${e.name}](${e.link}) ` : e.name}`
                              )
                              .join("\n")
                )
                .addField("Upcoming Events", upcoming.length == 0 ? "None" : upcoming
                    .map(e =>
                        `${e.type == "Unlock" ? "Unlocks at" : "Starting on"} ${e.start ? e.start : "????"}${e.timezone?` (GMT${e.timezone})`:""}: ${e.link ? `[${e.name}](${e.link})` : e.name}`
                    )
                    .join("\n"))
                .setFooter(`Page ${page+1} / ${total}`)
                .setColor(Colors.DARK_GREEN)
        } else if (currentPage > 0) {
            const event = upcoming[Math.abs(currentPage) - 1]
            if (event == undefined) return undefined

            const embed = getEventEmbed(event)
                .setFooter(`Page ${page+1} / ${total}`)
                .setColor("#F4231F")

            if (event.start)
                embed.setTimestamp(getDate(event.start, event.timezone))

            return embed
        } else if (currentPage < 0) {
            const event = ongoing[Math.abs(currentPage) - 1]
            if (event == undefined) return undefined

            const embed = getEventEmbed(event)
                .setFooter(`Page ${page+1} / ${total}`)
                .setColor("#F49C1F")

            if (event.end)
                embed.setTimestamp(getDate(event.end, event.timezone))

            return embed
        }
        return undefined
    }
}
