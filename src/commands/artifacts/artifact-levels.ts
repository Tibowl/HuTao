import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { createTable, findFuzzy, PAD_START } from "../../utils/Utils"

export default class ArtifactLevelsCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Artifact",
            usage: "artifact-levels <main stat> [stars = 5]",
            help: `See artifact main stat level scaling.

Note: this command supports fuzzy search.`,
            aliases: ["artifactlevels", "artifact_levels", "arti-levels", "arti_levels", "main", "mainstat", "artimain", "artimainstat", "al", "am"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        const { data } = client

        const keys = Object.keys(data.artifactMainLevels)
        if (args.length == 0) {
            if (!keys) return message.channel.send("No artifact level data loaded")

            return await message.channel.send(`Usage: ${this.usage}

**List of main stats:**
${keys.join("\n")}`)
        }

        let level = 5
        if (!isNaN(parseInt(args[args.length - 1]))) {
            level = parseInt(args.pop() ?? "5")
        }

        const mainStat = findFuzzy(keys, args.join(" "))
        if (mainStat == undefined)
            return message.channel.send("Unable to find main stat")

        const levelData = data.artifactMainLevels[mainStat][level]
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

        return await message.channel.send(`**${mainStat}** main stat table for a **${level}**★ artifact:
\`\`\`
${createTable(
        ["Lvl", "Stat", "|", "Lvl", "Stat", "|", "Lvl", "Stat", "|", "Lvl", "Stat"],
        table,
        [PAD_START]
    )}
\`\`\``)
    }
}
