import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { Colors, getUserID, sendMessage, timeLeft } from "../../utils/Utils"
import config from "../../data/config.json"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class ReminderRemove extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Delete a reminder

Example: \`${config.prefix}dr 1\``,
            usage: "reminderremove <id>",
            aliases: ["delreminder", "reminderdel", "reminderdelete", "deletereminder", "dr", "rr", "rreminder", "dreminder"],
            options: [{
                name: "id",
                description: "Current amount of resin",
                type: "NUMBER",
                required: true
            }]
        })
    }
    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const id = options.getNumber("id", true)

        return this.run(source, id)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length <= 0) return this.sendHelp(source)

        if (args.length != 1) return this.sendHelp(source)

        const id = +(args[0].replace("#", ""))
        if (isNaN(id)) return this.sendHelp(source)

        return this.run(source, id)
    }

    async run(source: CommandSource, id: number): Promise<SendMessage | undefined> {
        const { reminderManager } = client
        const userid = getUserID(source)

        const reminders = reminderManager.getReminders(userid)


        const reminder = reminders.find(r => r.id == id)

        if (!reminder) return sendMessage(source, `Could not find reminder with ID #${id}`)

        const embed = new MessageEmbed()
            .setTitle(`Deleted reminder #${reminder.id}`)
            .setColor(Colors.RED)
            .setDescription(`I won't remind you about \`${reminder.subject}\` in ${timeLeft(reminder.timestamp - Date.now(), false, false)}

You can re-start this reminder with \`${config.prefix}ar ${reminder.subject} in ${timeLeft(reminder.duration, true, true)}\` or with \`${config.prefix}ar ${reminder.subject} in ${timeLeft(reminder.timestamp - Date.now(), true, true)}\` if you don't want to reset the duration`)
            .setFooter("In your local timezone")
            .setTimestamp(reminder.timestamp)

        const reply = sendMessage(source, embed)

        reminderManager.deleteReminder(userid, id, reminder.timestamp)

        return reply
    }
}
