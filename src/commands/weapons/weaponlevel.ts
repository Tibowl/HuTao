import { CommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import config from "../../data/config.json"
import { sendMessage } from "../../utils/Utils"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class WeaponLevelCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Weapons",
            usage: "weaponlevel <star> <from level> [current level experience] [target level]",
            help: `Display experience and mora required until another level.

Example from just a level: \`${config.prefix}wl 5* 60\`
Example with target level: \`${config.prefix}wl 5* 60 70\`
Example with experience: \`${config.prefix}wl 5* 60 1577 70\`
If no target level provided, assuming max for current ascension. If no current level experience provided, assuming 0.`,
            aliases: ["weapon-level", "wlevel", "wl"],
            options: [{
                name: "stars",
                description: "Current level",
                type: "NUMBER",
                required: true,
            }, {
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

        const stars = options.getNumber("stars", true)
        const currentLevel = options.getNumber("current-level", true)
        const targetLevel = options.getNumber("target-level") ?? -1
        const currentExperience = options.getNumber("current-experience") ?? 0

        return this.run(source, stars, currentLevel, targetLevel, currentExperience)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 2 || args.length > 4)
            return this.sendHelp(source)

        let stars = -1, currentLevel = -1, currentExperience = 0, targetLevel = -1

        if (args.length > 2)
            targetLevel = parseInt(args.pop() ?? "")

        stars = parseInt(args.shift()?.replace("*", "") ?? "")
        currentLevel = parseInt(args.shift() ?? "")

        if (args.length > 0)
            currentExperience = parseInt(args.pop()?.split("/")?.[0] ?? "")

        return this.run(source, stars, currentLevel, targetLevel, currentExperience)
    }

    async run(source: CommandSource, stars: number, currentLevel: number, targetLevel: number, currentExperience: number): Promise<SendMessage | undefined> {
        const { data } = client
        const maxLevel = data.weaponLevels.length

        if (isNaN(targetLevel) || isNaN(currentLevel) || isNaN(currentExperience)
            || targetLevel > maxLevel || targetLevel < -1
            || currentLevel > maxLevel || currentLevel < 0
            || (targetLevel <= currentLevel && targetLevel !== -1)
            || stars <= 0 || stars > 5)
            return this.sendHelp(source)

        if (targetLevel == -1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ascensions = Object.values(data.weapons).filter(w => w.ascensions).sort((a, b) => b.ascensions?.length ?? 0 - (a.ascensions?.length ?? 0))[0].ascensions!
            const nextAscension = ascensions.sort((a, b) => a.level - b.level).find(a => currentLevel < a.maxLevel)?.maxLevel

            if (nextAscension == undefined || nextAscension == maxLevel)
                return sendMessage(source, this.getWeaponLevelStuff(stars, currentLevel, currentExperience, maxLevel))
            else
                return sendMessage(source, this.getWeaponLevelStuff(stars, currentLevel, currentExperience, nextAscension) + "\n\n" + this.getWeaponLevelStuff(stars, currentLevel, currentExperience, maxLevel))
        }

        return sendMessage(source, this.getWeaponLevelStuff(stars, currentLevel, currentExperience, targetLevel))
    }


    getWeaponLevelStuff(stars: number, currentLevel: number, currentExperience: number, targetLevel: number): string {
        const { data } = client
        const { weaponLevels } = data

        if (currentLevel == 0) currentLevel = 1

        const ascensions = Object.values(data.weapons).filter(w => w.ascensions).sort((a, b) => b.ascensions?.length ?? 0 - (a.ascensions?.length ?? 0)).find(w => w.stars == stars)?.ascensions

        if (ascensions == undefined) return `Unable to find a ${stars}★ weapon to get ascensions from...`

        let level = currentLevel, curLevelXP = currentExperience, xp = 0, mystic = 0, fine = 0, normal = 0, oneStarWeapon = 0, wasted = 0, currentTarget = 0

        while (level < targetLevel) {
            const nextAscension = ascensions.sort((a, b) => a.level - b.level).find(a => level < a.maxLevel)?.maxLevel

            if (nextAscension == undefined) break

            currentTarget = Math.min(nextAscension, targetLevel)

            const currentXP = weaponLevels
                .filter((_, i) => i >= level - 1 && i < currentTarget - 1)
                .map(wl => wl[stars - 1])
                .reduce((p, acc) => p + acc, 0) - curLevelXP
            level = nextAscension

            let currentLeftover = currentXP
            let currentOneStarWeapon = 0

            let currentMystic = Math.floor(currentLeftover / 10000)
            currentLeftover -= currentMystic * 10000

            let currentFine = Math.floor(currentLeftover / 2000)
            currentLeftover -= currentFine * 2000

            let currentNormal = Math.floor(currentLeftover / 400)
            currentLeftover -= currentNormal * 400

            if (currentLeftover > 0 && currentLeftover <= 200 && currentXP >= 600) {
                currentLeftover -= 600
                currentOneStarWeapon++
                currentLeftover += 400
                currentNormal--
            }
            if (currentLeftover > 0) {
                currentLeftover -= 400
                currentNormal++
            }

            while (currentNormal < 0) {
                currentNormal += 2000/400
                currentFine -= 1
            }

            while (currentFine < 0) {
                currentFine += 10000/2000
                currentMystic -= 1
            }

            wasted -= currentLeftover

            mystic += currentMystic
            fine += currentFine
            normal += currentNormal
            oneStarWeapon += currentOneStarWeapon

            xp += currentXP
            curLevelXP = 0
        }

        const mora = (xp + wasted) / 10

        return `From Lv. **${currentLevel}** (${currentExperience?.toLocaleString()}/${weaponLevels[currentLevel - 1]?.[stars - 1]?.toLocaleString() ?? "???"} EXP) to Lv. **${currentTarget}** requires **${xp?.toLocaleString()}** EXP and **${mora?.toLocaleString()}** ${data.emoji("Mora", true)}.
    That is **${mystic.toLocaleString()}** ${data.emoji("Mystic Enhancement Ore", true)}, **${fine.toLocaleString()}** ${data.emoji("Fine Enhancement Ore", true)}, **${normal.toLocaleString()}** ${data.emoji("Enhancement Ore", true)} and **${oneStarWeapon.toLocaleString()}**x 1★ Weapon(s). (Wastes **${wasted.toLocaleString()}** EXP)`
    }
}
