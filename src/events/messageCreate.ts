import log4js from "log4js"
import { DMChannel, Message, TextChannel } from "discord.js"
import Command from "../utils/Command"
import client from "../main"
import config from "../data/config.json"

const Logger = log4js.getLogger("message")

interface ParsedCommand {
    args: string[]
    command: string
    cmd: Command
}

function getCommand(message: Message): ParsedCommand | false {
    if (!message.content.toLowerCase().startsWith(config.prefix)) return false
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
    const command = args.shift()?.toLowerCase()
    if (!command) return false

    let cmd = client.commands.get(command)

    // If that command doesn't exist, try to find an alias
    if (!cmd) {
        cmd = client.commands.find((cmd: Command) => cmd.aliases.includes(command))

        // If that command doesn't exist, silently exit and do nothing
        if (!cmd)
            return false
    }
    return { args, command, cmd }
}

function addStats(msg: Message, cmdInfo: ParsedCommand): void {
    const { command, cmd } = cmdInfo
    const stats = client.data.store.stats || {}
    const cmdStats = stats[cmd.commandName.toLowerCase()] || {}

    cmdStats[command] = cmdStats[command] + 1 || 1

    stats[cmd.commandName.toLowerCase()] = cmdStats
    client.data.store.stats = stats
    client.data.saveStore()
}

async function handleCommand(message: Message, cmdInfo: ParsedCommand): Promise<boolean> {
    const { args, command, cmd } = cmdInfo
    try {
        const msg = cmd.run(message, args, command)
        if (!msg || message.channel.type == "DM") return true
        const reply = await msg
        if (!reply) return true

        if (!(reply instanceof Message)) {
            for (const r of reply)
                handleResponse(message, r)
            return true
        }

        handleResponse(message, reply)
    } catch (error) {
        Logger.error(error)
    }
    return true
}

function handleResponse(message: Message, reply: Message) {
    try {
        reply.awaitMessageComponent({
            filter: (interaction) => (interaction.user.id == message.author.id || config.admins.includes(interaction.user.id)),
            time: 60000
        }).then(async (first) => {
            if (first && reply.deletable && first.customId == "delete") {
                await reply.delete()
                client.recentMessages = client.recentMessages.filter(k => k != reply)
            }
        }).catch(async () => {
            client.recentMessages = client.recentMessages.filter(k => k != reply)

            const user = client.user
            if (user == undefined || reply.deleted) return
            await reply.edit({ components: [] })
        }).catch(error => {
            Logger.error(error)
        })
        client.recentMessages.push(reply)
    } catch (error) {
        Logger.error(error)
    }
}

export async function handle(message: Message): Promise<void> {
    if (message.author.bot) return

    const cmdInfo = await getCommand(message)

    if (cmdInfo && cmdInfo.cmd) {
        if (message.channel instanceof DMChannel)
            Logger.info(`${message.author.id} (${message.author.tag}) executes command in ${message.channel.recipient.tag}: ${message.content}`)
        else
            Logger.info(`${message.author.id} (${message.author.tag}) executes command in ${message.channel instanceof TextChannel ? message.channel.name : message.channel.type} (guild ${message.guild ? message.guild.id : "NaN"}): ${message.content}`)

        addStats(message, cmdInfo)
        await handleCommand(message, cmdInfo)
    } else if (message.channel.type === "DM") {
        Logger.info(`${message.author.id} (${message.author.tag}) sends message ${message.type} in dm: ${message.content}`)
    }
}
