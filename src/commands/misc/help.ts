import Command from "../../utils/Command"
import Discord from "discord.js"
import client from "../../main"
import { CommandCategory } from "../../utils/Command"
import config from "../../data/config.json"

export default class Help extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Hidden",
            help: "Get some help.",
            usage: "help [command]",
            aliases: ["command", "commands"]
        })
    }

    run(message: Discord.Message, args: string[]): Promise<Discord.Message | Discord.Message[]> {
        const { commands } = client
        if (!args || args.length < 1) {
            const categorized: { [a in CommandCategory]: string[] } = {
                Character: [],
                Weapons: [],
                Artifact: [],
                News: [],
                Time: [],
                Misc: [],
                Admin: [],
                Hidden: [],
            }
            commands.forEach(cmd => {
                const category = cmd?.category ?? "Misc"
                categorized[category].push(cmd.commandName)
            })

            return message.channel.send(`**Commands**: 

${Object.entries(categorized)
        .filter(([category]) =>
            !(category.toLowerCase() == "hidden" ||
                (!config.admins.includes(message.author.id) && category.toLowerCase() == "admin"))
        ).map(([category, items]) => `**${category}**
    ${items.sort((a, b) => a.localeCompare(b)).map(cmd => `${config.prefix}${cmd}`).join(", ")}`)
        .join("\n")}

*Use \`${config.prefix}help <command name>\` for more information about a specific command.*
*You can invite this bot to your server with \`${config.prefix}invite\`.*`)
        }

        let commandName = args[0]

        let command = client.commands.get(commandName)
        // Check aliases
        if (command == null)
            command = commands.find(k => (k.aliases||[]).includes(commandName))

        // Replace prefix
        commandName = commandName.replace(config.prefix, "")
        if (command == null)
            command = commands.find(k => k.commandName === commandName.replace(config.prefix, "") || (k.aliases||[]).includes(commandName.replace(config.prefix, "")))

        if (command == null)
            return message.reply("Command does not exist")

        if (command.help == false)
            return message.channel.send(`${command.commandName}`)

        return message.channel.send(`${command.commandName} - ${command.help}

Usage: \`${config.prefix}${command.usage}\`${command.aliases ? `
Aliases: ${command.aliases.map(k => `\`${k}\``).join(", ")}` : "None"}`)
    }
}
