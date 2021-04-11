import client from "../main"
import log4js from "log4js"

const Logger = log4js.getLogger("ready")

let alreadyLoaded = false
export async function handle(): Promise<void> {
    Logger.info(`In ${(client.channels.cache).size} channels on ${(client.guilds.cache).size} servers, for a total of ${(client.users.cache).size} users.`)

    if (alreadyLoaded) return
    alreadyLoaded = true

    client.timerManager.init()
    client.tweetManager.init()

    if (client.user == null) return
    await client.user.setStatus("online")
}
