import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { addArg, Bookmarkable, Colors, createTable, PAD_START, paginator, sendMessage, simplePaginator } from "../../utils/Utils"
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

    getWeaponsPages(weaponFilter: string[], starFilter: number[]): string[] {
        const { data } = client
        const weapons = Object.entries(data.weapons)
            .filter(([_, info]) => weaponFilter.length == 0 || weaponFilter.includes(info.weaponType))
            .filter(([_, info]) => starFilter.length == 0 || starFilter.includes(info.stars))
            .sort(([an, a],  [bn, b]) => b.stars - a.stars || a.weaponType.localeCompare(b.weaponType) || an.localeCompare(bn))
            .map(([name, info]) => `${info.stars}★ ${data.emoji(info.weaponType, true)}: **${name}**`)

        const pages: string[] = []
        let paging = "", c = 0
        for (const weapon of weapons) {
            if (paging.length + weapon.length > 1800 || ++c > 15) {
                pages.push(paging.trim())
                paging = weapon
                c = 1
            } else
                paging += "\n" + weapon
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getWeaponsPage(pages: string[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Weapons")
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages} - See '${config.prefix}help weapon' for more info about what you can do`)
            .setColor(Colors.GREEN)

        return embed
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { data } = client

        const weaponFilter: string[] = []
        for (const weaponType of weaponTypes)
            addArg(args, [`-${weaponType}`, `-${weaponType}s`], () => weaponFilter.push(weaponType))

        const starFilter: number[] = []
        for (const star of possibleStars)
            addArg(args, [`-${star}`, `-${star}*`], () => starFilter.push(star))

        if (args.length == 0) {
            const pages = this.getWeaponsPages(weaponFilter, starFilter)
            if (pages.length == 0) return sendMessage(message, "No character data loaded")

            await simplePaginator(message, (relativePage, currentPage, maxPages) => this.getWeaponsPage(pages, relativePage, currentPage, maxPages), pages.length)
            return undefined
        }

        let defaultPage: number | string = 0
        addArg(args, ["-basic", "-b"], () => defaultPage = "General")
        addArg(args, ["-stats", "-ascension", "-a", "-s", "-stat", "-asc", "-ascend"], () => defaultPage = "Stats")
        addArg(args, ["-refinements", "-r", "-refine"], () => defaultPage = "Refinements")
        addArg(args, ["-lore", "-l"], () => defaultPage = "Lore")
        addArg(args, ["-base", "-art"], () => defaultPage = "Art")
        addArg(args, ["-2nd", "-2"], () => defaultPage = "Art 2")

        const weapon = data.getWeaponByName(args.join(" "))
        if (weapon == undefined)
            return sendMessage(message, "Unable to find weapon")

        const hasRefinements = weapon.refinement.length > 0 && weapon.refinement[0].length > 0

        const pages: Bookmarkable[] = [{
            bookmarkEmoji: "📝",
            bookmarkName: "General",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getMainWeaponPage(weapon, rp, cp, mp)
        }, {
            bookmarkEmoji: "-",
            bookmarkName: "Stats",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getStatsWeaponPage(weapon, rp, cp, mp),
            invisible: true
        }]
        if (hasRefinements)
            pages.push({
                bookmarkEmoji: "🇷",
                bookmarkName: "Refinements",
                maxPages: 1,
                pages: (rp, cp, mp) => this.getRefinementWeaponPage(weapon, rp, cp, mp)
            })
        pages.push({
            bookmarkEmoji: "-",
            bookmarkName: "Lore",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getLoreWeaponPage(weapon, rp, cp, mp),
            invisible: true
        }, {
            bookmarkEmoji: "🎨",
            bookmarkName: "Art",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getArtWeaponPage(weapon, rp, cp, mp)
        }, {
            bookmarkEmoji: "-",
            bookmarkName: "Art 2",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getSecondArtWeaponPage(weapon, rp, cp, mp),
            invisible: true
        })

        await paginator(message, pages, defaultPage)
        return undefined
    }

    getMainWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const hasRefinements = weapon.refinement.length > 0 && weapon.refinement[0].length > 0
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)

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
        embed.addField("Upgrade material", `Ascensions: ${weapon.ascensions[2]?.cost.items.map(i => data.emoji(i.name)).join("")}`)
        return embed
    }

    getStatsWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)

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
    }

    getRefinementWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)

        embed.setTitle(`${weapon.name}: Refinements`)
        for (const ref of weapon.refinement)
            for (const [refinement, info] of Object.entries(ref))
                embed.addField(`${info.name} ${+refinement+1}`, info.desc)

        return embed
    }

    getLoreWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setTitle(`${weapon.name}: Lore`)
            .setDescription(weapon.lore)
        return embed
    }

    getArtWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setTitle(`${weapon.name}: Base`)
            .setDescription(`[Open image in browser](${weapon.icon})`)
            .setImage(weapon.icon)
        embed.thumbnail = null
        return embed
    }

    getSecondArtWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(weapon.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setTitle(`${weapon.name}: 2nd Ascension`)
            .setDescription(`[Open image in browser](${weapon.awakenIcon})`)
            .setImage(weapon.awakenIcon)
        embed.thumbnail = null
        return embed
    }
}
