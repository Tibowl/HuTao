import { Message, Snowflake } from "discord.js"
import child_process from "child_process"

import Command from "../../utils/Command"
import client from "../../main"
import config from "../../data/config.json"
import { displayTimestamp, sendMessage } from "../../utils/Utils"

export default class Status extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Get bot status. Admins only.",
            usage: "status [more]",
            aliases: ["version"],
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (!config.admins.includes(message.author.id)) return sendMessage(message, "Admins only")
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
            const { heapTotal, heapUsed } = process.memoryUsage()
            return `${mem(heapUsed)}/${mem(heapTotal)}`
        }
        const getAdmins = async (): Promise<string> => {
            const users = config.admins.map(async (id) => client.users.fetch(id as Snowflake))
            return (await Promise.all(users)).map(user => user.tag).join(", ")
        }

        const stats = data.store.stats
        if (stats == undefined) return sendMessage(message, "Stats are unavailable, try again later")

        const abyss = client.data.getAbyssSchedules()

        const totalCommands = Object.keys(stats).map(k => Object.values(stats[k]).reduce((a, b) => a+b, 0)).reduce((a, b) => a+b, 0)
        return sendMessage(message, `Running on commit <${getVersion()}>
Memory heap usage: ${getMemoryUsage()}
Current uptime: ${formatTime(process.uptime())}
Cache: in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.
Total commands executed: ${totalCommands}
${args && args.length > 0 ? `
News: ${new Date(client.newsManager.lastFetched).toISOString()} (${displayTimestamp(new Date(client.newsManager.lastFetched))})

Artifact sets: ${Object.keys(client.data.artifacts).length}
Weapons: ${Object.keys(client.data.weapons).length}
Characters: ${Object.keys(client.data.getCharacters()).length}
Abyss floors: ${Object.keys(client.data.abyssFloors).length}
Abyss buffs: ${abyss.length} (until ${abyss[abyss.length - 1]?.end})
Emojis: ${Object.keys(client.data.emojis).length}
Resin: ${client.data.minutes_per_resin} m/resin; capped at ${client.data.max_resin}

Admins: ${await getAdmins()}
`:""}`)
    }
}
