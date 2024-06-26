import Discord, { ActivityType, ClientEvents, GatewayIntentBits, Partials } from "discord.js"
import fs from "fs"
import { join } from "path"

import DataManager from "./utils/DataManager"
import TimerManager from "./utils/TimerManager"

import TweetManager from "./utils/TweetManager"

import log4js from "log4js"
import config from "./data/config.json"
import Command from "./utils/Command"
import FollowManager from "./utils/FollowManager"
import NewsManager from "./utils/NewsManager"
import NotesManager from "./utils/NotesManager"
import ReminderManager from "./utils/ReminderManager"
import WebManager from "./utils/WebManager"

const Logger = log4js.getLogger("main")


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

    commands: Map<string, Command> = new Map()
    recentMessages: Discord.Message[] = []

    constructor() {
        super({
            intents: [
                // For handling commands in DMs
                GatewayIntentBits.DirectMessages,
                // For follow stuff, also required for guild messages for some reason?
                GatewayIntentBits.Guilds
            ],
            partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
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
                    type: ActivityType.Listening
                }]
            }
        })
    }

    async init(): Promise<void> {
        fs.readdir(join(__dirname, "./events/"), (err, files) => {
            if (err) return Logger.error(err)
            files.forEach(file => {
                const event: any = require(`./events/${file}`)
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
                    const props: any = require(`${dir}${file}`)
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
