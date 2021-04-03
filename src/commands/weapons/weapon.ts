import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { addArg, createTable, PAD_START, paginator } from "../../utils/Utils"
import { Weapon } from "../../utils/Types"
import config from "../../data/config.json"

const weaponTypes = Object.values(client.data.weapons)
    .map(c => c.weaponType)
    .filter((v, i, arr) => arr.indexOf(v) == i)
    .sort()

const possibleStars = Object.values(client.data.weapons)
    .map(c => c.stars)
    .filter((v, i, arr) => arr.indexOf(v) == i)
    .sort((a, b) => a-b)

export default class WeaponCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Weapons",
            usage: "weapon [name]",
            help: `Displays weapon information. If no name is provided, a list of all weapons will be displayed.
            
To directly skip to a certain section, one can use \`${config.prefix}w <name> -[basic|stats|refinements|lore|base|2nd]\` to directly skip to that page.

The list of weapons can be filtered by using \`${config.prefix}w -[${possibleStars.map(star => star + "*").join("|")}|${weaponTypes.map(e => e.toLowerCase()).join("|")}]\`, these can be combined.
Weapons listed will be from any of the searched stars AND from any of the listed weapon types.

Note: this command supports fuzzy search.`,
            aliases: ["weapons", "w", "weap"]
        })
    }

    weapons(weaponFilter: string[], starFilter: number[], page: number): MessageEmbed | undefined {
        const { data } = client
        const weapons = Object.entries(data.weapons)
            .filter(([_, info]) => weaponFilter.length == 0 || weaponFilter.includes(info.weaponType))
            .filter(([_, info]) => starFilter.length == 0 || starFilter.includes(info.stars))
            .sort(([an, a],  [bn, b]) => b.stars - a.stars || a.weaponType.localeCompare(b.weaponType) || an.localeCompare(bn))
            .map(([name, info]) => `${info.stars}★ ${data.emoji(info.weaponType, true)}: **${name}**`)

        const pages: string[] = []
        let paging = ""
        for (const weapon of weapons) {
            if (paging.length + weapon.length > 1000) {
                pages.push(paging.trim())
                paging = weapon
            } else
                paging += "\n" + weapon
        }
        if (paging.trim().length > 0) pages.push(paging)

        if (page >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Weapons")
            .setDescription(pages[page])
            .setFooter(`Page ${page + 1} / ${pages.length}`)
            .setColor("#00EA69")

        return embed
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        const { data } = client

        const weaponFilter: string[] = []
        for (const weaponType of weaponTypes)
            addArg(args, [`-${weaponType}`, `-${weaponType}s`], () => weaponFilter.push(weaponType))

        const starFilter: number[] = []
        for (const star of possibleStars)
            addArg(args, [`-${star}`, `-${star}*`], () => starFilter.push(star))

        if (args.length == 0) {
            const embed = this.weapons(weaponFilter, starFilter, 0)
            if (!embed) return message.channel.send("No weapon data loaded")

            const reply = await message.channel.send(embed)
            await paginator(message, reply, (page) => this.weapons(weaponFilter, starFilter, page))
            return reply
        }

        let defaultPage = 0
        addArg(args, ["-basic", "-b"], () => defaultPage = 0)
        addArg(args, ["-stats", "-ascension", "-a", "-s", "-stat", "-asc", "-ascend"], () => defaultPage = 1)
        addArg(args, ["-refinements", "-r", "-refine"], () => defaultPage = 2)
        addArg(args, ["-lore", "-l"], () => defaultPage = 3)
        addArg(args, ["-base", "-art"], () => defaultPage = 4)
        addArg(args, ["-2nd", "-2"], () => defaultPage = 5)

        const weapon = data.getWeaponByName(args.join(" "))
        if (weapon == undefined)
            return message.channel.send("Unable to find weapon")

        const hasRefinements = weapon.refinement.length > 0 && weapon.refinement[0].length > 0
        if (!hasRefinements && defaultPage > 2) defaultPage --


        const embed = this.getWeapon(weapon, defaultPage)
        if (!embed) return message.channel.send("No weapon data loaded")

        const reply = await message.channel.send(embed)
        await paginator(message, reply, (page) => this.getWeapon(weapon, page), undefined, defaultPage)
        return reply
    }

    getWeapon(weapon: Weapon, page: number): MessageEmbed | undefined {
        const { data } = client
        const hasRefinements = weapon.refinement.length > 0 && weapon.refinement[0].length > 0
        const embed = new MessageEmbed()
            .setColor("#07EADB")
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${page + 1} / ${hasRefinements ? 6 : 5}`)

        let currentPage = 0
        if (page == currentPage++) {
            const maxAscension = weapon.ascensions[weapon.ascensions.length - 1]
            embed.setTitle(`${weapon.name}: Basic info`)
                .setDescription(weapon.desc)
                .addField("Basics", `${weapon.stars}★ ${data.emoji(weapon.weaponType)}`)
                .addField("Base stats", `${
                    Object.entries(data.getWeaponStatsAt(weapon, 1, 0))
                        .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                        .join("\n")
                }`, true)
                .addField(`Lv. ${maxAscension.maxLevel} A${maxAscension.level} stats`, `${
                    Object.entries(data.getWeaponStatsAt(weapon, maxAscension.maxLevel, maxAscension.level))
                        .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                        .join("\n")
                }`, true)

            if (hasRefinements)
                embed.addField(`${weapon.refinement[0][0].name} (at R1)`, weapon.refinement[0][0].desc)

            return embed
            // eslint-disable-next-line no-dupe-else-if
        } else if (page == currentPage++) {
            const columns: string[] = []
            const rows: string[][] = []

            const addRow = (char: Weapon, level: number, ascension: number) => {
                const stats = data.getWeaponStatsAt(char, level, ascension)
                for (const key of Object.keys(stats))
                    if (!columns.includes(key))
                        columns.push(key)

                rows.push([level.toString(), ascension.toString(), ...columns.map(c => data.stat(c, stats[c]))])
            }

            let previousMax = 1
            for (const asc of weapon.ascensions) {
                addRow(weapon, previousMax, asc.level)
                previousMax = asc.maxLevel
                addRow(weapon, previousMax, asc.level)

                if (asc.cost.mora || asc.cost.items.length > 0)
                    embed.addField(`Ascension ${asc.level} costs`, data.getCosts(asc.cost), true)
            }

            embed.setTitle(`${weapon.name}: Ascensions + stats`)
                .setDescription("Weapon stats:\n```\n" + createTable(
                    ["Lvl", "Asc", ...columns.map(c => data.statName(c))],
                    rows,
                    [PAD_START]
                ) + "\n```")
                .setFooter(`${embed.footer?.text} - Use '${config.prefix}weaponstats ${weapon.name} [level] [A<ascension>]' for a specific level`)
            return embed
        // eslint-disable-next-line no-dupe-else-if
        } else if (hasRefinements && page == currentPage++) {
            embed.setTitle(`${weapon.name}: Refinements`)
            for (const ref of weapon.refinement)
                for (const [refinement, info] of Object.entries(ref))
                    embed.addField(`${info.name} ${+refinement+1}`, info.desc)

            return embed
            // eslint-disable-next-line no-dupe-else-if
        } else if (page == currentPage++) {
            embed.setTitle(`${weapon.name}: Lore`)
                .setDescription(weapon.lore)
            return embed
            // eslint-disable-next-line no-dupe-else-if
        } else if (page == currentPage++) {
            embed.setTitle(`${weapon.name}: Base`)
                .setDescription(`[Open image in browser](${weapon.icon})`)
                .setImage(weapon.icon)
            embed.thumbnail = null
            return embed
            // eslint-disable-next-line no-dupe-else-if
        } else if (page == currentPage++) {
            embed.setTitle(`${weapon.name}: 2nd Ascension`)
                .setDescription(`[Open image in browser](${weapon.awakenIcon})`)
                .setImage(weapon.awakenIcon)
            embed.thumbnail = null
            return embed
        }

        return undefined
    }
}
