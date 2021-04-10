import { Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { Colors, timeLeft } from "../../utils/Utils"
import config from "../../data/config.json"

export default class ReminderAdd extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Add a new reminder, reminders will be send over in DMs

Example: \`${config.prefix}ar Ores in 3 days\`
Example: \`${config.prefix}ar Specialties in 47h, 59m\`
Example: \`${config.prefix}ar Parametric in 6 days and 23h\``,
            usage: "reminderadd <name> in <duration>",
            aliases: ["remindme", "addreminder", "remind", "ar", "ra"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { reminderManager, timerManager } = client
        const userid = message.author.id

        const reminders = reminderManager.getReminders(userid)
        if (reminders.length >= 25) return message.channel.send(`You can only have up to 25 reminders, see \`${config.prefix}reminders\` for which you have`)

        if (args.length < 2) return this.sendHelp(message)

        const time = args.splice(args.map(l => l.toLowerCase()).lastIndexOf("in")).slice(1)
        const name = args.join(" ") || "Unnamed reminder"

        if (name.length > 128) return message.channel.send("Reminder name too long")
        if (time.length == 0) return this.sendHelp(message)

        let duration = 0

        const times = [...time.join(" ").matchAll(/((\d+) ?(days?|d|hours?|h|minutes?|min|m|seconds?|sec|s))/g)]

        for (const time of times)
            if (time[3].startsWith("d")) duration += +time[2] * 24 * 60 * 60 * 1000
            else if (time[3].startsWith("h")) duration += +time[2] * 60 * 60 * 1000
            else if (time[3].startsWith("m")) duration += +time[2] * 60 * 1000
            else if (time[3].startsWith("s")) duration += +time[2] * 1000

        if (duration == 0) return this.sendHelp(message)

        let id = 1
        while (reminders.some(r => r.id == id) || reminderManager.getReminderById(userid, id))
            id++

        const reminder = reminderManager.addReminder(id, name, userid, duration)

        if (reminder.timestamp <= timerManager.queuedUntil)
            timerManager.queueReminder(reminder)

        return message.channel.send(new MessageEmbed()
            .setTitle(`Created reminder #${reminder.id}`)
            .setColor(Colors.GREEN)
            .setDescription(`I'll remind you in DM's about \`${reminder.subject}\` in **${timeLeft(reminder.duration, true, false)}**`)
            .setFooter("In your local timezone")
            .setTimestamp(reminder.timestamp)
        )
    }
}
