import { Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { Colors, timeLeft } from "../../utils/Utils"
import config from "../../data/config.json"

export default class ReminderRemove extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Delete a reminder

Example: \`${config.prefix}dr 1\``,
            usage: "reminderremove <name> in <duration>",
            aliases: ["delreminder", "reminderdel", "reminderdelete", "deletereminder", "dr", "rr", "rreminder", "dreminder"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { reminderManager } = client
        const userid = message.author.id

        const reminders = reminderManager.getReminders(userid)

        if (args.length != 1) return this.sendHelp(message)

        const id = +(args[0].replace("#", ""))
        if (isNaN(id)) return this.sendHelp(message)

        const reminder = reminders.find(r => r.id == id)

        if (!reminder) return message.channel.send(`Could not find reminder with ID #${id}`)

        const reply = message.channel.send(
            new MessageEmbed()
                .setTitle(`Deleted reminder #${reminder.id}`)
                .setColor(Colors.RED)
                .setDescription(`I won't remind you about \`${reminder.subject}\` in ${timeLeft(reminder.timestamp - Date.now(), false, false)}

You can re-start this reminder with \`${config.prefix}ar ${reminder.subject} in ${timeLeft(reminder.duration, true, true)}\` or with \`${config.prefix}ar ${reminder.subject} in ${timeLeft(reminder.timestamp - Date.now(), true, true)}\` if you don't want to reset the duration`)
                .setFooter("In your local timezone")
                .setTimestamp(reminder.timestamp)
        )

        reminderManager.deleteReminder(userid, id, reminder.timestamp)

        return reply
    }
}
