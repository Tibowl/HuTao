import Discord, { ClientEvents } from "discord.js"
import Enmap from "enmap"
import fs from "fs"
import { join } from "path"

import DataManager from "./utils/DataManager"
import TimerManager from "./utils/TimerManager"

import TweetManager from "./utils/TweetManager"

import config from "./data/config.json"
import log4js from "log4js"
import Command from "./utils/Command"
import FollowManager from "./utils/FollowManager"

const Logger = log4js.getLogger("main")

export default class HuTaoClient extends Discord.Client {
    data: DataManager = new DataManager()
    timerManager: TimerManager = new TimerManager()
    followManager: FollowManager = new FollowManager()

    tweetManager: TweetManager = new TweetManager()

    commands: Enmap<string, Command> = new Enmap()
    recentMessages: Discord.Message[] = []

    constructor(options?: Discord.ClientOptions | undefined) {
        super(options)
    }

    init(): void {
        fs.readdir(join(__dirname, "./events/"), (err, files) => {
            if (err) return Logger.error(err)
            files.forEach(file => {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const event = require(`./events/${file}`)
                const eventName = file.split(".")[0] as keyof ClientEvents
                this.on(eventName, event.handle)
            })
        })

        const readDir = (dir: string): void => {
            fs.readdir(join(__dirname, dir), (err, files) => {
                if (err) return Logger.error(err)
                files.forEach(file => {
                    if (!(file.endsWith(".js") || file.endsWith(".ts"))) return readDir(dir + file + "/")
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const props = require(`${dir}${file}`)
                    const commandName = file.split(".")[0]
                    Logger.info(`Loading ${commandName}`)
                    this.commands.set(commandName, new (props.default)(commandName))
                })
            })
        }
        readDir("./commands/")

        this.login(config.token)
    }
}
