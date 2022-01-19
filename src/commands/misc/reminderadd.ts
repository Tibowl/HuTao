import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { Colors, getUserID, parseDuration, sendMessage, timeLeft } from "../../utils/Utils"
import config from "../../data/config.json"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class ReminderAdd extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Add a new reminder, reminders will be send over in DMs.

Some respawn timers can be detected from name and don't need a duration specified
Example: \`${config.prefix}ar Ores\`
Example: \`${config.prefix}ar Parametric Transformer\` or just \`${config.prefix}ar Para\`
Example: \`${config.prefix}ar Liyue specialties\`

Example: \`${config.prefix}ar Ores in 3 days\`
Example: \`${config.prefix}ar Specialties in 47h, 59m\`
Example: \`${config.prefix}ar Parametric in 6 days and 22h\`
Example: \`${config.prefix}ar Weekly boss in 36 resin\``,
            usage: "reminderadd <name> in <duration>",
            aliases: ["remindme", "addreminder", "remind", "ar", "ra"],
            options: [{
                name: "args",
                description: "Name (and time). Example: 'Ores' or 'Weekly Boss in 16 resin'",
                type: "STRING",
                required: true
            }]
        })
    }
    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const args = options.getString("args", true)

        return this.runMessage(source, args.split(/ +/g))
    }

    async runMessage(source: Message|CommandInteraction, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1) return this.sendHelp(source)

        const words = args.map(l => l.toLowerCase())
        const time = words.includes("in") ? args.splice(words.lastIndexOf("in")).slice(1).join(" ") : ""
        const name = args.join(" ") || "Unnamed reminder"

        return this.run(source, name, time)
    }

    async run(source: CommandSource, name: string, time: string): Promise<SendMessage | undefined> {
        const { reminderManager, timerManager } = client
        const userid = getUserID(source)

        const reminders = reminderManager.getReminders(userid)
        if (reminders.length >= 25) return sendMessage(source, `You can only have up to 25 reminders, see \`${config.prefix}reminders\` for which you have`)

        if (name.length > 128) return sendMessage(source, "Reminder name too long")
        if (time.length == 0) {
            if (name.match(/^Para(metric)?s?( Trans(former)?s?)?$/i)) time = "6 days and 22 hours"
            else if (name.match(/^(Ores?|Minerals?|(Blue )?Crystals?( Chunks?)?)$/i)) time = "3 days"
            else if (name.match(/Special(tie)?s?$/i)) time = "48 hours"
            else if (name.match(/Art(i|e)facts?( run)?$/i)) time = "1 day"
            else if (name.match(/^Daily/i)) time = "1 day"
            else if (name.match(/^Weekly/i)) time = "7 days"
            else return this.sendHelp(source)
        }

        const duration = parseDuration(time)

        if (duration == 0) return this.sendHelp(source)

        let id = 1
        while (reminders.some(r => r.id == id) || reminderManager.getReminderById(userid, id))
            id++

        const timestamp = Date.now() + duration
        const reply = sendMessage(source,
                                  new MessageEmbed()
                                      .setTitle(`Created reminder #${id}`)
                                      .setColor(Colors.GREEN)
                                      .setDescription(`I'll remind you in DM's about \`${name}\` in **${timeLeft(duration, true, false)}**`)
                                      .setFooter("In your local timezone")
                                      .setTimestamp(timestamp)
        )

        const reminder = reminderManager.addReminder(id, name, userid, duration, timestamp)

        if (reminder.timestamp <= timerManager.queuedUntil)
            timerManager.queueReminder(reminder)

        return reply
    }
}
