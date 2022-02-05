import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, getCategory, getUser, sendMessage } from "../../utils/Utils"


export default class NoteAdd extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Create a new note, notes are per category or user.

Requires "Manage Messages" permissions to add, but anyone can see.`,
            usage: "noteadd <name>",
            aliases: ["na", "createnote", "addnote", "newnote", "an"],
            options: [{
                name: "name",
                description: "Name to show",
                type: "STRING",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const name = options.getString("name", true)

        return this.run(source, name)
    }

    async runMessage(source: Message|CommandInteraction, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1) return this.sendHelp(source)

        const name = args.join(" ")

        return this.run(source, name)
    }

    async run(source: CommandSource, subject: string): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const guild = source.guild
        const category = getCategory(source)
        const name = category?.name ?? guild?.name ?? user.username

        const guildID = guild?.id ?? "user"
        const categoryID = category?.id ?? guild?.id ?? user.id

        if (guild)
            if (source.member == undefined || typeof source.member.permissions == "string")
                return sendMessage(source, "Unable to check permissions.", undefined, true)
            else if (!source.member.permissions.has("MANAGE_MESSAGES"))
                return sendMessage(source, "You do not have have \"Manage Messages\" permissions in here.", undefined, true)

        const notes = notesManager.getNotes(guildID, categoryID)
        if (notes.length >= 50) return sendMessage(source, `You can only have up to 50 notes in ${name}, see \`${config.prefix}notes\` for which you have`)

        if (subject.length > 256) return sendMessage(source, "Note name too long")


        let id = 1
        while (notes.some(r => r.id == id) || notesManager.getNoteById(guildID, categoryID, id))
            id++

        notesManager.addNote(guildID, categoryID, id, subject, user.id)
        const reply = sendMessage(source, new MessageEmbed()
            .setTitle(`Created note #${id} in ${name}`)
            .setColor(Colors.GREEN)
            .setDescription(`The note #${id}: \`${subject}\` has been created`)
        )

        return reply
    }
}
