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
    if (!message.content.toLowerCase().startsWith(config.prefix)) return false
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
        if (!msg || message.channel.type !== "text") return true
        const reply = await msg
        if (!reply) return true
        if (!(reply instanceof Message)) return true

        try {
            await reply.react("❌")
            reply.awaitReactions(
                (reaction, user) => reaction.emoji.name == "❌" && (user.id == message.author.id || config.admins.includes(user.id)),
                { max: 1, time: 60000, errors: ["time", "messageDelete", "channelDelete", "guildDelete"] }
            ).then((collected) => {
                client.recentMessages = client.recentMessages.filter(k => k != reply)
                if (collected && collected.size > 0 && reply.deletable) {
                    reply.delete()
                }
            }).catch(() => {
                client.recentMessages = client.recentMessages.filter(k => k != reply)

                const user = client.user
                if (user == undefined || reply.deleted) return
                reply?.reactions?.cache.map((reaction) => client.user && reaction.users.cache.has(client.user.id) && reaction.emoji.name == "❌" ? reaction.users.remove(user) : undefined)
            })
            client.recentMessages.push(reply)
        } catch (error) {
            if (reply.editable)
                reply.edit(reply.content + "\n\nUnable to add ❌ reaction, please contact admins of this discord guild to give this bot permission to add reactions. Doing so, will allow users to delete bot replies within some time.")
            else
                Logger.error(error)
        }
    } catch (error) {
        Logger.error(error)
    }
    return true
}

export async function handle(message: Message): Promise<void> {
    if (message.author.bot) return

    const cmdInfo = await getCommand(message)

    if (cmdInfo && cmdInfo.cmd) {
        if (message.channel instanceof DMChannel)
            Logger.info(`${message.author.id} (${message.author.tag}) executes command in ${message.channel.recipient.tag}: ${message.content}`)
        else
            Logger.info(`${message.author.id} (${message.author.tag}) executes command in ${message.channel instanceof TextChannel ? message.channel.name : message.channel.type} (guild ${message.guild ? message.guild.id : "NaN"}): ${message.content}`)

        handleCommand(message, cmdInfo)
        addStats(message, cmdInfo)
    } else if (message.channel.type === "dm") {
        Logger.info(`${message.author.id} (${message.author.tag}) sends message ${message.type} in dm: ${message.content}`)
    }
}
