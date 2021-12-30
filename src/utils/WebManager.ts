import bodyParser from "body-parser"
import express, { Express, NextFunction, Request, Response } from "express"
import log4js from "log4js"
import config from "../data/config.json"
import client from "../main"

const Logger = log4js.getLogger("WebManager")

type Req<T, U = unknown> = Request<T, unknown, U, unknown, Record<string, unknown>>
type Res = Response<unknown, Record<string, unknown>>

export default class WebManager {
    app: Express

    constructor() {
        Logger.info("Starting server")
        this.app = express()

        this.app.use(bodyParser.json())
        this.app.use((req: Req<unknown>, res: Res, next: NextFunction) => {
            if (req.headers.authorization === config.web) {
                Logger.info("Wrong authorization used!")
                next()
                return
            }

            res.sendStatus(403)
        })

        this.app.get("/reminders/:user/get", this.getReminder)
        this.app.post("/reminders/:user/create", this.addReminder)
        this.app.post("/reminders/:user/delete", this.deleteReminder)

        this.app.listen(config.webPort)
    }

    getReminder(req: Req<{ user: string }>, res: Res): void {
        res.send(client.reminderManager.getReminders(req.params.user))
    }

    addReminder(req: Req<{ user: string }, { subject?: string, duration?: number, timestamp?: number}>, res: Res): void {
        const { reminderManager } = client
        const userid = req.params.user
        const subject = req.body.subject
        const duration = req.body.duration
        const timestamp = req.body.timestamp

        if (subject == undefined || duration == undefined || timestamp == undefined) {
            res.sendStatus(400)
            return
        }

        Logger.info(`Adding reminder for ${userid} from remote`)
        const reminders = reminderManager.getReminders(userid)

        let id = 1
        while (reminders.some(r => r.id == id) || reminderManager.getReminderById(userid, id))
            id++

        reminderManager.addReminder(id, subject, userid, duration, timestamp)
        res.sendStatus(200)
    }

    deleteReminder(req: Req<{ user: string }, { id?: number, timestamp?: number }>, res: Res): void {
        const { reminderManager } = client
        const userid = req.params.user
        const reminders = reminderManager.getReminders(userid)
        const id = req.body.id
        const timestamp = req.body.timestamp

        if (id == undefined || timestamp == undefined) {
            res.sendStatus(400)
            return
        }

        const reminder = reminders.find(r => r.id == id && r.timestamp == timestamp)

        if (!reminder) {
            res.sendStatus(404)
            return
        }
        Logger.info(`Deleting reminder for ${userid} from remote`)

        reminderManager.deleteReminder(userid, id, timestamp)
        res.sendStatus(200)
    }
}
