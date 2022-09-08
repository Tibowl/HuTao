import client from "../main"
import log4js from "log4js"
import { ApplicationCommandData } from "discord.js"
import config from "../data/config.json"
import Command from "../utils/Command"

const Logger = log4js.getLogger("ready")

let alreadyLoaded = false
export async function handle(): Promise<void> {
    Logger.info(`In ${(client.channels.cache).size} channels on ${(client.guilds.cache).size} servers, for a total of ${(client.users.cache).size} users.`)

    if (alreadyLoaded) return
    alreadyLoaded = true

    client.timerManager.init()
    client.tweetManager.init()
    client.newsManager.fetchNews().catch(e => Logger.error(e))

    if (!client.application?.owner) await client.application?.fetch()
    const cmds = client.commands.array()

    try {
        if (config.production) {
            await client.application?.commands.set(cmds.filter(cmd => cmd.category !== "Admin").map(mapCommand))
            await client.guilds.cache.get("616569685370077192")?.commands.set(cmds.filter(cmd => cmd.category === "Admin").map(mapCommand))
        } else
            await client.guilds.cache.get("247122362942619649")?.commands.set(cmds.map(mapCommand))
        Logger.info(`Commands registered for ${config.production}`)
    } catch (error) {
        Logger.error("Unnable to register commands")
    }
}

function mapCommand(cmd: Command): ApplicationCommandData {
    const help = (cmd.shortHelp ?? cmd.help).split("\n")[0]
    const name = cmd.commandName

    if (help.length > 99)
        Logger.error(`${name}'s description is too long'`)

    return {
        name,
        options: cmd.options,
        description: help.substring(0, 100),
    }
}
