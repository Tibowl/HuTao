import { Message } from "discord.js"

import Command from "../../utils/Command"
import { getServerTimeInfo, timeLeft } from "../../utils/Utils"

export default class Time extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Time",
            help: "Get the current time in the server timezones. Also displays time until next daily and weekly reset.",
            usage: "time",
            aliases: ["times", "currenttime", "daily"],
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        return message.channel.send(`**Current server times:**

${getServerTimeInfo().map(({ offset, server, time, nextDailyReset, nextWeeklyReset }) => `**${server}** (UTC${offset}): *${time.toLocaleString("en-UK", {
        timeZone: "UTC",
        timeZoneName: undefined,
        hour12: false,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    })}*
    Next daily reset in **${timeLeft(nextDailyReset.getTime() - time.getTime())}**
    Next weekly reset in **${timeLeft(nextWeeklyReset.getTime() - time.getTime())}**
`).join("\n")}`)
    }
}
