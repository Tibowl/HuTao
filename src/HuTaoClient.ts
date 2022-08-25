import Discord, { ClientEvents, Intents } from "discord.js"
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
import NewsManager from "./utils/NewsManager"
import ReminderManager from "./utils/ReminderManager"
import WebManager from "./utils/WebManager"
import NotesManager from "./utils/NotesManager"

const Logger = log4js.getLogger("main")
const intents = new Intents()
intents.add(
    // For handling commands in DMs
    "DIRECT_MESSAGES",
    // For follow stuff, also required for guild messages for some reason?
    "GUILDS",
    // For handling commands in guilds
    "GUILD_MESSAGES",
)

const filterAll = {
    filter: () => () => config.production,
    interval: 5 * 60
}

export default class HuTaoClient extends Discord.Client {
    data: DataManager = new DataManager()
    timerManager: TimerManager = new TimerManager()
    followManager: FollowManager = new FollowManager()
    reminderManager: ReminderManager = new ReminderManager()
    notesManager: NotesManager = new NotesManager()

    tweetManager: TweetManager = new TweetManager()
    newsManager: NewsManager = new NewsManager()
    webManager: WebManager = new WebManager()

    commands: Enmap<string, Command> = new Enmap()
    recentMessages: Discord.Message[] = []

    constructor() {
        super({
            intents,
            partials: ["CHANNEL", "MESSAGE", "USER", "GUILD_MEMBER"],
            shards: "auto",
            sweepers: {
                emojis: filterAll,
                guildMembers: filterAll,
                messages: filterAll,
                stickers: filterAll,
                users: filterAll
            },
            allowedMentions: {
                parse: [],
                repliedUser: false,
                roles: [],
                users: []
            },
            presence: {
                status: "online",
                activities: [{
                    name: config.activity,
                    type: "LISTENING"
                }]
            }
        })
    }

    async init(): Promise<void> {
        fs.readdir(join(__dirname, "./events/"), (err, files) => {
            if (err) return Logger.error(err)
            files.forEach(file => {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const event = require(`./events/${file}`)
                const eventName = file.split(".")[0] as keyof ClientEvents
                this.on(eventName, event.handle)
            })
        })

        const knownCommands: string[] = []
        const readDir = (dir: string): void => {
            fs.readdir(join(__dirname, dir), (err, files) => {
                if (err) return Logger.error(err)
                files.forEach(file => {
                    if (!(file.endsWith(".js") || file.endsWith(".ts"))) return readDir(dir + file + "/")
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const props = require(`${dir}${file}`)
                    const commandName = file.split(".")[0]
                    Logger.info(`Loading ${commandName}`)

                    const command: Command = new (props.default)(commandName)
                    // Check if command is already registered
                    if (knownCommands.includes(commandName.toLowerCase()))
                        Logger.error(`${commandName} already exists!`)
                    knownCommands.push(commandName.toLowerCase())

                    // Check if any of the aliases are already registered
                    for (const alias of command.aliases) {
                        if (knownCommands.includes(alias.toLowerCase()))
                            Logger.error(`${commandName} is trying to register an alias that's already registered: ${alias}`)

                        knownCommands.push(alias.toLowerCase())
                    }

                    this.commands.set(commandName, command)
                })
            })
        }
        readDir("./commands/")

        await this.login(config.token)
    }
}
