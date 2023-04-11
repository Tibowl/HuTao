import { ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction, Message, PermissionFlagsBits, PermissionResolvable, TextChannel } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command, { CommandCategory } from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { findFuzzyBestCandidates, getUserID, sendMessage } from "../../utils/Utils"

const requiredPermissions: PermissionResolvable[] = [
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.UseExternalEmojis,
]

export default class Help extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Hidden",
            help: "Get some help.",
            usage: "help [command]",
            aliases: ["command", "commands", "h"],
            options: [{
                name: "name",
                description: "Name of the command",
                type: ApplicationCommandOptionType.String,
                autocomplete: true
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = client.commands.keyArray()
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                { name: "List all commands", value: "" },
                ...targetNames.filter((_, i) => i < 19).map(value => {
                    return { name: value, value }
                })
            ])
        }

        await source.respond(findFuzzyBestCandidates(targetNames, search, 20).map(value => {
            return { name: value, value }
        }))
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const command = options.getString("name")

        return this.run(source, command)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        const command = args.length > 0 ? args.join(" ") : undefined

        return this.run(source, command)
    }

    async run(source: CommandSource, name?: string | null): Promise<SendMessage | undefined> {
        const { commands } = client
        if (!name) {
            return this.sendCommands(source)
        }

        let commandName = name
        let command = client.commands.get(commandName)
        // Check aliases
        if (command == null)
            command = commands.find(k => (k.aliases||[]).includes(commandName))

        // Replace prefix
        commandName = commandName.replace(config.prefix, "")
        if (command == null)
            command = commands.find(k => k.commandName === commandName.replace(config.prefix, "") || (k.aliases||[]).includes(commandName.replace(config.prefix, "")))

        if (command == null)
            return sendMessage(source, "Command does not exist")

        return sendMessage(source, `${command.commandName} - ${command.help}

Usage: \`${config.prefix}${command.usage}\`${command.aliases ? `
Aliases: ${command.aliases.map(k => `\`${k}\``).join(", ")}` : "None"}`)
    }

    async sendCommands(source: CommandSource): Promise<SendMessage | undefined> {
        const { commands } = client

        const categorized: { [a in CommandCategory]: string[] } = {
            Character: [],
            Weapons: [],
            Artifact: [],
            News: [],
            Misc: [],
            Meta: [],
            Admin: [],
            Hidden: [],
        }
        commands.forEach(cmd => {
            const category = cmd?.category ?? "Meta"
            categorized[category].push(cmd.commandName)
        })

        const missingPerms: PermissionResolvable[] = []
        if (source.channel instanceof TextChannel) {
            const userPerms = await source.channel.permissionsFor(client.user ?? "")

            for (const permission of requiredPermissions)
                if (userPerms && !userPerms.has(permission)) {
                    missingPerms.push(permission)
                }
        }

        return sendMessage(source, `**Commands**: 

${Object.entries(categorized)
        .filter(([category]) =>
            !(category.toLowerCase() == "hidden" ||
            (!config.admins.includes(getUserID(source)) && category.toLowerCase() == "admin"))
        ).map(([category, items]) => `**${category}**
    ${items.sort((a, b) => a.localeCompare(b)).map(cmd => `${config.prefix}${cmd}`).join(", ")}`)
        .join("\n")}

*Some commands are also available on the website <${client.data.baseURL}>*
*Make sure to check out \`${config.prefix}help <command name>\` for more information about a specific command, you might find some useful shortcuts/tips (like command aliases/how most search commands support fuzzy search).*
*Any problems/suggestions? Check out \`${config.prefix}about\`.*${missingPerms.length > 0 ? `

**NOTE**: This bot is missing some permissions required for optimal usage, please add ${missingPerms.join(", ")}`: ""}`)
    }
}
