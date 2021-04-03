import log4js from "log4js"
import { Guild } from "discord.js"
import client from "../main"

const Logger = log4js.getLogger("left")

export async function handle(guild: Guild): Promise<void> {
    Logger.info(`Left ${guild.id} - ${guild.name} with ${guild.memberCount} members`)
    const following = client.followManager.following(guild)
    if (following.length > 0) {
        Logger.info(following.map(f => `${f.category} @ ${f.channelID}`).join(" - "))
        client.followManager.dropGuild(guild.id)
    }
}
