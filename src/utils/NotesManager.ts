import SQLite from "better-sqlite3"
import { ensureDirSync } from "fs-extra"
import log4js from "log4js"
import { Note } from "./Types"


const Logger = log4js.getLogger("NotesManager")
ensureDirSync("data/")

export default class NotesManager {
    sql = new SQLite("data/notes.db")

    constructor() {
        Logger.info("Initializing data")
        process.on("exit", () => this.sql.close())
        process.on("SIGHUP", () => process.exit(128 + 1))
        process.on("SIGINT", () => process.exit(128 + 2))
        process.on("SIGTERM", () => process.exit(128 + 15))

        this.sql.exec("CREATE TABLE IF NOT EXISTS notes (global_id INTEGER PRIMARY KEY, guild_id TEXT, category_id TEXT, id INTEGER, user TEXT, subject TEXT, timestamp INTEGER)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS notes_category ON notes (guild_id, category_id)")

        this.addNotesStatement = this.sql.prepare("INSERT OR REPLACE INTO notes (guild_id, category_id, id, user, subject, timestamp) VALUES (@guild_id, @category_id, @id, @user, @subject, @timestamp)")
        this.getNoteByCategoryStatement = this.sql.prepare("SELECT * FROM notes WHERE guild_id = @guild_id AND category_id = @category_id")
        this.getNoteByIdStatement = this.sql.prepare("SELECT * FROM notes WHERE guild_id = @guild_id AND category_id = @category_id AND id = @id")
        this.deleteNoteStatement = this.sql.prepare("DELETE FROM notes WHERE guild_id = @guild_id AND category_id = @category_id AND id = @id")
        this.editNoteStatement = this.sql.prepare("UPDATE notes SET subject = @subject WHERE guild_id = @guild_id AND category_id = @category_id AND id = @id")
    }

    private addNotesStatement: SQLite.Statement
    addNote(guildID: string, categoryID: string, id: number, subject: string, userId: string): Note {
        const note: Note = {
            guild_id: guildID,
            category_id: categoryID,
            id,
            subject,
            user: userId,
            timestamp: Date.now()
        }

        this.addNotesStatement.run(note)
        Logger.info(`Added new note for ${userId} in ${guildID} / ${categoryID} #${id}: ${subject}`)
        return note
    }

    private getNoteByCategoryStatement: SQLite.Statement
    getNotes(guildId: string, categoryId: string): Note[] {
        return this.getNoteByCategoryStatement.all({
            guild_id: guildId,
            category_id: categoryId,
        })
    }

    private getNoteByIdStatement: SQLite.Statement
    getNoteById(guildId: string, categoryId: string, id: number): Note {
        return this.getNoteByIdStatement.get({
            guild_id: guildId,
            category_id: categoryId,
            id
        })
    }

    private deleteNoteStatement: SQLite.Statement
    deleteNote(guildId: string, categoryId: string, id: number, userId: string): void {
        this.deleteNoteStatement.run({
            guild_id: guildId,
            category_id: categoryId,
            id
        })
        Logger.info(`Deleted note by ${userId} in ${guildId} / ${categoryId} #${id}`)
    }

    private editNoteStatement: SQLite.Statement
    editNote(guildId: string, categoryId: string, id: number, newSubject: string, userId: string): void {
        this.editNoteStatement.run({
            guild_id: guildId,
            category_id: categoryId,
            id,
            subject: newSubject
        })
        Logger.info(`Edited note by ${userId} in ${guildId} / ${categoryId} #${id}: ${newSubject}`)
    }
}
