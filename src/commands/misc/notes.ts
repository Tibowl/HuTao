import { ApplicationCommandOptionType, ChatInputCommandInteraction, EmbedBuilder, Guild, Message, PermissionFlagsBits, User } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, Note, SendMessage } from "../../utils/Types"
import { Colors, getCategory, getUser, sendMessage, simplePaginator } from "../../utils/Utils"


export default class Notes extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `View, create, edit or delete notes.

Notes are either per category (when used in a guild) or per user (when used in DM's).

Requires "Manage Messages" permissions to create/edit/remove, but anyone can see.`,
            usage: "notes list | notes create <name> | notes edit <id> <name> | notes remove <id>",
            aliases: ["no", "note"],
            options: [{
                name: "list",
                description: "View notes",
                type: ApplicationCommandOptionType.Subcommand,
            }, {
                name: "create",
                description: "Create a new note",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "name",
                    description: "Name to show",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }]
            }, {
                name: "edit",
                description: "Edits a note by ID",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to edit",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }, {
                    name: "name",
                    description: "New name",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }]
            }, {
                name: "remove",
                description: "Removes a note by ID",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to remove",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }]
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source
        const sub = options.getSubcommand()

        if (sub == "list")
            return this.runList(source)
        else if (sub == "create")
            return this.runCreate(source, options.getString("name", true))
        else if (sub == "edit")
            return this.runEdit(source, options.getInteger("id", true), options.getString("name", true))
        else if (sub == "remove")
            return this.runRemove(source, options.getInteger("id", true))
        else
            return sendMessage(source, `Unknown subcommand ${sub}`)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        const sub = args[0]?.toLowerCase() ?? "list"
        args.shift()

        if (["list", "l"].includes(sub)) {
            return this.runList(source)
        } else if (["create", "add", "a", "c", "new"].includes(sub)) {
            if (args.length < 1) return this.sendHelp(source)

            return this.runCreate(source, args.join(" "))
        } else if (["remove", "delete", "d", "r"].includes(sub)) {
            if (args.length < 1) return this.sendHelp(source)

            const id = parseInt(args[0])
            if (isNaN(id)) return this.sendHelp(source)
            return this.runRemove(source, id)
        } else if (["edit", "e", "change", "update"].includes(sub)) {
            if (args.length < 1) return this.sendHelp(source)

            const id = parseInt(args[0])
            if (isNaN(id)) return this.sendHelp(source)

            const name = args.slice(1).join(" ")
            return this.runEdit(source, id, name)
        } else {
            return sendMessage(source, `Unknown subcommand \`${sub}\``)
        }
    }

    async runList(source: CommandSource): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const { guildID, categoryID, name } = this.getContext(source, user)

        const notes = notesManager.getNotes(guildID, categoryID)

        const pages = this.getNotePages(notes)
        if (pages.length == 0) return sendMessage(source, `There are no notes saved here, see \`${config.prefix}help noteadd\` on how to add a note`)

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getNotePage(pages, name, relativePage, currentPage, maxPages), pages.length)
        return undefined
    }

    async runCreate(source: CommandSource, subject: string): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const { guild, guildID, categoryID, name } = this.getContext(source, user)

        const response = this.testPermissions(guild, source)
        if (response) return response

        const notes = notesManager.getNotes(guildID, categoryID)
        if (notes.length >= 50) return sendMessage(source, `You can only have up to 50 notes in ${name}, see \`${config.prefix}notes\` for which you have`)

        if (subject.length > 256) return sendMessage(source, "Note name too long")

        let id = 1
        while (notes.some(r => r.id == id) || notesManager.getNoteById(guildID, categoryID, id))
            id++

        notesManager.addNote(guildID, categoryID, id, subject, user.id)
        const reply = sendMessage(source, new EmbedBuilder()
            .setTitle(`Created note #${id} in ${name}`)
            .setColor(Colors.GREEN)
            .setDescription(`The note #${id}: \`${subject}\` has been created`)
        )

        return reply
    }
    async runRemove(source: CommandSource, id: number): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const { guild, guildID, categoryID, name } = this.getContext(source, user)

        const response = this.testPermissions(guild, source)
        if (response) return response

        const note = notesManager.getNoteById(guildID, categoryID, id)
        if (note == undefined) return sendMessage(source, `Could not find note #${id} in ${name}`)

        notesManager.deleteNote(guildID, categoryID, id, user.id)
        const reply = sendMessage(source, new EmbedBuilder()
            .setTitle(`Deleted note #${id} in ${name}`)
            .setColor(Colors.RED)
            .setDescription(`The note #${id}: \`${note.subject}\` has been deleted`)
        )

        return reply
    }


    async runEdit(source: CommandSource, id: number, newSubject: string): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const { guild, guildID, categoryID, name } = this.getContext(source, user)

        const response = this.testPermissions(guild, source)
        if (response) return response

        if (newSubject.length > 256) return sendMessage(source, "Note name too long")

        const note = notesManager.getNoteById(guildID, categoryID, id)
        if (note == undefined) return sendMessage(source, `Could not find note #${id} in ${name}`)

        notesManager.editNote(guildID, categoryID, id, newSubject, user.id)
        const reply = sendMessage(source, new EmbedBuilder()
            .setTitle(`Edited note #${id} in ${name}`)
            .setColor(Colors.ORANGE)
            .setDescription(`Original: \`${note.subject}\`
New: \`${newSubject}\``)
        )

        return reply
    }

    private testPermissions(guild: Guild | null, source: CommandSource) {
        if (guild)
            if (source.member == undefined || typeof source.member.permissions == "string")
                return sendMessage(source, "Unable to check permissions.", undefined, true)
            else if (!source.member.permissions.has(PermissionFlagsBits.ManageMessages))
                return sendMessage(source, "You do not have have \"Manage Messages\" permissions in here.", undefined, true)
    }

    private getContext(source: CommandSource, user: User) {
        const guild = source.guild
        const category = getCategory(source)
        const name = category?.name ?? guild?.name ?? user.username

        const guildID = guild?.id ?? "user"
        const categoryID = category?.id ?? guild?.id ?? user.id
        return { guild, guildID, categoryID, name }
    }

    private getNotePages(notes: Note[]): string[] {
        const pages: string[] = []
        let paging = "", c = 0
        for (const note of notes) {
            const subject = `\`#${note.id}\`: \`${note.subject}\``
            if (paging.length + subject.length > 1800 || ++c > 10) {
                pages.push(paging.trim())
                paging = subject
                c = 1
            } else
                paging += "\n" + subject
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    private getNotePage(pages: string[], name: string, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new EmbedBuilder()
            .setTitle(`Notes in ${name}`)
            .setDescription(pages[relativePage])
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
            .setColor(Colors.GREEN)

        return embed
    }
}
