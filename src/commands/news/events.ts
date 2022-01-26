import { CommandInteraction, Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { Bookmarkable, Colors, getDate, getEndTime, getEventEmbed, getStartTime, paginator,  } from "../../utils/Utils"
import { CommandSource, Event, SendMessage } from "../../utils/Types"

export default class Events extends Command {
    constructor(name: string) {
        super({
            name,
            category: "News",
            usage: "events",
            help: "List upcoming and ongoing events",
            aliases: ["e"],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        const now = Date.now()
        const { events } = client.data

        const startTimezone = "+08:00"
        const endTimezone = "-05:00"

        const ongoing = events
            .filter(e => {
                const start = getStartTime(e, startTimezone)
                const end = getEndTime(e, endTimezone)

                return start && start.getTime() <= now &&
          (
              (end && end.getTime() >= now) ||
            (!end && e.reminder == "daily")
          )
            }).sort((a, b) => {
                const endA = getEndTime(a, endTimezone)
                const endB = getEndTime(b, endTimezone)

                if (!endA) return 1
                if (!endB) return -1

                return endA.getTime() - endB.getTime()
            })

        const upcoming = events
            .filter(e => {
                const start = getStartTime(e, startTimezone)
                return start == false || start.getTime() > now
            })
            .sort((a, b) => {
                const startA = getStartTime(a, startTimezone)
                const startB = getStartTime(b, startTimezone)

                if (!startA) return 1
                if (!startB) return -1

                return startA.getTime() - startB.getTime()
            })
        const summaryPages = this.getSummaryPages(ongoing, upcoming)
        const pages: Bookmarkable[] = [{
            bookmarkEmoji: "",
            bookmarkName: "Ongoing",
            invisible: true,
            maxPages: ongoing.length,
            pages: (rp, cp, mp) => this.getOngoingEvent(ongoing, rp, cp, mp)
        }, {
            bookmarkEmoji: "",
            bookmarkName: "Summary",
            invisible: true,
            maxPages: summaryPages.length,
            pages: (rp, cp, mp) => this.getSummary(summaryPages, rp, cp, mp)
        }, {
            bookmarkEmoji: "",
            bookmarkName: "Upcoming",
            invisible: true,
            maxPages: upcoming.length,
            pages: (rp, cp, mp) => this.getUpcomingEvent(upcoming, rp, cp, mp)
        }]

        await paginator(source, pages, "Summary")
        return undefined
    }

    getOngoingEvent(ongoing: Event[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const event = ongoing[ongoing.length - relativePage - 1]
        if (event == undefined) return undefined

        const embed = getEventEmbed(event)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setColor("#F49C1F")

        if (event.end)
            embed.setTimestamp(getDate(event.end, event.timezone))

        return embed
    }

    getUpcomingEvent(upcoming: Event[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const event = upcoming[relativePage]
        if (event == undefined) return undefined

        const embed = getEventEmbed(event)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setColor("#F4231F")

        if (event.start)
            embed.setTimestamp(getDate(event.start, event.timezone))

        return embed
    }

    getSummary(pages: MessageEmbed[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        return pages[relativePage]
            .setTitle("Events")
            .setURL(`${client.data.baseURL}events`)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setColor(Colors.DARK_GREEN)
    }

    getSummaryPages(ongoing: Event[], upcoming: Event[]): MessageEmbed[] {
        const pages: MessageEmbed[] = []
        const curr = ongoing
            .map(e =>
                `${e.end ? `Ending on ${e.end}${e.timezone?` (GMT${e.timezone})`:""}` : "Ongoing"}: ${e.link ? `[${e.name}](${e.link}) ` : e.name}`
            )
        const next = upcoming
            .map(e =>
                `${e.type == "Unlock" ? "Unlocks at" : "Starting on"} ${e.prediction ? "*(prediction)* " : ""}${e.start ? e.start : "????"}${e.timezone?` (GMT${e.timezone})`:""}: ${e.link ? `[${e.name}](${e.link})` : e.name}`
            )

        let currentEmbed = new MessageEmbed(), currLine = "", nextLine = ""
        while (curr.length > 0) {
            const newCurr = curr.shift()
            if (newCurr == undefined) break
            if (currLine.length + newCurr.length > 950 && currLine.length > 0) {
                currentEmbed.addField("Current Events", currLine + "***See next page for more***")
                pages.push(currentEmbed)
                currentEmbed = new MessageEmbed()
                currLine = ""
            }
            currLine += newCurr + "\n"
        }
        if (currLine.length > 0)
            currentEmbed.addField("Current Events", currLine.trim())
        if (ongoing.length == 0)
            currentEmbed.addField("Current Events", "None")

        while (next.length > 0) {
            const newNext = next.shift()
            if (newNext == undefined) break
            if (nextLine.length + newNext.length > 950 && nextLine.length > 0) {
                currentEmbed.addField("Upcoming Events", nextLine + "***See next page for more***")
                pages.push(currentEmbed)
                currentEmbed = new MessageEmbed()
                nextLine = ""
            }
            nextLine += newNext + "\n"
        }
        if (nextLine.length > 0) {
            currentEmbed.addField("Upcoming Events", nextLine.trim())
            pages.push(currentEmbed)
        }
        if (upcoming.length == 0) {
            currentEmbed.addField("Upcoming Events", "None")
            pages.push(currentEmbed)
        }

        return pages
    }
}
