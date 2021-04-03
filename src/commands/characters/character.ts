import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { addArg, createTable, PAD_END, PAD_START, paginator } from "../../utils/Utils"
import { BotEmoji, Character, Skill } from "../../utils/Types"
import config from "../../data/config.json"

const elementColors: Record<string, string> = {
    "Anemo": "#32D39F",
    "Wind": "#32D39F",

    "Cryo": "#79E8EB",
    "Ice": "#79E8EB",

    "Electro": "#CA7FFF",
    "Electric": "#CA7FFF",

    "Geo": "#FEE263",
    "Rock": "#FEE263",

    "Hydro": "#06E5FE",
    "Water": "#06E5FE",

    "Pyro": "#FFAA6E",
    "Fire": "#FFAA6E",

    "Dendro": "#B2EB28",
    "Grass": "#B2EB28",

    "None": "#545353",
}

const elementTypes = Object.values(client.data.characters)
    .map(c => c.meta.element)
    .filter((v, i, arr) => arr.indexOf(v) == i && v !== "None")
    .sort()

const weaponTypes = Object.values(client.data.characters)
    .map(c => c.weaponType)
    .filter((v, i, arr) => arr.indexOf(v) == i)
    .sort()

const possibleStars = Object.values(client.data.characters)
    .map(c => c.star)
    .filter((v, i, arr) => arr.indexOf(v) == i)
    .sort((a, b) => a-b)

export default class CharacterCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            usage: "character [name]",
            help: `Displays character information. If no name is provided, a list of all characters will be displayed.

By default, the talent pages will only list high talent levels, to show lower levels, use \`${config.prefix}c <name> -low\`.

To directly skip to a certain section, one can use \`${config.prefix}c <name> -[info|art|stats|books|skill|passive|const]\` to directly skip to that page.
Note: for the Traveler (or any other future character with multiple elements) you can only use \`${config.prefix}c <name> -[info|art|stats|anemo|geo|...]\`

The list of characters can be filtered by using \`${config.prefix}c -[${possibleStars.map(star => star + "*").join("|")}|${elementTypes.map(e => e.toLowerCase()).join("|")}|${weaponTypes.map(e => e.toLowerCase()).join("|")}]\`, these can be combined.
Characters listed will be from any of the searched stars AND from any of the listed elements AND from any of the listed weapon types.

Note: this command supports fuzzy search.`,
            aliases: ["characters", "cstats", "cmeta", "c", "cascension", "char"]
        })
    }

    getCharacters(elementFilter: string[], weaponTypeFilter: string[], starFilter: number[], page: number): MessageEmbed | undefined {
        const { data } = client
        const arti = Object.entries(data.characters)
            .filter(([_, info]) => starFilter.length == 0 || starFilter.includes(info.star))
            .filter(([_, info]) => elementFilter.length == 0 || elementFilter.find(elem => this.getElementIcons(info).includes(elem)))
            .filter(([_, info]) => weaponTypeFilter.length == 0 || weaponTypeFilter.includes(info.weaponType))
            .reverse()
            .map(([name, info]) => `**${name}**: ${this.getElementIcons(info)} ${info.star}★ ${data.emoji(info.weaponType, true)} user`)

        const pages: string[] = []
        let paging = ""
        for (const art of arti) {
            if (paging.length + art.length > 1000) {
                pages.push(paging.trim())
                paging = art
            } else
                paging += "\n" + art
        }
        if (paging.trim().length > 0) pages.push(paging)

        if (page >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Character list")
            .setDescription(pages[page])
            .setFooter(`Page ${page + 1} / ${pages.length}`)
            .setColor("#00EA69")

        return embed
    }

    private getElementIcons(info: Character) {
        const { data } = client

        return info.skills.map(skill => data.emoji(skill.ult.type)).join(", ")
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { data } = client

        const elementFilter: string[] = []
        for (const element of elementTypes)
            addArg(args, [`-${element}`], () => elementFilter.push(element))

        const weaponTypeFilter: string[] = []
        for (const weaponType of weaponTypes)
            addArg(args, [`-${weaponType}`], () => weaponTypeFilter.push(weaponType))

        const starFilter: number[] = []
        for (const star of possibleStars)
            addArg(args, [`-${star}`, `-${star}*`], () => starFilter.push(star))

        if (args.length == 0) {
            const embed = this.getCharacters(elementFilter, weaponTypeFilter, starFilter, 0)
            if (!embed) return message.channel.send("No character data loaded")

            const reply = await message.channel.send(embed)
            await paginator(message, reply, (page) => this.getCharacters(elementFilter, weaponTypeFilter, starFilter, page))
            return undefined
        }

        let low = false
        let defaultPage: string | number = 0

        addArg(args, ["-low", "-l"], () => {
            low = true
            defaultPage = 3
        })
        addArg(args, ["-info", "-i"], () => defaultPage = 1)
        addArg(args, ["-art", "-a"], () => defaultPage = "🎨")
        addArg(args, ["-stats", "-asc", "-ascensions", "-ascend"], () => defaultPage = 2)
        addArg(args, ["-books", "-talentupgrade"], () => defaultPage = 3)
        addArg(args, ["-skill", "-skills", "-talents", "-s", "-t"], () => defaultPage = 4)
        addArg(args, ["-passive", "-passives", "-p"], () => defaultPage = "💤")
        addArg(args, ["-const", "-constellation", "-constellations", "-c"], () => defaultPage = "🇨")

        // for MC
        if (elementFilter.includes("Anemo")) defaultPage = data.emojis.Wind
        if (elementFilter.includes("Geo")) defaultPage = data.emojis.Rock
        if (elementFilter.includes("Electro")) defaultPage = data.emojis.Electric
        if (elementFilter.includes("Pyro")) defaultPage = data.emojis.Fire
        if (elementFilter.includes("Dendro")) defaultPage = data.emojis.Grass
        if (elementFilter.includes("Cryo")) defaultPage = data.emojis.Ice
        if (elementFilter.includes("Hydro")) defaultPage = data.emojis.Water

        const char = data.getCharacterByName(args.join(" "))
        if (char == undefined)
            return message.channel.send("Unable to find character")

        const charpages = this.getCharPages(char)
        const page = Math.abs(typeof defaultPage == "string" ? charpages[defaultPage] : defaultPage)
        const embed = this.getCharacter(char, page, low)
        if (!embed) return message.channel.send("Unable to load character")

        const reply = await message.channel.send(embed)

        await paginator(message, reply, (page) => this.getCharacter(char, page, low), charpages, page)
        return undefined
    }

    getCharPages(char: Character): Record<string, number> {
        const { data } = client

        const pages: Record<string, number> = {
            "📝": 0,
            "🚀": 2,
        }

        let currentPage = 4
        if (char.skills.length == 1) {
            pages[data.emojis[char.weaponType as BotEmoji] ?? "⚔️"] = currentPage

            const skills = char.skills[0]
            currentPage += skills.talents.length + 1
            pages["💤"] = -currentPage

            currentPage += 1
            pages["🇨"] = currentPage

            currentPage += 1
            pages["🎨"] = currentPage
        } else {
            for (const skills of char.skills) {
                pages[data.emojis[skills.ult.type as BotEmoji] ?? "❔"] = currentPage
                currentPage += skills.talents.length + 3
            }
            pages["🎨"] = currentPage
        }

        return pages
    }

    getCharacter(char: Character, page: number, low: boolean): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(elementColors[char.meta.element] ?? "")
            .setThumbnail(char.icon)
            .setFooter(`Page ${page + 1} / ${this.getCharPages(char)["🎨"] + char.imgs.length}`)

        if (page == 0) {
            embed.setTitle(`${char.name}: Description`)
                .addField("Basics", `${this.getElementIcons(char)} ${char.star}★ ${data.emoji(char.weaponType, true)} user`)
                .setDescription(char.desc)

            // This is ugly, but is for Traveler/other multi-book characters, also enforces some order/grade of item
            const talentCostLv2 = char.skills[0]?.ult.costs[2]?.items,
                  talentCostLv3 = char.skills[0]?.ult.costs[3]?.items,
                  talentCostLv4 = char.skills[0]?.ult.costs[4]?.items,
                  talentCostLv5 = char.skills[0]?.ult.costs[5]?.items

            let talentMat = [
                talentCostLv4[0],
                talentCostLv4[1],
                ...talentCostLv5.slice(2),
            ]

            if (talentCostLv3[0].name !== talentCostLv4[0].name) {
                talentMat = [
                    talentCostLv3[0],
                    talentCostLv4[0],
                    talentCostLv2[0],
                    talentCostLv4[1],
                    ...talentCostLv5.slice(2),
                ]
            }

            embed.addField("Upgrade material", `Ascensions: ${char.ascensions[4]?.cost.items.map(i => data.emoji(i.name)).join("")}
Talents: ${talentMat.map(i => data.emoji(i.name)).join("")}`)
            return embed
        } else if (page == 1) {
            embed.setTitle(`${char.name}: Information`)
                .setDescription(`**Birthday**: ${char.meta.birthDay ?? "??"}/${char.meta.birthMonth ?? "??"} *(dd/mm)*
**Title**: ${char.meta.title || "-"}
**Detail**: ${char.meta.detail}

**Association**: ${char.meta.association}
**Affiliation**: ${char.meta.affiliation}
**Constellation**: ${char.meta.constellation}
**Element**: ${char.meta.element}`)
                .addField("Voice Actors", `**Chinese**: ${char.meta.cvChinese}
**Japanese**: ${char.meta.cvJapanese}
**English**: ${char.meta.cvEnglish}
**Korean**: ${char.meta.cvKorean}
`)
            return embed
        } else if (page == 2) {
            const columns: string[] = []
            const rows: string[][] = []

            const addRow = (char: Character, level: number, ascension: number) => {
                const stats = data.getCharStatsAt(char, level, ascension)
                for (const key of Object.keys(stats))
                    if (!columns.includes(key))
                        columns.push(key)

                rows.push([level.toString(), ascension.toString(), ...columns.map(c => data.stat(c, stats[c]))])
            }

            let previousMax = 1
            for (const asc of char.ascensions) {
                addRow(char, previousMax, asc.level)
                previousMax = asc.maxLevel
                addRow(char, previousMax, asc.level)

                if (asc.cost.mora || asc.cost.items.length > 0)
                    embed.addField(`Ascension ${asc.level} costs`, data.getCosts(asc.cost), true)
            }

            embed.setTitle(`${char.name}: Ascensions + stats`)
                .setDescription("Character stats:\n```\n" + createTable(
                    ["Lvl", "Asc", ...columns.map(c => data.statName(c))],
                    rows,
                    [PAD_START]
                ) + "\n```")
                .setFooter(`${embed.footer?.text} - Use '${config.prefix}charstats ${char.name} [level] [A<ascension>]' for a specific level`)

            return embed
        } else if (page == 3) {
            let i = 1
            for (const cost of char.skills[0].ult.costs) {
                if (cost.mora || cost.items.length > 0)
                    embed.addField(`Talent lv ${++i} costs`, data.getCosts(cost), true)
            }

            embed.setTitle(`${char.name}: Talent upgrade costs`)
            return embed
        }

        function showTalent(skill: Skill): void {
            embed.setTitle(`${char.name}: ${skill.name}`)
                .setDescription(skill.desc)

            if (skill.charges > 1)
                embed.addField("Charges", skill.charges)

            let hasLevels = false
            for (const { name, values } of skill.talentTable) {
                if (values.filter(k => k != values[0]).length > 0) {
                    hasLevels= true
                    embed.addField(name, "```\n"+ createTable(
                        undefined,
                        Object.entries(values)
                            .map(([lv, val]) => [+lv + 1, val])
                            .filter(([lv]) => (low ? lv <= 6 : lv >= 6) && lv <= 13),
                        [PAD_START, PAD_END]
                    ) + "\n```", true)
                } else
                    embed.addField(name, values[0], true)
            }
            if (skill.type)
                embed.addField("Element type", skill.type, true)
            if (hasLevels)
                embed.setFooter(`${embed.footer?.text} - Use '${config.prefix}c ${char.name}${low ? "' to display higher" : " -low' to display lower"} levels`)
        }

        let currentPage = 4
        for (const skills of char.skills) {
            embed.setColor(elementColors[skills.ult.type ?? "None"])

            for (const talent of skills.talents) {
                if (currentPage++ == page) {
                    showTalent(talent)
                    return embed
                }
            }

            if (currentPage++ == page) {
                showTalent(skills.ult)
                return embed
            }

            if (currentPage++ == page) {
                embed.setTitle(`${char.name}: Passives`)
                for (const passive of skills.passive.sort((a, b) => a.minAscension - b.minAscension)) {
                    embed.addField(passive.name, `${passive.desc}
    
*${passive.minAscension > 0 ? `Unlocks at ascension **${passive.minAscension}**` : "Unlocked by **default**"}*`)
                }
                return embed
            }

            if (currentPage++ == page) {
                embed.setTitle(`${char.name}: Constellations`)
                    .setThumbnail(skills.constellations[0]?.icon)
                let c = 0
                for (const constellation of skills.constellations)
                    embed.addField(`C${++c}: ${constellation.name}`, constellation.desc)

                return embed
            }
        }

        const offset = page - currentPage
        if (offset >= 0 && offset < char.imgs.length) {
            const img = char.imgs[offset]
            embed.setTitle(`${char.name}`)
                .setDescription(`[Open image in browser](${img})`)
                .setImage(img)
            embed.thumbnail = null
            return embed
        }

        return undefined
    }
}
