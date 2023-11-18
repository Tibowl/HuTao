import { ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, Message } from "discord.js"

import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage, Weapon } from "../../utils/Types"
import { addArg, Bookmarkable, Colors, createTable, findFuzzyBestCandidatesForAutocomplete, getLink, getLinkToGuide, PAD_START, paginator, sendMessage, simplePaginator, urlify } from "../../utils/Utils"

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
            aliases: ["weapons", "w", "weap"],
            options: [{
                name: "name",
                description: "Weapon name",
                type: ApplicationCommandOptionType.String,
                autocomplete: true,
                required: false
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = Object.keys(client.data.weapons)
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                { name: "List all weapons", value: "" },
                ...targetNames.filter((_, i) => i < 19).map(value => {
                    return { name: value, value }
                })
            ])
        }

        const args = search.split(/ +/g)
        const lastWord = args.pop()
        if (lastWord?.startsWith("-")) {
            const foundChar = args.filter(x => !x.startsWith("-")).join("")

            let targets = ["-basic", "-stats", "-refinements", "-lore", "-base", "-2nd"]
            if (foundChar == "")
                targets = [...weaponTypes, ...possibleStars.map(n => `${n}*`)].map(x => `-${x.toLowerCase()}`)

            return await source.respond(findFuzzyBestCandidatesForAutocomplete(targets, lastWord, 20).map(value => {
                value = `${args.join(" ")} ${value}`
                return { name: value, value }
            }))
        }

        await source.respond(findFuzzyBestCandidatesForAutocomplete(targetNames, search, 20).map(value => {
            return { name: value, value }
        }))
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, (source.options.getString("name") ?? "").split(/ +/g))

    }
    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, args)
    }

    async run(source: CommandSource, args: string[]): Promise<SendMessage | undefined> {
        const { data } = client

        const weaponFilter: string[] = []
        for (const weaponType of weaponTypes)
            addArg(args, [`-${weaponType}`, `-${weaponType}s`], () => weaponFilter.push(weaponType))

        const starFilter: number[] = []
        for (const star of possibleStars)
            addArg(args, [`-${star}`, `-${star}*`], () => starFilter.push(star))


        let defaultPage: number | string = 0
        addArg(args, ["-basic", "-b"], () => defaultPage = "General")
        addArg(args, ["-stats", "-ascension", "-a", "-s", "-stat", "-asc", "-ascend"], () => defaultPage = "Stats")
        addArg(args, ["-refinements", "-r", "-refine"], () => defaultPage = "Refinements")
        addArg(args, ["-lore", "-l"], () => defaultPage = "Lore")
        addArg(args, ["-base", "-art"], () => defaultPage = "Art")
        addArg(args, ["-2nd", "-2"], () => defaultPage = "Art 2")

        const name = args.join(" ")
        if (name.length == 0) {
            const pages = this.getWeaponsPages(weaponFilter, starFilter)
            if (pages.length == 0) return sendMessage(source, "No weapon data loaded")

            await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getWeaponsPage(pages, relativePage, currentPage, maxPages), pages.length)
            return undefined
        }

        const weapon = data.getWeaponByName(name)
        if (weapon == undefined)
            return sendMessage(source, "Unable to find weapon")

        const hasRefinements = weapon.refinements && weapon.refinements.length > 0

        const pages: Bookmarkable[] = [{
            bookmarkEmoji: "📝",
            bookmarkName: "General",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getMainWeaponPage(weapon, rp, cp, mp)
        }]
        if (weapon.weaponCurve)
            pages.push({
                bookmarkEmoji: "-",
                bookmarkName: "Stats",
                maxPages: 1,
                pages: (rp, cp, mp) => this.getStatsWeaponPage(weapon, rp, cp, mp),
                invisible: true
            })
        if (hasRefinements)
            pages.push({
                bookmarkEmoji: "🇷",
                bookmarkName: "Refinements",
                maxPages: 1,
                pages: (rp, cp, mp) => this.getRefinementWeaponPage(weapon, rp, cp, mp)
            })
        if (weapon.lore)
            pages.push({
                bookmarkEmoji: "-",
                bookmarkName: "Lore",
                maxPages: 1,
                pages: (rp, cp, mp) => this.getLoreWeaponPage(weapon, rp, cp, mp),
                invisible: true
            })
        pages.push({
            bookmarkEmoji: "🎨",
            bookmarkName: "Art",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getArtWeaponPage(weapon, rp, cp, mp)
        })
        if (weapon.awakenIcon)
            pages.push({
                bookmarkEmoji: "-",
                bookmarkName: "Art 2",
                maxPages: 1,
                pages: (rp, cp, mp) => this.getSecondArtWeaponPage(weapon, rp, cp, mp),
                invisible: true
            })

        await paginator(source, pages, defaultPage)
        return undefined
    }


    getWeaponsPages(weaponFilter: string[], starFilter: number[]): string[] {
        const { data } = client
        const weapons = Object.entries(data.weapons)
            .filter(([_, info]) => weaponFilter.length == 0 || weaponFilter.includes(info.weaponType))
            .filter(([_, info]) => starFilter.length == 0 || starFilter.includes(info.stars))
            .sort(([an, a],  [bn, b]) => b.stars - a.stars || a.weaponType.localeCompare(b.weaponType) || an.localeCompare(bn))
            .map(([name, info]) => `${info.stars}★ ${data.emoji(info.weaponType, true)}: **${name}**${info.placeholder ? " [Not yet available]" : ""}`)

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

    getWeaponsPage(pages: string[], relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new EmbedBuilder()
            .setTitle("Weapons")
            .setURL(`${client.data.baseURL}weapons`)
            .setDescription(pages[relativePage])
            .setFooter({ text: `Page ${currentPage} / ${maxPages} - See '${config.prefix}help weapon' for more info about what you can do` })
            .setColor(Colors.GREEN)

        return embed
    }

    getMainWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        const { data } = client
        const hasRefinements = weapon.refinements && weapon.refinements.length > 0
        const embed = new EmbedBuilder()
            .setTitle(`${weapon.name}: Basic info`)
            .setURL(`${data.baseURL}weapons/${urlify(weapon.name, false)}`)
            .setColor(Colors.AQUA)
            .setThumbnail(getLink(weapon.icon))
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
            .setDescription((weapon.desc ? weapon.desc : "") + ((weapon.placeholder || !weapon.desc) ? "\n\n*This weapon is currently not yet available.*" : ""))
            .addFields({ name: "Basics", value: `${weapon.stars}★ ${data.emoji(weapon.weaponType)}`, inline: (weapon.placeholderStats && !weapon.weaponCurve) ? true : false })

        const maxAscension = weapon.ascensions?.[weapon.ascensions.length - 1]
        if (weapon.weaponCurve && maxAscension)
            embed
                .addFields({
                    name: "Base stats",
                    value: Object.entries(data.getWeaponStatsAt(weapon, 1, 0))
                        .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                        .join("\n"),
                    inline: true
                }, {
                    name: `Lv. ${maxAscension.maxLevel} A${maxAscension.level} stats`,
                    value: Object.entries(data.getWeaponStatsAt(weapon, maxAscension.maxLevel, maxAscension.level))
                        .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                        .join("\n"),
                    inline: true
                })
        else if (weapon.placeholderStats) {
            embed.addFields({
                name: `Lv. ${weapon.placeholderStats.level} stats`,
                value: Object.entries(weapon.placeholderStats.stats)
                    .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                    .join("\n"),
                inline: true
            })
        }
        if (weapon.refinements && hasRefinements)
            embed.addFields({ name: `${weapon.refinements[0].name} (at R1)`, value: weapon.refinements[0].desc })
        if (weapon.ascensionCosts)
            embed.addFields({ name: "Upgrade material", value: `Ascensions: ${[
                weapon.ascensionCosts.mapping.WeaponAsc2,
                weapon.ascensionCosts.mapping.EnemyDropTierA1,
                weapon.ascensionCosts.mapping.EnemyDropTierB1,
            ].map(i => data.emoji(i)).join("")}` })


        const guides = data.getGuides("weapon", weapon.name).map(({ guide, page }) => getLinkToGuide(guide, page)).join("\n")

        if (guides)
            embed.addFields({ name: "Guides", value: guides })

        return embed
    }

    getStatsWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        const { data } = client
        const embed = new EmbedBuilder()
            .setColor(Colors.AQUA)
            .setThumbnail(getLink(weapon.icon))
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })

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
        if (weapon.ascensionCosts) {
            const costs = data.getCostsFromTemplate(weapon.ascensionCosts)

            for (const asc of weapon.ascensions ?? []) {
                addRow(weapon, previousMax, asc.level)
                previousMax = asc.maxLevel
                addRow(weapon, previousMax, asc.level)

                const cost = costs[asc.level]
                if (cost.mora || cost.items.length > 0)
                    embed.addFields({ name: `Ascension ${asc.level} costs`, value: data.getCosts(cost), inline: true })
            }
        }

        embed.setTitle(`${weapon.name}: Ascensions + stats`)
            .setURL(`${data.baseURL}weapons/${urlify(weapon.name, false)}#stats`)
            .setDescription("Weapon stats:\n```\n" + createTable(
                ["Lvl", "Asc", ...columns.map(c => data.statName(c))],
                rows,
                [PAD_START]
            ) + "\n```")
            .setFooter({ text: `${embed.data.footer?.text} - Use '${config.prefix}weaponstats ${weapon.name} [level] [A<ascension>]' for a specific level` })
        return embed
    }

    getRefinementWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        const { data } = client
        const embed = new EmbedBuilder()
            .setColor(Colors.AQUA)
            .setThumbnail(getLink(weapon.icon))
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })

        embed.setTitle(`${weapon.name}: Refinements`)
            .setURL(`${data.baseURL}weapons/${urlify(weapon.name, false)}#refinements`)
        for (const [refinement, info] of Object.entries(weapon.refinements ?? []))
            embed.addFields({ name: `${info.name} R${+refinement+1}`, value: info.desc })

        return embed
    }

    getLoreWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        const { data } = client
        const embed = new EmbedBuilder()
            .setColor(Colors.AQUA)
            .setThumbnail(getLink(weapon.icon))
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
            .setTitle(`${weapon.name}: Lore`)
            .setURL(`${data.baseURL}weapons/${urlify(weapon.name, false)}#lore`)
            .setDescription(weapon.lore ?? "Unavailable")
        return embed
    }

    getArtWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        const { data } = client
        const embed = new EmbedBuilder()
            .setColor(Colors.AQUA)
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
            .setTitle(`${weapon.name}: Base`)
            .setURL(`${data.baseURL}weapons/${urlify(weapon.name, false)}#media`)
            .setDescription(`[Open image in browser](${data.baseURL}${getLink(weapon.icon)})`)
            .setImage(getLink(weapon.icon))
            .setThumbnail(null)
        return embed
    }

    getSecondArtWeaponPage(weapon: Weapon, relativePage: number, currentPage: number, maxPages: number): EmbedBuilder | undefined {
        const { data } = client

        if (!weapon.awakenIcon)
            return new EmbedBuilder()
                .setColor(Colors.RED)
                .setTitle(`${weapon.name}: 2nd Ascension`)
                .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
                .setDescription("Unable to load")

        const embed = new EmbedBuilder()
            .setColor(Colors.AQUA)
            .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
            .setTitle(`${weapon.name}: 2nd Ascension`)
            .setURL(`${data.baseURL}weapons/${urlify(weapon.name, false)}#media`)
            .setDescription(`[Open image in browser](${data.baseURL}${getLink(weapon.awakenIcon)})`)
            .setImage(getLink(weapon.awakenIcon))
            .setThumbnail(null)
        return embed
    }
}
