import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, getCategory, getUser, sendMessage } from "../../utils/Utils"


export default class NoteEdit extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Edits a note by ID.

Notes are either per category (when used in a guild) or per user (when used in DM's).

Requires "Manage Messages" permissions to add/remove/edit, but anyone can see.`,
            usage: "noteedit <id> <new name>",
            aliases: ["editn", "editnote", "enote"],
            options: [{
                name: "id",
                description: "ID to edit",
                type: "INTEGER",
                required: true
            }, {
                name: "name",
                description: "New name",
                type: "STRING",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const id = options.getInteger("id", true)
        const name = options.getString("name", true)

        return this.run(source, id, name)
    }

    async runMessage(source: Message|CommandInteraction, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1) return this.sendHelp(source)

        const id = parseInt(args[0])
        if (isNaN(id)) return this.sendHelp(source)

        const name = args.slice(1).join(" ")

        return this.run(source, id, name)
    }

    async run(source: CommandSource, id: number, newSubject: string): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const guild = source.guild
        const category = getCategory(source)
        const name = category?.name ?? guild?.name ?? user.username

        const guildID = guild?.id ?? "user"
        const categoryID = category?.id ?? guild?.id ?? user.id

        if (source.member == undefined || typeof source.member.permissions == "string")
            return sendMessage(source, "Unable to check permissions.", undefined, true)
        else if (!source.member.permissions.has("MANAGE_MESSAGES"))
            return sendMessage(source, "You do not have have \"Manage Messages\" permissions in here.", undefined, true)

        if (newSubject.length > 256) return sendMessage(source, "Note name too long")

        const note = notesManager.getNoteById(guildID, categoryID, id)
        if (note == undefined) return sendMessage(source, `Could not find note #${id} in ${name}`)

        notesManager.editNote(guildID, categoryID, id, newSubject, user.id)
        const reply = sendMessage(source, new MessageEmbed()
            .setTitle(`Edited note #${id} in ${name}`)
            .setColor(Colors.ORANGE)
            .setDescription(`Original: \`${note.subject}\`
New: \`${newSubject}\``)
        )

        return reply
    }
}
