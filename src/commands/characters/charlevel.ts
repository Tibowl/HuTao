import { CommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import config from "../../data/config.json"
import { sendMessage } from "../../utils/Utils"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class CharacterLevelCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            usage: "charlevel <from level> [current level experience] [target level]",
            help: `Display experience and mora required until another level.

Example from just a level: \`${config.prefix}cl 60\`
Example with target level: \`${config.prefix}cl 60 70\`
Example with experience: \`${config.prefix}cl 60 1577 70\`
If no target level provided, assuming max for current ascension. If no current level experience provided, assuming 0.`,
            aliases: ["character-level", "clevel", "cl"],
            options: [{
                name: "current-level",
                description: "Current level",
                type: "NUMBER",
                required: true,
            }, {
                name: "target-level",
                description: "Target level (default: max level and next ascension)",
                type: "NUMBER"
            }, {
                name: "current-experience",
                description: "Current experience over current level (default: 0)",
                type: "NUMBER"
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const currentLevel = options.getNumber("current-level", true)
        const targetLevel = options.getNumber("target-level") ?? -1
        const currentExperience = options.getNumber("current-experience") ?? 0

        return this.run(source, currentLevel, targetLevel, currentExperience)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1 || args.length > 3)
            return this.sendHelp(source)

        let currentLevel = -1, currentExperience = 0, targetLevel = -1

        if (args.length > 1)
            targetLevel = parseInt(args.pop() ?? "")

        currentLevel = parseInt(args.shift() ?? "")

        if (args.length > 0)
            currentExperience = parseInt(args.pop()?.split("/")?.[0] ?? "")
        return this.run(source, currentLevel, targetLevel, currentExperience)
    }

    async run(source: CommandSource, currentLevel: number, targetLevel: number, currentExperience: number): Promise<SendMessage | undefined> {
        const { data } = client
        const maxLevel = data.characterLevels.length

        if (isNaN(targetLevel) || isNaN(currentLevel) || isNaN(currentExperience)
            || targetLevel > maxLevel || targetLevel < -1
            || currentLevel > maxLevel || currentLevel < 0
            || (targetLevel <= currentLevel && targetLevel !== -1))
            return this.sendHelp(source)

        if (targetLevel == -1) {
            const ascensions = data.getCharacters().sort((a, b) => b.ascensions.length - a.ascensions.length)[0].ascensions
            const nextAscension = ascensions.sort((a, b) => a.level - b.level).find(a => currentLevel < a.maxLevel)?.maxLevel

            if (nextAscension == undefined || nextAscension == maxLevel)
                return sendMessage(source, this.getCharLevelStuff(currentLevel, currentExperience, maxLevel))
            else
                return sendMessage(source, this.getCharLevelStuff(currentLevel, currentExperience, nextAscension) + "\n\n" + this.getCharLevelStuff(currentLevel, currentExperience, maxLevel))
        }

        return sendMessage(source, this.getCharLevelStuff(currentLevel, currentExperience, targetLevel))
    }


    getCharLevelStuff(currentLevel: number, currentExperience: number, targetLevel: number): string {
        const { data } = client
        const { characterLevels } = data

        if (currentLevel == 0) currentLevel = 1

        const ascensions = data.getCharacters().sort((a, b) => b.ascensions.length - a.ascensions.length)[0].ascensions

        let level = currentLevel, curLevelXP = currentExperience, xp = 0, purple = 0, red = 0, white = 0, leftover = 0

        while (level < targetLevel) {
            const nextAscension = ascensions.sort((a, b) => a.level - b.level).find(a => level < a.maxLevel)?.maxLevel

            if (nextAscension == undefined) break

            const currentXP = characterLevels
                .filter((_, i) => i >= level - 1 && i < Math.min(nextAscension, targetLevel) - 1)
                .reduce((p, acc) => p + acc, 0) - curLevelXP
            level = nextAscension

            let currentLeftover = currentXP

            const currentPurple = Math.floor(currentLeftover / 20000)
            currentLeftover -= currentPurple * 20000

            const currentRed = Math.floor(currentLeftover / 5000)
            currentLeftover -= currentRed * 5000

            const currentWhite = Math.floor(currentLeftover / 1000)
            currentLeftover -= currentWhite * 1000

            leftover += currentLeftover

            purple += currentPurple
            red += currentRed
            white += currentWhite

            xp += currentXP
            curLevelXP = 0
        }

        const mora = (xp - leftover) / 5

        return `From Lv. **${currentLevel}** (${currentExperience?.toLocaleString()}/${characterLevels[currentLevel-1]?.toLocaleString() ?? "???"} EXP) to Lv. **${targetLevel}** requires **${xp?.toLocaleString()}** EXP and **${mora?.toLocaleString()}** ${data.emoji("Mora", true)}.
    That is **${purple.toLocaleString()}** ${data.emoji("Hero's Wit", true)}, **${red.toLocaleString()}** ${data.emoji("Adventurer's Experience", true)}, **${white.toLocaleString()}** ${data.emoji("Wanderer's Advice", true)} and **${leftover.toLocaleString()}** EXP from enemies.`
    }
}
