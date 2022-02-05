import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, getCategory, getUser, sendMessage } from "../../utils/Utils"


export default class NoteRemove extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Removes a new note, notes are per category or user.

Requires "Manage Messages" permissions to add, but anyone can see.`,
            usage: "noteremove <id>",
            aliases: ["rn", "dn", "removenote", "deletenote", "delnote", "dnote", "rnote"],
            options: [{
                name: "id",
                description: "ID to remove",
                type: "INTEGER",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const id = options.getInteger("id", true)

        return this.run(source, id)
    }

    async runMessage(source: Message|CommandInteraction, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1) return this.sendHelp(source)

        const id = parseInt(args[0])
        if (isNaN(id)) return this.sendHelp(source)

        return this.run(source, id)
    }

    async run(source: CommandSource, id: number): Promise<SendMessage | undefined> {
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

        const note = notesManager.getNoteById(guildID, categoryID, id)
        if (note == undefined) return sendMessage(source, `Could not find note #${id} in ${name}`)

        notesManager.deleteNote(guildID, categoryID, id, user.id)
        const reply = sendMessage(source, new MessageEmbed()
            .setTitle(`Deleted note #${id} in ${name}`)
            .setColor(Colors.RED)
            .setDescription(`The note #${id}: \`${note.subject}\` has been deleted`)
        )

        return reply
    }
}
