import bodyParser from "body-parser"
import express, { Express, NextFunction, Request, Response } from "express"
import log4js from "log4js"
import config from "../data/config.json"
import client from "../main"
import { parseDuration } from "./Utils"

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
                next()
                return
            }
            Logger.error("Wrong authorization used!")

            res.sendStatus(403)
        })

        this.app.get("/reminders/:user/get", this.getReminder)
        this.app.post("/reminders/:user/create", this.addReminder)
        this.app.post("/reminders/:user/delete", this.deleteReminder)
        this.app.post("/testmessage/:user", this.testMessage)

        this.app.listen(config.webPort)
    }

    getReminder(req: Req<{ user: string }>, res: Res): void {
        const userid = req.params.user

        Logger.info(`Getting reminders for ${userid} from remote`)
        res.send(client.reminderManager.getReminders(req.params.user))
    }

    addReminder(req: Req<{ user: string }, { name?: string, duration?: string}>, res: Res): void {
        const { reminderManager } = client
        const userid = req.params.user
        const name = req.body.name
        const time = req.body.duration

        if (name == undefined || time == undefined || name.length > 128) {
            res.sendStatus(400)
            return
        }

        const reminders = reminderManager.getReminders(userid)
        const duration = parseDuration(time)

        let id = 1
        while (reminders.some(r => r.id == id) || reminderManager.getReminderById(userid, id))
            id++

        if (id > 25 || duration <= 0) {
            res.sendStatus(400)
            return
        }

        Logger.info(`Adding reminder for ${userid} from remote`)

        const r = reminderManager.addReminder(id, name, userid, duration, Date.now() + duration)
        res.send(r)
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

    async testMessage(req: Req<{ user: string }>, res: Res): Promise<void> {
        const userid = req.params.user
        const user = await client.users.fetch(userid)
        await user.send("This is a test")
        res.sendStatus(200)
    }
}
