import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { getDate } from "../../utils/Utils"

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

    async run(message: Message): Promise<Message | Message[]> {
        const { data } = client
        const { events } = data

        const now = Date.now()

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

        const embed = new MessageEmbed()
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
        return message.channel.send(embed)
    }
}
