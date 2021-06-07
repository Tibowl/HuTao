import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { createTable,  PAD_START, sendMessage } from "../../utils/Utils"
import { Character } from "../../utils/Types"
import config from "../../data/config.json"

export default class CharacterStatsCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            usage: "charstats <name> [level] A[ascension]",
            help: `Display character stats.

Example for a specific level: \`${config.prefix}cs Hu Tao 84\`
Example for a specific ascension: \`${config.prefix}cs Hu Tao A6\`
Example for a specific level and ascension: \`${config.prefix}cs Hu Tao 80 A6\`
If no level or ascension is provided, the levels around all the ascensions will be shown.

Note: this command supports fuzzy search.`,
            aliases: ["character-stats", "cstat", "cs"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        const { data } = client

        if (args.length < 1)
            return this.sendHelp(message)

        let level = -1, ascension = -1

        while (args.length > 1)
            if (args[args.length - 1].match(/^\d+$/))
                level = parseInt(args.pop() ?? "-1")
            else if (args[args.length - 1].match(/^A\d+$/i))
                ascension = parseInt(args.pop()?.replace(/a/i, "") ?? "-1")
            else break

        const char = data.getCharacterByName(args.join(" "))
        if (char == undefined)
            return sendMessage(message, "Unable to find character")

        return sendMessage(message, this.getCharStats(char, level, ascension))
    }


    getCharStats(char: Character, searchLevel: number, searchAscension: number): string {
        const { data } = client
        const columns: string[] = []
        const rows: string[][] = []

        const addRow = (char: Character, level: number, ascension: number) => {
            const stats = data.getCharStatsAt(char, level, ascension)
            for (const key of Object.keys(stats))
                if (!columns.includes(key))
                    columns.push(key)

            const row = [level.toString(), ascension.toString(), ...columns.map(c => data.stat(c, stats[c]))]
            if ((level == searchLevel || searchLevel == -1) &&
                 (ascension == searchAscension || searchAscension == -1))
                rows.push(row)
        }


        let previousMax = 1
        for (const asc of char.ascensions) {
            if (searchLevel == -1 && searchAscension == -1) {
                addRow(char, previousMax, asc.level)
                previousMax = asc.maxLevel
                addRow(char, previousMax, asc.level)
            } else {
                for (let i = previousMax; i <= asc.maxLevel; i++)
                    addRow(char, i, asc.level)
                previousMax = asc.maxLevel
            }
        }
        if (rows.length == 0)
            return `No stats found for filters ${searchLevel == -1 ? "" : `level = ${searchLevel} `}${searchAscension == -1 ? "" : `ascension = ${searchAscension} `}`

        return `**${char.name}** stats:
\`\`\`
${createTable(
        ["Lvl", "Asc", ...columns.map(c => data.statName(c))],
        rows,
        [PAD_START]
    ) }
\`\`\``
    }
}
