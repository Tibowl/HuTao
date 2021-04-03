import log4js from "log4js"
import { DMChannel, GuildChannel } from "discord.js"
import client from "../main"

const Logger = log4js.getLogger("channelDelete")

export async function handle(channel: DMChannel | GuildChannel): Promise<void> {
    if (!(channel instanceof GuildChannel)) return

    const follows = client.followManager.getFollows(channel)
    if (follows.length > 0) {
        Logger.info(`Delete ${channel.id} - ${channel.name} in ${channel.guild.id}`)
        Logger.info(follows.map(f => `${f.category}: ${f.addedBy} in ${f.channelID}`).join(" - "))
        client.followManager.dropChannel(channel.id)
    }
}
