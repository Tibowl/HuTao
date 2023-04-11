import { ApplicationCommandOptionType, ChatInputCommandInteraction, Message } from "discord.js"

import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { createTable, findFuzzy, PAD_START, sendMessage } from "../../utils/Utils"

export default class ArtifactLevelsCommand extends Command {
    constructor(name: string) {
        const { data } = client
        const keys = Object.keys(data.artifactMainLevels)

        super({
            name,
            category: "Artifact",
            usage: "artifact-levels <main stat> [stars = 5]",
            help: `See artifact main stat level scaling.
**List of main stats:**
    ${keys.join("\n")}
Note: this command supports fuzzy search.`,
            aliases: ["artifactlevels", "artifact_levels", "arti-levels", "arti_levels", "main", "mainstat", "artimain", "artimainstat", "al", "am"],
            options: [{
                name: "mainstat",
                description: "Main stat of artifact",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: keys.map(k => {
                    return {
                        name: k,
                        value: k
                    }
                })
            }, {
                name: "stars",
                description: "Rarity of the artifact (default: 5)",
                type: ApplicationCommandOptionType.Integer
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const mainStat = options.getString("mainstat", true)
        const stars = options.getInteger("stars") ?? 5

        return this.run(source, mainStat, stars)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length == 0)
            return await this.sendHelp(source)

        const { data } = client
        const keys = Object.keys(data.artifactMainLevels)
        if (!keys) return sendMessage(source, "No artifact level data loaded", undefined, true)

        let stars = 5
        if (!isNaN(parseInt(args[args.length - 1])))
            stars = parseInt(args.pop() ?? "5")

        if (args.length == 0)
            return await this.sendHelp(source)

        const mainStat = findFuzzy(keys, args.join(" "))
        if (mainStat == undefined)
            return sendMessage(source, "Unable to find main stat", undefined, true)

        return this.run(source, mainStat, stars)
    }

    async run(source: CommandSource, mainStat: string, stars: number): Promise<SendMessage | undefined> {
        const { data } = client

        const levelData = data.artifactMainLevels[mainStat][stars]
        if (levelData == undefined)
            return sendMessage(source, `Unable to find \`${stars}\`★ stats for \`${mainStat}\``, undefined, true)

        const entries = Object.entries(levelData)

        const table = []
        let currentLine = []
        for (const entry of entries) {
            currentLine.push(...entry)
            if (parseInt(entry[0]) % 4 == 3) {
                table.push(currentLine)
                currentLine = []
            } else (currentLine.push("|"))
        }
        table.push(currentLine)

        return await sendMessage(source, `**${mainStat}** main stat table for a **${stars}**★ artifact:
\`\`\`
${createTable(
        ["Lvl", "Stat", "|", "Lvl", "Stat", "|", "Lvl", "Stat", "|", "Lvl", "Stat"],
        table,
        [PAD_START]
    )}
\`\`\``)
    }
}
