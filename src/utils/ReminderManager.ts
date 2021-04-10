import log4js from "log4js"
import SQLite, { RunResult } from "better-sqlite3"
import { ensureDirSync } from "fs-extra"

import { Reminder } from "./Types"
import { timeLeft } from "./Utils"

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

        this.sql.exec("CREATE TABLE IF NOT EXISTS reminders (id INT, user TEXT, subject TEXT, timestamp INT, duration INT, PRIMARY KEY (id, user))")

        this.addReminderStatement = this.sql.prepare("INSERT OR REPLACE INTO reminders (id, user, subject, timestamp, duration) VALUES (@id, @user, @subject, @timestamp, @duration)")
        this.getReminderByIdStatement = this.sql.prepare("SELECT * FROM reminders WHERE id = @id AND user = @user")
        this.deleteReminderByIdStatement = this.sql.prepare("DELETE FROM reminders WHERE id = @id AND user = @user AND timestamp = @timestamp")
        this.getUserReminders = this.sql.prepare("SELECT * FROM reminders WHERE user = @user")
        this.getUpcomingRemindersStatement = this.sql.prepare("SELECT * FROM reminders WHERE timestamp < @end")
    }

    private addReminderStatement: SQLite.Statement
    addReminder(id: number, subject: string, userid: string, duration: number): Reminder {
        const reminder: Reminder = {
            id,
            subject,
            user: userid,
            timestamp: Date.now() + duration,
            duration
        }

        Logger.info(`Adding new reminder for ${userid} @ ${reminder.timestamp} in ${timeLeft(duration)}: ${subject}`)
        this.addReminderStatement.run(reminder)
        return reminder
    }

    private getUpcomingRemindersStatement: SQLite.Statement
    getUpcomingReminders(end: number): Reminder[] {
        return this.getUpcomingRemindersStatement.all({
            end
        })
    }

    private getUserReminders: SQLite.Statement
    getReminders(userid: string): Reminder[] {
        return this.getUserReminders.all({
            user: userid
        })
    }

    private getReminderByIdStatement: SQLite.Statement
    getReminderById(userid: string, id: number): Reminder | undefined {
        return this.getReminderByIdStatement.get({
            user: userid,
            id
        })
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
