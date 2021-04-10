import { Message, MessageEmbed } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { paginator, timeLeft } from "../../utils/Utils"
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
        if (reminders.length == 0) return message.channel.send(`You don't have any reminders saved, see \`${config.prefix}help reminderadd\` on how to add a reminder`)

        const embed = this.getReminders(reminders, 0)
        if (!embed) return message.channel.send("Unable to show reminders")

        if (reminders.length <= 10) return message.channel.send(embed)

        const reply = await message.channel.send(embed)
        await paginator(message, reply, (page) => this.getReminders(reminders, page))
        return undefined
    }

    getReminders(reminders: Reminder[], page: number): MessageEmbed | undefined {
        if (page >= Math.ceil(reminders.length / 10)) return undefined

        const embed = new MessageEmbed()
            .setTitle("Reminders")
            .setFooter(`Page ${page+1} / ${Math.ceil(reminders.length / 10)}`)
            .setDescription(reminders
                .slice(page * 10, (page + 1) * 10)
                .map(r => `\`#${r.id}\`: \`${r.subject}\` in **${timeLeft(r.timestamp - Date.now())}**`)
                .join("\n")
            )
        if (page == 0)
            embed.addField("Creating reminders", `You can create reminders using \`${config.prefix}remindme <name> in <duration>\``, true)
                .addField("Deleting reminders", `You can delete reminders using \`${config.prefix}delreminder <id>\``, true)

        return embed
    }
}
