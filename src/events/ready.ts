import client from "../main"
import log4js from "log4js"
// import { ApplicationCommandData } from "discord.js"

const Logger = log4js.getLogger("ready")

let alreadyLoaded = false
export async function handle(): Promise<void> {
    Logger.info(`In ${(client.channels.cache).size} channels on ${(client.guilds.cache).size} servers, for a total of ${(client.users.cache).size} users.`)

    if (alreadyLoaded) return
    alreadyLoaded = true

    client.timerManager.init()
    client.tweetManager.init()
    client.newsManager.fetchNews().catch(e => Logger.error(e))


    await client.user?.setStatus("online")

    /*
    if (!client.application?.owner) await client.application?.fetch()
    const cmds: ApplicationCommandData[] = client.commands.array().map(cmd => {
        return {
            name: cmd.commandName,
            description: cmd.help.substring(0, 80) // TODO: check which commands
        }
    })

    await client.application?.commands.set(cmds)
    Logger.info("Commands registered")
    */
}
