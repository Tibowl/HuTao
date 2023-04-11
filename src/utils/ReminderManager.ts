import log4js from "log4js"
import SQLite, { RunResult } from "better-sqlite3"
import { ensureDirSync } from "fs-extra"

import { Reminder } from "./Types"
import { timeLeft } from "./Utils"
import { Snowflake } from "discord.js"

const Logger = log4js.getLogger("ReminderManager")
ensureDirSync("data/")

export default class ReminderManager {
    sql = new SQLite("data/reminders.db")

    constructor() {
        Logger.info("Initializing data")
        process.on("exit", () => this.sql.close())
        process.on("SIGHUP", () => process.exit(128 + 1))
        process.on("SIGINT", () => process.exit(128 + 2))
        process.on("SIGTERM", () => process.exit(128 + 15))

        this.sql.exec("CREATE TABLE IF NOT EXISTS reminders (global_id INTEGER PRIMARY KEY, id INTEGER, user TEXT, subject TEXT, timestamp INTEGER, duration INTEGER)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS reminders_timestamp ON reminders (timestamp)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS reminders_user ON reminders (user)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS reminders_userid ON reminders (id, user)")

        this.addReminderStatement = this.sql.prepare("INSERT OR REPLACE INTO reminders (id, user, subject, timestamp, duration) VALUES (@id, @user, @subject, @timestamp, @duration)")
        this.getReminderByIdStatement = this.sql.prepare("SELECT * FROM reminders WHERE id = @id AND user = @user")
        this.deleteReminderByIdStatement = this.sql.prepare("DELETE FROM reminders WHERE id = @id AND user = @user AND timestamp = @timestamp")
        this.getUserReminders = this.sql.prepare("SELECT id, user, subject, timestamp, duration FROM reminders WHERE user = @user")
        this.getUpcomingRemindersStatement = this.sql.prepare("SELECT * FROM reminders WHERE timestamp < @end")
    }

    private addReminderStatement: SQLite.Statement
    addReminder(id: number, subject: string, userid: Snowflake, duration: number, timestamp: number): Reminder {
        const reminder: Reminder = {
            id,
            subject,
            user: userid,
            timestamp,
            duration
        }

        this.addReminderStatement.run(reminder)
        Logger.info(`Added new reminder for ${userid} @ ${reminder.timestamp} in ${timeLeft(duration)}: ${subject}`)
        return reminder
    }

    private getUpcomingRemindersStatement: SQLite.Statement
    getUpcomingReminders(end: number): Reminder[] {
        return this.getUpcomingRemindersStatement.all({
            end
        }) as Reminder[]
    }

    private getUserReminders: SQLite.Statement
    getReminders(userid: string): Reminder[] {
        return this.getUserReminders.all({
            user: userid
        }) as Reminder[]
    }

    private getReminderByIdStatement: SQLite.Statement
    getReminderById(userid: string, id: number): Reminder | undefined {
        return this.getReminderByIdStatement.get({
            user: userid,
            id
        }) as Reminder | undefined
    }

    private deleteReminderByIdStatement: SQLite.Statement
    deleteReminder(userid: string, id: number, timestamp: number): RunResult {
        return this.deleteReminderByIdStatement.run({
            user: userid,
            id,
            timestamp
        })
    }
}
