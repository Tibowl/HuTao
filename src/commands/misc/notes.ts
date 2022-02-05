import { CommandInteraction, Message, MessageEmbed } from "discord.js"
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
            help: `View notes, notes are per category or user.

Requires "Manage Messages" permissions to add, but anyone can see.`,
            usage: "notes",
            aliases: ["viewnotes", "no"],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async runMessage(source: Message|CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        const { notesManager } = client
        const user = getUser(source)

        const guild = source.guild
        const category = getCategory(source)
        const name = category?.name ?? guild?.name ?? user.username

        const guildID = guild?.id ?? "user"
        const categoryID = category?.id ?? guild?.id ?? user.id

        const notes = notesManager.getNotes(guildID, categoryID)

        const pages = this.getNotePages(notes)
        if (pages.length == 0) return sendMessage(source, `There are no notes saved here, see \`${config.prefix}help noteadd\` on how to add a note`)

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getNotePage(pages, name, relativePage, currentPage, maxPages), pages.length)
        return undefined
    }

    getNotePages(notes: Note[]): string[] {
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

    getNotePage(pages: string[], name: string, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle(`Notes in ${name}`)
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setColor(Colors.GREEN)

        return embed
    }
}
