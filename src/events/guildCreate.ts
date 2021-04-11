import log4js from "log4js"
import { Guild } from "discord.js"

const Logger = log4js.getLogger("join")

export function handle(guild: Guild): void {
    Logger.info(`Joined ${guild.id} - ${guild.name} with ${guild.memberCount} members`)
}
