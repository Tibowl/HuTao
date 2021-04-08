import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { getDate, getEventEmbed, paginator } from "../../utils/Utils"
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
                getDate(e.start).getTime() <= now &&
                (
                    (e.end && getDate(e.end).getTime() >= now) ||
                    (!e.end && e.reminder == "daily")
                )
            ).sort((a, b) => {
                if (!a.end) return 1
                if (!b.end) return -1
                return getDate(a.end).getTime() - getDate(b.end).getTime()
            })

        const upcoming = events
            .filter(e => getDate(e.start).getTime() > now)
            .sort((a, b) => getDate(a.start).getTime() - getDate(b.start).getTime())

        const embed = this.getEvent(ongoing, upcoming, ongoing.length)
        if (!embed) return message.channel.send("No artifact data loaded")

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
                                  `${e.end ? `Ending on ${e.end}` : "Ongoing"}: ${e.link ? `[${e.name}](${e.link}) ` : e.name}`
                              )
                              .join("\n")
                )
                .addField("Upcoming Events", upcoming.length == 0 ? "None" : upcoming
                    .map(e =>
                        `Starting on ${e.start}: ${e.link ? `[${e.name}](${e.link})` : e.name}`
                    )
                    .join("\n"))
                .setFooter(`Page ${page+1} / ${total}`)
                .setColor("#2EF41F")
        } else if (currentPage > 0) {
            const event = upcoming[Math.abs(currentPage) - 1]
            if (event == undefined) return undefined

            return getEventEmbed(event)
                .setFooter(`Page ${page+1} / ${total}`)
                .setColor("#F4231F")
        } else if (currentPage < 0) {
            const event = ongoing[Math.abs(currentPage) - 1]
            if (event == undefined) return undefined

            return getEventEmbed(event)
                .setFooter(`Page ${page+1} / ${total}`)
                .setColor("#F49C1F")
        }
        return undefined
    }
}
