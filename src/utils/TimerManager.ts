import log4js from "log4js"

import client from "../main"
import config from "../data/config.json"
import { MessageEmbed } from "discord.js"
import { getDate } from "./Utils"
import { Event } from "./Types"

const Logger = log4js.getLogger("TimerManager")

export default class TimerManager {
    activityTimer: NodeJS.Timeout | undefined = undefined
    queuedUntil = Date.now()

    init(): void {
        const updateActivity = (): void => {
            if (client.user == undefined) {
                this.activityTimer = setTimeout(updateActivity, 5000)
                return
            }

            const now = new Date()
            const nextMinute = new Date()
            nextMinute.setUTCMinutes(now.getUTCMinutes() + 1, 0, 0)

            let delay = nextMinute.getTime() - now.getTime()
            if (delay < 15000)
                delay += 60000

            this.activityTimer = setTimeout(updateActivity, delay + 500)


            client.user.setActivity(config.activity, {
                type: "LISTENING"
            })

            this.queueTimers()
        }

        if (this.activityTimer == undefined)
            setTimeout(updateActivity, 5000)
    }

    queueTimers(): void {
        const queueUntil = Date.now() + 5 * 60 * 1000

        for (const event of client.data.events) {
            const start = getDate(event.start)

            // Starting
            if (start.getTime() > this.queuedUntil) {
                if (this.shouldQueue(start, queueUntil)) {
                    Logger.info(`Queue start @ ${start.toISOString()} for ${event.name}`)
                    this.queueTimer(
                        this.getEventEmbed(event)
                            .setDescription("This event has started")
                            .setColor("#2EF41F"),
                        start
                    )
                }

                continue
            }

            // Endings
            if (event.end) {
                const end = getDate(event.end)

                // Already ended
                if (end.getTime() <= this.queuedUntil)
                    continue

                // Queue exact ending
                if (this.shouldQueue(end, queueUntil)) {
                    Logger.info(`Queue end @ ${end.toISOString()} for ${event.name}`)
                    this.queueTimer(
                        this.getEventEmbed(event)
                            .setDescription("This event has ended")
                            .setColor("#F4231F"),
                        end
                    )
                }

                if (event.reminder == "end") {
                    const target = new Date(end)
                    target.setUTCDate(target.getUTCDate() - 1)
                    if (this.shouldQueue(target, queueUntil)) {
                        Logger.info(`Queue event end reminder @ ${target.toISOString()} for ${event.name}`)
                        this.queueTimer(
                            this.getEventEmbed(event)
                                .setDescription("This event will end tomorrow")
                                .setColor("#F7322E"),
                            end
                        )
                    }
                }
            }

            // Daily reminder
            if (event.reminder == "daily") {
                const target = new Date(start)
                if (event.remindtime) {
                    const [hh, mm, ss] = event.remindtime.split(":").map(i => parseInt(i))
                    target.setUTCHours((hh ?? 0) - 8, mm ?? 0, ss??0, 0)
                }
                while (target.getTime() < this.queuedUntil)
                    target.setUTCDate(target.getUTCDate() + 1)

                // Reminder past event end
                if (event.end && target.getTime() >= getDate(event.end).getTime())
                    continue

                if (this.shouldQueue(target, queueUntil)) {
                    Logger.info(`Queue daily reminder @ ${target.toISOString()} for ${event.name}`)
                    this.queueTimer(
                        this.getEventEmbed(event)
                            .setDescription("This is your daily reminder")
                            .setColor("#F49C1F"),
                        target
                    )
                }
            }
        }

        this.queuedUntil = queueUntil
    }

    private getEventEmbed(event: Event) {
        const embed = new MessageEmbed()

        embed.setTitle(event.name)
        if (event.img) embed.setImage(event.img)
        if (event.link) embed.setURL(event.link)
        if (event.start) embed.addField("Start Time", event.start, true)
        if (event.end) embed.addField("End Time", event.end, true)
        if (event.type) embed.addField("Type", event.type, true)

        return embed
    }

    private shouldQueue(time: Date, until: number) {
        return time.getTime() > this.queuedUntil && time.getTime() <= until
    }

    queueTimer(embed: MessageEmbed, targetTime: Date): void {
        const { followManager } = client
        setTimeout(() => {
            followManager.send("events", embed)
        }, targetTime.getTime() - Date.now() + 500)
    }
}
