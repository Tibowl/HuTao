import log4js from "log4js"
import { CommandInteraction, Message } from "discord.js"

import Command from "../utils/Command"
import client from "../main"
import config from "../data/config.json"
import { CommandResponse } from "./Types"

const Logger = log4js.getLogger("commands")

interface ParsedCommand {
    command: string
    cmd: Command
}

export function getCommand(command: string): ParsedCommand | false {
    let cmd = client.commands.get(command)

    // If that command doesn't exist, try to find an alias
    if (!cmd) {
        cmd = client.commands.find((cmd: Command) => cmd.aliases.includes(command))

        // If that command doesn't exist, silently exit and do nothing
        if (!cmd)
            return false
    }
    return { command, cmd }
}

export function addStats(cmdInfo: ParsedCommand): void {
    const { command, cmd } = cmdInfo
    const stats = client.data.store.stats || {}
    const cmdStats = stats[cmd.commandName.toLowerCase()] || {}

    cmdStats[command] = cmdStats[command] + 1 || 1

    stats[cmd.commandName.toLowerCase()] = cmdStats
    client.data.store.stats = stats
    client.data.saveStore()
}

export async function handleCommand(cmdInfo: ParsedCommand, interaction: CommandInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runInteraction(interaction, command)
        if (!msg || interaction.channel?.type == "DM") return
        const id = interaction.user.id
        const midTime = Date.now()
        await handleStuff(id, msg)
        const endTime = Date.now()
        Logger.info(`[DEBUG] ${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
    true
}

export async function handleLegacyCommand(cmdInfo: ParsedCommand, message: Message, args: string[]): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runMessage(message, args, command)
        const id = message.author.id
        const midTime = Date.now()
        await handleStuff(id, msg)
        const endTime = Date.now()
        Logger.info(`[DEBUG] ${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - message.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

async function handleStuff(id: string, msg: CommandResponse): Promise<void> {
    if (!msg) return
    let reply
    try {
        reply = await msg
    } catch (error) {
        Logger.error("handleStuff", error)
    }
    if (!reply) return

    if (!(reply instanceof Message) && !(Array.isArray(reply))) {
        Logger.info(`API message: ${reply.content}`)
        return
    }

    if (!(reply instanceof Message)) {
        for (const r of reply)
            handleResponse(id, r)
        return
    }

    handleResponse(id, reply)
    return
}

export function handleResponse(id: string, reply: Message): void {
    try {
        reply.awaitMessageComponent({
            filter: (interaction) => (interaction.user.id == id || config.admins.includes(interaction.user.id)),
            time: 60000
        }).then(async (first) => {
            if (first && reply.deletable && first.customId == "delete") {
                await reply.delete()
                client.recentMessages = client.recentMessages.filter(k => k != reply)
            }
        }).catch(async () => {
            client.recentMessages = client.recentMessages.filter(k => k != reply)

            const user = client.user
            if (user == undefined || reply.deleted || !reply.editable || reply.components.length == 0) return
            await reply.edit({ components: [] })
        }).catch(error => {
            Logger.error(error)
        })
        client.recentMessages.push(reply)
    } catch (error) {
        Logger.error(error)
    }
}
