import { Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { displayTimestamp, sendMessage, simplePaginator } from "../../utils/Utils"
import { Reminder } from "../../utils/Types"
import config from "../../data/config.json"

export default class Reminders extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `List current reminders, see \`${config.prefix}help reminderadd\` on how to add a reminder, see \`${config.prefix}help reminderremove\` on how to delete reminders`,
            usage: "reminders",
            aliases: ["listreminders", "r", "lr", "rs"]
        })
    }

    async run(message: Message): Promise<Message | Message[] | undefined> {
        const { reminderManager } = client
        const reminders = reminderManager.getReminders(message.author.id)
        if (reminders.length == 0) return sendMessage(message, `You don't have any reminders saved, see \`${config.prefix}help reminderadd\` on how to add a reminder`)

        const maxPages = Math.ceil(reminders.length / 10)
        if (reminders.length <= 10) return sendMessage(message, this.getReminders(reminders, 0, 1, 1))

        await simplePaginator(message, (relativePage, currentPage, maxPages) => this.getReminders(reminders, relativePage, currentPage, maxPages), maxPages)
        return undefined
    }

    getReminders(reminders: Reminder[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed {
        const embed = new MessageEmbed()
            .setTitle("Reminders")
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setDescription(reminders
                .slice(relativePage * 10, (relativePage + 1) * 10)
                .map(r => `\`#${r.id}\`: \`${r.subject}\` **${displayTimestamp(new Date(r.timestamp))}**`)
                .join("\n")
            )

        if (relativePage == 0)
            embed.addField("Creating reminders", `You can create reminders using \`${config.prefix}remindme <name> in <duration>\``, true)
                .addField("Deleting reminders", `You can delete reminders using \`${config.prefix}delreminder <id>\``, true)

        return embed
    }
}
