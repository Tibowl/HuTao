import child_process from "child_process"
import { ApplicationCommandOptionType, ChatInputCommandInteraction, Message, Snowflake } from "discord.js"

import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { displayTimestamp, sendMessage } from "../../utils/Utils"

export default class Status extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Get bot status. Admins only.",
            usage: "status [more]",
            aliases: ["version"],
            options: [{
                name: "expanded",
                description: "Show more information",
                type: ApplicationCommandOptionType.Boolean,
                required: false
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id, source.options.getBoolean("expanded") ?? false)

    }
    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id, args && args.length > 0)
    }

    async run(source: CommandSource, id: string, moreInfo: boolean): Promise<SendMessage | undefined> {
        if (!config.admins.includes(id)) return sendMessage(source, "Admins only")
        const { data } = client

        const formatTime = (sec: number): string => {
            const p = (t: number): string => t.toString().padStart(2, "0")

            const d = Math.floor(sec / (3600*24))
            const h = Math.floor(sec % (3600*24) / (3600))
            const m = Math.floor(sec % (3600) / 60)
            const s = Math.floor(sec % 60)

            return `${d}d${p(h)}h${p(m)}m${p(s)}s`
        }

        const getVersion = (): string => `https://github.com/Tibowl/HuTao/commit/${child_process.execSync("git rev-parse HEAD").toString().trim()}`
        const getMemoryUsage = (): string => {
            const mem = (bytes: number): string => `${(bytes/10e6).toFixed(2)} MB`
            const { heapTotal, heapUsed, rss } = process.memoryUsage()
            return `${mem(heapUsed)}/${mem(heapTotal)} (${mem(rss)})`
        }
        const getAdmins = async (): Promise<string> => {
            const users = config.admins.map(async (id) => client.users.fetch(id as Snowflake))
            return (await Promise.all(users)).map(user => user.tag).join(", ")
        }

        const stats = data.store.stats
        if (stats == undefined) return sendMessage(source, "Stats are unavailable, try again later")

        const abyss = client.data.getAbyssSchedules()

        const totalCommands = Object.keys(stats).map(k => Object.values(stats[k]).reduce((a, b) => a+b, 0)).reduce((a, b) => a+b, 0)
        return sendMessage(source, `Running on commit <${getVersion()}>
Memory heap usage: ${getMemoryUsage()}
Current uptime: ${formatTime(process.uptime())}
Ping: ${client.ws.ping.toFixed(1)}ms
Cache: in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.
Total commands executed: ${totalCommands}
${moreInfo ? `
News: ${new Date(client.newsManager.lastFetched).toISOString()} (${displayTimestamp(new Date(client.newsManager.lastFetched))})

Artifact sets: ${Object.keys(client.data.artifacts).length}
Weapons: ${Object.keys(client.data.weapons).length}
Released Characters: ${Object.keys(client.data.getReleasedCharacters()).length}
Characters: ${Object.keys(client.data.getCharacters()).length}
Abyss floors: ${Object.keys(client.data.abyssFloors).length}
Abyss buffs: ${abyss.length} (until ${abyss[abyss.length - 1]?.end})
Emojis: ${Object.keys(client.data.emojis).length}
Resin: ${client.data.minutes_per_resin} m/resin; capped at ${client.data.max_resin}

Admins: ${await getAdmins()}
`:""}`, undefined, true)
    }
}
