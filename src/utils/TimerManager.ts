import log4js from "log4js"

import client from "../main"
import config from "../data/config.json"
import { MessageEmbed } from "discord.js"
import { Colors, getDate, getEventEmbed, timeLeft } from "./Utils"
import { EventType, Reminder } from "./Types"

const Logger = log4js.getLogger("TimerManager")

export default class TimerManager {
    activityTimer: NodeJS.Timeout | undefined = undefined
    queuedUntil = Date.now() - 20000
    lastActivity = 0

    init(): void {
        const updateActivity = async (): Promise<void> => {
            if (client.user == undefined) {
                this.activityTimer = setTimeout(updateActivity, 5000)
                return
            }

            const start = Date.now()
            this.activityTimer = setTimeout(updateActivity, 30000)

            this.queueTimers()
            const end = Date.now()
            Logger.debug(`Checking for timers took ${end - start}ms`)

            if (Date.now() - this.lastActivity > 300 * 1000) {
                this.lastActivity = Date.now()
                await client.user.setActivity(config.activity, {
                    type: "LISTENING"
                })
                Logger.debug(`Updating activity took ${Date.now() - end}ms`)
            }
        }

        if (this.activityTimer == undefined)
            setTimeout(updateActivity, 5000)
    }
    queueTimers(): void {
        const queueUntil = Date.now() + 1 * 60 * 1000

        this.queueReminders(queueUntil)
        this.queueEvents(queueUntil)

        this.queuedUntil = queueUntil
    }

    queueEvents(queueUntil: number): void {
        for (const event of client.data.events) {
            if (!event.start) continue

            const start = getDate(event.start, event.timezone)

            // Starting
            if (start.getTime() > this.queuedUntil) {
                if (this.shouldQueue(start, queueUntil)) {
                    Logger.info(`Queue start @ ${start.toISOString()} for ${event.name}`)
                    const embed = getEventEmbed(event)

                    switch (event.type) {
                        case EventType.Banner: embed.setDescription("This banner is now available"); break
                        case EventType.Maintenance: embed.setDescription("Maintenance has now started"); break
                        case EventType.Unlock: embed.setDescription("This should now be available"); break
                        case EventType.Stream: embed.setDescription("Stream should have started"); break
                        default: embed.setDescription("This event is now available"); break
                    }

                    this.queueTimer(
                        embed.setColor(Colors.DARK_GREEN),
                        start
                    )
                }

                continue
            }

            // Endings
            if (event.end) {
                const end = getDate(event.end, event.timezone)

                // Already ended
                if (end.getTime() <= this.queuedUntil)
                    continue

                // Queue exact ending
                if (this.shouldQueue(end, queueUntil)) {
                    Logger.info(`Queue end @ ${end.toISOString()} for ${event.name}`)
                    const embed = getEventEmbed(event)

                    switch (event.type) {
                        case EventType.Banner: embed.setDescription("This banner is no longer available"); break
                        case EventType.Maintenance: embed.setDescription("Maintenance should be done"); break
                        case EventType.Stream: embed.setDescription("Stream should be done"); break
                        default: embed.setDescription("This event has ended"); break
                    }

                    this.queueTimer(
                        embed.setColor(Colors.DARK_RED),
                        end
                    )
                }

                if (event.reminder == "end") {
                    const target = new Date(end)
                    target.setUTCDate(target.getUTCDate() - 1)
                    if (this.shouldQueue(target, queueUntil)) {
                        Logger.info(`Queue event end reminder @ ${target.toISOString()} for ${event.name}`)
                        this.queueTimer(
                            getEventEmbed(event)
                                .setDescription("This event will end tomorrow")
                                .setColor(Colors.RED),
                            target
                        )
                    }
                }
            }

            // Daily reminder
            if (event.reminder == "daily") {
                const target = new Date(start)
                if (event.remindtime) {
                    const [hh, mm, ss] = event.remindtime.split(":").map(i => parseInt(i))
                    target.setUTCHours((hh ?? 0) - 8, mm ?? 0, ss ?? 0, 0)
                }
                while (target.getTime() < this.queuedUntil)
                    target.setUTCDate(target.getUTCDate() + 1)

                // Reminder past event end
                if (event.end && target.getTime() >= getDate(event.end, event.timezone).getTime())
                    continue

                if (this.shouldQueue(target, queueUntil)) {
                    Logger.info(`Queue daily reminder @ ${target.toISOString()} for ${event.name}`)
                    this.queueTimer(
                        getEventEmbed(event)
                            .setDescription("This is your daily reminder for this event")
                            .setColor(Colors.ORANGE),
                        target
                    )
                }
            }
        }
    }

    queueReminders(queueUntil: number): void {
        for (const reminder of client.reminderManager.getUpcomingReminders(queueUntil)) {
            const timestamp = new Date(reminder.timestamp)

            if (this.shouldQueue(timestamp, queueUntil)) {
                Logger.info(`Queue reminder @ ${timestamp.toISOString()} for ${reminder.user} #${reminder.id}`)

                this.queueReminder(reminder)
            } else if (Date.now() > timestamp.getTime() + 2 * 60 * 1000) {
                Logger.info(`Late reminder ${reminder.timestamp} for ${reminder.user} #${reminder.id}: ${reminder.subject}`)
                setImmediate(async () => {
                    try {
                        client.reminderManager.deleteReminder(reminder.user, reminder.id, reminder.timestamp)

                        const embed = new MessageEmbed()
                            .setTitle(`Late reminder: ${reminder.id}`)
                            .setDescription(`Due to technical reasons, this reminder got delivered too late: \`${reminder.subject}\``)
                            .addField("Repeating the reminder", `You can repeat this reminder with \`${config.prefix}ar ${reminder.subject} in ${timeLeft(reminder.duration, true)}\``)
                            .setColor(Colors.ORANGE)
                            .setTimestamp(reminder.timestamp)

                        const user = await client.users.fetch(reminder.user)
                        await user.send({ embeds: [embed] })
                    } catch (error) {
                        Logger.error("Error occured while sending late reminder", error)
                    }
                })
            }
        }
    }

    queueReminder(reminder: Reminder): void {
        setTimeout(async () => {
            try {
                const embed = new MessageEmbed()
                    .setTitle(`Reminder: ${reminder.id}`)
                    .setDescription(`I'm here to remind you about \`${reminder.subject}\``)
                    .addField("Repeating the reminder", `You can repeat this reminder with \`${config.prefix}ar ${reminder.subject} in ${timeLeft(reminder.duration, true)}\``)
                    .setColor(Colors.GREEN)
                    .setTimestamp(reminder.timestamp)

                const result = client.reminderManager.deleteReminder(reminder.user, reminder.id, reminder.timestamp)
                if (result.changes > 0) {
                    const user = await client.users.fetch(reminder.user)
                    await user.send({ embeds: [embed] })
                }
            } catch (error) {
                Logger.error("Error occured while sending reminder", error)
            }
        }, reminder.timestamp - Date.now() + 100)
    }

    private shouldQueue(time: Date, until: number) {
        return time.getTime() > this.queuedUntil && time.getTime() <= until
    }

    queueTimer(embed: MessageEmbed, targetTime: Date): void {
        const { followManager } = client
        setTimeout(() => {
            followManager.send("events", undefined, embed).catch(Logger.error)
        }, targetTime.getTime() - Date.now() + 500)
    }
}
