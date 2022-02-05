import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { displayTimestamp, getUserID, sendMessage, simplePaginator } from "../../utils/Utils"
import { CommandSource, Reminder, SendMessage } from "../../utils/Types"
import config from "../../data/config.json"

export default class Reminders extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            shortHelp: "List of current reminders, see reminderadd and reminderremove for more info.",
            help: `List current reminders, see \`${config.prefix}help reminderadd\` on how to add a reminder, see \`${config.prefix}help reminderremove\` on how to delete reminders`,
            usage: "reminders",
            aliases: ["listreminders", "r", "lr", "rs"],
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
        const { reminderManager } = client
        const reminders = reminderManager.getReminders(getUserID(source))
        if (reminders.length == 0) return sendMessage(source, `You don't have any reminders saved, see \`${config.prefix}help reminderadd\` on how to add a reminder`)

        const maxPages = Math.ceil(reminders.length / 10)
        if (reminders.length <= 10) return sendMessage(source, this.getReminders(reminders, 0, 1, 1))

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getReminders(reminders, relativePage, currentPage, maxPages), maxPages)
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
