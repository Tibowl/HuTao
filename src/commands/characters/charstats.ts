import { AutocompleteInteraction, CommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { createTable,  findFuzzyBestCandidates,  PAD_START, sendMessage } from "../../utils/Utils"
import { Character, CommandSource, SendMessage } from "../../utils/Types"
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
            aliases: ["character-stats", "cstat", "cs"],
            options: [{
                name: "name",
                description: "Name of the character",
                type: "STRING",
                required: true,
                autocomplete: true
            }, {
                name: "level",
                description: "Level to show stats at (shows a handful of levels by default)",
                type: "NUMBER"
            }, {
                name: "ascension",
                description: "Ascension to show stats at (shows all applicable ascensions by default)",
                type: "NUMBER"
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = client.data.getCharacters().map(c => c.name)
        const search = source.options.getFocused().toString()

        await source.respond(findFuzzyBestCandidates(targetNames, search, 20).map(value => {
            return { name: value, value }
        }))
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const name = options.getString("name", true)
        const level = options.getNumber("level") ?? -1
        const ascension = options.getNumber("ascension") ?? -1

        return this.run(source, name, level, ascension)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1)
            return this.sendHelp(source)

        let level = -1, ascension = -1

        while (args.length > 1)
            if (args[args.length - 1].match(/^\d+$/))
                level = parseInt(args.pop() ?? "-1")
            else if (args[args.length - 1].match(/^A\d+$/i))
                ascension = parseInt(args.pop()?.replace(/a/i, "") ?? "-1")
            else break

        const name = args.join(" ")
        return this.run(source, name, level, ascension)
    }

    async run(source: CommandSource, name: string, level: number, ascension: number): Promise<SendMessage | undefined> {
        const { data } = client

        const char = data.getCharacterByName(name)
        if (char == undefined)
            return sendMessage(source, "Unable to find character")

        return sendMessage(source, this.getCharStats(char, level, ascension))
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
