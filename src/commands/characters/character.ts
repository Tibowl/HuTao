import { AutocompleteInteraction, CommandInteraction, Message, MessageEmbed } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { BotEmoji, Character, CharacterFull, CommandSource, SendMessage, Skill, TalentTable, TalentValue } from "../../utils/Types"
import { addArg, Bookmarkable, Colors, createTable, findFuzzyBestCandidates, PAD_END, PAD_START, paginator, sendMessage, simplePaginator } from "../../utils/Utils"


const elementTypes = client.data.getCharacters()
    .map(c => c.meta.element)
    .filter((v, i, arr) => arr.indexOf(v) == i && v !== "None")
    .sort()

const weaponTypes = client.data.getReleasedCharacters()
    .map(c => c.weaponType)
    .filter((v, i, arr) => arr.indexOf(v) == i)
    .sort()

const possibleStars = client.data.getReleasedCharacters()
    .map(c => c.star)
    .filter((v, i, arr) => arr.indexOf(v) == i)
    .sort((a, b) => a-b)

type TalentMode = "LITTLE" | "HIGH" | "LOW"

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
            aliases: ["characters", "cstats", "cmeta", "c", "cascension", "char"],
            options: [{
                name: "name",
                description: "Character name",
                type: "STRING",
                autocomplete: true,
                required: false
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = client.data.getCharacters().map(c => c.name)
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                { name: "List all characters", value: "" },
                ...targetNames.filter((_, i) => i < 19).map(value => {
                    return { name: value, value }
                })
            ])
        }

        const args = search.split(/ +/g)
        const lastWord = args.pop()
        if (lastWord?.startsWith("-")) {
            const foundChar = args.filter(x => !x.startsWith("-")).join("")

            let targets = ["-low", "-high", "-info", "-art", "-stats", "-books", "-skill", "-passive", "-const"]
            if (foundChar == "")
                targets = [...elementTypes, ...weaponTypes, ...possibleStars.map(n => `${n}*`)].map(x => `-${x.toLowerCase()}`)
            else if (foundChar == "Traveler")
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                targets = [...elementTypes.filter(elem => this.getElementIcons(client.data.getCharacterByName("Traveler")!).includes(elem)).map(x => `-${x.toLowerCase()}`), ...targets]

            return await source.respond(findFuzzyBestCandidates(targets, lastWord, 20).map(value => {
                value = `${args.join(" ")} ${value}`
                return { name: value, value }
            }))
        }

        await source.respond(findFuzzyBestCandidates(targetNames, search, 20).map(value => {
            return { name: value, value }
        }))
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, (source.options.getString("name") ?? "").split(/ +/g))

    }
    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, args)
    }

    async run(source: CommandSource, args: string[]): Promise<SendMessage | undefined> {
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

        let talentMode: TalentMode = "LITTLE"
        let defaultPage: string | number = 0

        addArg(args, ["-low", "-l"], () => {
            talentMode = "LOW"
            defaultPage = 4
        })
        addArg(args, ["-high", "-h"], () => {
            talentMode = "HIGH"
            defaultPage = 4
        })
        addArg(args, ["-info", "-i"], () => defaultPage = 1)
        addArg(args, ["-art", "-a"], () => defaultPage = "Art")
        addArg(args, ["-stats", "-asc", "-ascensions", "-ascend"], () => defaultPage = 2)
        addArg(args, ["-books", "-talentupgrade"], () => defaultPage = 3)
        addArg(args, ["-skill", "-skills", "-talents", "-s", "-t"], () => defaultPage = "Talents")
        addArg(args, ["-passive", "-passives", "-p"], () => defaultPage = "Passives")
        addArg(args, ["-const", "-constellation", "-constellations", "-c"], () => defaultPage = "Constellations")

        // for MC
        if (elementFilter.includes("Anemo")) defaultPage = "Anemo"
        if (elementFilter.includes("Geo")) defaultPage = "Geo"
        if (elementFilter.includes("Electro")) defaultPage = "Electro"
        if (elementFilter.includes("Pyro")) defaultPage = "Pyro"
        if (elementFilter.includes("Dendro")) defaultPage = "Dendro"
        if (elementFilter.includes("Cryo")) defaultPage = "Cryo"
        if (elementFilter.includes("Hydro")) defaultPage = "Hydro"

        const name = args.join(" ")
        if (name.length == 0) {
            const pages = this.getCharactersPages(elementFilter, weaponTypeFilter, starFilter)
            if (pages.length == 0) return sendMessage(source, "No character data loaded")

            await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getCharacterPage(pages, relativePage, currentPage, maxPages), pages.length)
            return undefined
        }

        const char = data.getCharacterByName(name)
        if (char == undefined)
            return sendMessage(source, "Unable to find character")

        const charpages = this.getCharPages(char, talentMode)

        await paginator(source, charpages, defaultPage)
        return undefined
    }


    getCharactersPages(elementFilter: string[], weaponTypeFilter: string[], starFilter: number[]): string[] {
        const { data } = client
        const chars = data.getCharacters()
            .filter((char) => starFilter.length == 0 || (char.star && starFilter.includes(char.star)))
            .filter((char) => elementFilter.length == 0 || elementFilter.find(elem => this.getElementIcons(char).includes(elem)))
            .filter((char) => weaponTypeFilter.length == 0 || (char.weaponType && weaponTypeFilter.includes(char.weaponType)))
            .sort((a, b) => {
                if (data.isFullCharacter(a) && data.isFullCharacter(b))
                    return b.releasedOn.localeCompare(a.releasedOn) || b.star - a.star || a.name.localeCompare(b.name)
                else if (!data.isFullCharacter(b))
                    return 1
                else if (!data.isFullCharacter(a))
                    return -1
                else return a.name.localeCompare(b.name)
            })
            .map((char) => `**${char.name}**: ${this.getBasicInfo(char)}`)

        const pages: string[] = []
        let paging = "", c = 0
        for (const char of chars) {
            if (paging.length + char.length > 1800 || ++c > 15) {
                pages.push(paging.trim())
                paging = char
                c = 1
            } else
                paging += "\n" + char
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getCharacterPage(pages: string[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Character list")
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages} - See '${config.prefix}help char' for more info about what you can do`)
            .setColor(Colors.GREEN)

        return embed
    }

    private getElementIcons(char: Character) {
        const { data } = client

        const emoji = char.skills?.map(skill => skill.ult && data.emoji(skill.ult.type)).filter(x => x)
        if (emoji && emoji?.length > 0)
            return emoji.join(", ")
        else
            return data.emoji(char.meta.element)
    }

    getMainPage(char: Character, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors[char.meta.element] ?? "")
            .setFooter(`Page ${currentPage} / ${maxPages}`)

        if (char.icon)
            embed.setThumbnail(char.icon)

        if (relativePage == 0) {
            embed.setTitle(`${char.name}: Description`)
                .setDescription(char.desc)
                .addField("Basics", this.getBasicInfo(char))

            if (data.isFullCharacter(char)) {
                const maxAscension = char.ascensions[char.ascensions.length - 1]
                embed.addField("Base stats", `${
                    Object.entries(data.getCharStatsAt(char, 1, 0))
                        .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                        .join("\n")
                }`, true)
                    .addField(`Lv. ${maxAscension.maxLevel} A${maxAscension.level} stats`, `${
                        Object.entries(data.getCharStatsAt(char, maxAscension.maxLevel, maxAscension.level))
                            .map(([name, value]) => `**${name}**: ${data.stat(name, value)}`)
                            .join("\n")
                    }`, true)
                // This is ugly, but is for Traveler/other multi-book characters, also enforces some order/grade of item
                const talentCostLv2 = char?.skills?.[0].ult?.costs?.[2]?.items,
                      talentCostLv3 = char?.skills?.[0].ult?.costs?.[3]?.items,
                      talentCostLv4 = char?.skills?.[0].ult?.costs?.[4]?.items,
                      talentCostLv5 = char?.skills?.[0].ult?.costs?.[5]?.items

                let talentMat = [
                    talentCostLv4?.[0],
                    talentCostLv4?.[1],
                    ...talentCostLv5?.slice(2) ?? [],
                ]

                if (talentCostLv3?.[0].name !== talentCostLv4?.[0].name) {
                    talentMat = [
                        talentCostLv3?.[0],
                        talentCostLv4?.[0],
                        talentCostLv2?.[0],
                        talentCostLv4?.[1],
                        ...talentCostLv5?.slice(2) ?? [],
                    ]
                }

                embed.addField("Upgrade material", `Ascensions: ${char.ascensions[4]?.cost.items.map(i => data.emoji(i.name)).join("")}
Talents: ${talentMat.map(i => (i && data.emoji(i.name)) ?? "???").join("")}`)
            }


            return embed
        } else if (relativePage == 1) {
            let metadata = ""
            if (char.meta.birthDay != undefined && char.meta.birthMonth!= undefined)
                metadata += `**Birthday**: ${
                    new Date(Date.UTC(2020, char.meta.birthMonth - 1, char.meta.birthDay))
                        .toLocaleString("en-UK", {
                            timeZone: "UTC",
                            month: "long",
                            day: "numeric",
                        })}
`
            if (char.meta.detail)
                metadata += `**Detail**: ${char.meta.detail}\n`
            if (char.meta.title)
                metadata += `**Title**: ${char.meta.title}\n`

            if (metadata.length > 0)
                metadata += "\n"
            if (char.meta.association)
                metadata += `**Association**: ${char.meta.association}\n`
            if (char.meta.affiliation)
                metadata += `**Affiliation**: ${char.meta.affiliation}\n`
            if (char.meta.constellation)
                metadata += `**Constellation**: ${char.meta.constellation}\n`
            if (char.meta.element)
                metadata += `**Element**: ${char.meta.element}\n`

            embed.setTitle(`${char.name}: Information`)
                .setDescription(metadata.trim())

            if (char.meta.cvChinese)
                embed.addField("Voice Actors", `**Chinese**: ${char.meta.cvChinese}
**Japanese**: ${char.meta.cvJapanese}
**English**: ${char.meta.cvEnglish}
**Korean**: ${char.meta.cvKorean}
`)
            return embed
        }

        return undefined
    }

    private getBasicInfo(char: Character) {
        const { data } = client
        let basic = this.getElementIcons(char)
        if (char.star)
            basic += ` ${char.star}★`

        if (char.weaponType)
            basic += ` ${data.emoji(char.weaponType, true)} user`
        else
            basic += " Character (unreleased)"

        return basic
    }

    getStatsPage(char: CharacterFull, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors[char.meta.element] ?? "")
            .setThumbnail(char.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)

        if (relativePage == 0) {
            const columns: string[] = []
            const rows: string[][] = []

            const addRow = (char: CharacterFull, level: number, ascension: number) => {
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
        } else if (relativePage == 1) {
            let i = 1
            for (const cost of char.skills[0].ult?.costs ?? []) {
                if (cost.mora || cost.items.length > 0)
                    embed.addField(`Talent lv ${++i} costs`, data.getCosts(cost), true)
            }

            embed.setTitle(`${char.name}: Talent upgrade costs`)
            return embed
        }

        return undefined
    }

    getArtPage(char: Character, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const embed = new MessageEmbed()
            .setColor(Colors[char.meta.element] ?? "")
            .setFooter(`Page ${currentPage} / ${maxPages}`)
        if (char.icon)
            embed.setThumbnail(char.icon)

        if (relativePage >= 0 && relativePage < char.imgs.length) {
            const img = char.imgs[relativePage]
            embed.setTitle(`${char.name}`)
                .setDescription(`[Open image in browser](${img})`)
                .setImage(img)
            embed.thumbnail = null
            return embed
        }

        return undefined
    }

    getCharTalentPage(char: Character, relativePage: number, currentPage: number, maxPages: number, talentMode: TalentMode): MessageEmbed | undefined {
        const embed = new MessageEmbed()
            .setColor(Colors[char.meta.element] ?? "")
            .setFooter(`Page ${currentPage} / ${maxPages}`)

        if (char.icon) embed.setThumbnail(char.icon)

        function isValueTable(talent: TalentTable | TalentValue): talent is TalentTable {
            return (talent as TalentTable).values != undefined
        }

        function showTalent(skill: Skill): void {
            embed.setTitle(`${char.name}: ${skill.name}`)
                .setDescription(skill.desc)

            if (skill.charges)
                embed.addField("Charges", skill.charges.toString())

            let hasLevels = false
            for (const talent of skill.talentTable ?? []) {
                const { name } = talent

                if (isValueTable(talent)) {
                    const values = talent.values
                    hasLevels = true

                    const talents = skill.video ? [9] : [6, 9, values.length - 1]
                    embed.addField(name, "```\n"+ createTable(
                        undefined,
                        Object.entries(values)
                            .map(([lv, val]) => [+lv + 1, val])
                            .filter(([lv]) => {
                                switch (talentMode) {
                                    case "HIGH":
                                        return lv >= 6
                                    case "LOW":
                                        return lv <= 6
                                    case "LITTLE":
                                    default:
                                        return talents.includes(+lv)
                                }
                            }),
                        [PAD_START, PAD_END]
                    ) + "\n```", true)
                } else
                    embed.addField(name, talent.value, true)
            }
            if (hasLevels && talentMode == "HIGH")
                embed.setFooter(`${embed.footer?.text} - Use '${config.prefix}c ${char.name} -low' to display lower levels`)
            else if (hasLevels && talentMode == "LOW")
                embed.setFooter(`${embed.footer?.text} - Use '${config.prefix}c ${char.name} -high' to display higher levels`)
            else if (hasLevels && talentMode == "LITTLE")
                embed.setFooter(`${embed.footer?.text} - Use '${config.prefix}c ${char.name} -high' (or -low) to display higher (or lower) levels`)

            if (skill.video) {
                embed.setImage(skill.video)
                    .setThumbnail("")
            }
        }

        let page = 0
        for (const skills of char.skills ?? []) {
            embed.setColor(Colors[skills.ult?.type ?? "None"])

            for (const talent of skills.talents ?? []) {
                if (page++ == relativePage) {
                    showTalent(talent)
                    return embed
                }
            }

            if (skills.ult && page++ == relativePage) {
                showTalent(skills.ult)
                return embed
            }

            if (skills.passive && page++ == relativePage) {
                embed.setTitle(`${char.name}: Passives`)
                for (const passive of skills.passive) {
                    if (passive.minAscension)
                        embed.addField(passive.name, `${passive.desc}
    
*${passive.minAscension > 0 ? `Unlocks at ascension **${passive.minAscension}**` : "Unlocked by **default**"}*`)
                    else
                        embed.addField(passive.name, passive.desc)
                }
                return embed
            }

            if (skills.constellations && page++ == relativePage) {
                embed.setTitle(`${char.name}: Constellations`)
                    .setThumbnail(skills.constellations[0]?.icon)
                let c = 0
                for (const constellation of skills.constellations)
                    embed.addField(`C${++c}: ${constellation.name}`, constellation.desc)

                return embed
            }
        }

        return undefined
    }

    getCharPages(char: Character, talentMode: TalentMode): Bookmarkable[] {
        const { data } = client

        const pages: Bookmarkable[] = [
            {
                bookmarkEmoji: "📝",
                bookmarkName: "General",
                maxPages: 2,
                pages: (rp, cp, mp) => this.getMainPage(char, rp, cp, mp)
            }
        ]

        if (data.isFullCharacter(char))
            pages.push(
                {
                    bookmarkEmoji: "🚀",
                    bookmarkName: "Stats",
                    maxPages: 2,
                    pages: (rp, cp, mp) => this.getStatsPage(char, rp, cp, mp)
                })

        if (char.skills?.length == 1) {
            const skills = char.skills[0]
            let offset = 0
            if (skills.talents) {
                const off = offset
                const ult = skills.ult ? 1 : 0
                pages.push({
                    bookmarkEmoji: data.emojis[char.weaponType as BotEmoji] ?? "⚔️",
                    bookmarkName: "Talents",
                    maxPages: skills.talents.length + ult,
                    pages: (rp, cp, mp) => this.getCharTalentPage(char, rp + off, cp, mp, talentMode)
                })
                offset += skills.talents.length + ult
            }

            if (skills.talents) {
                const off = offset
                pages.push({
                    bookmarkEmoji: "💤",
                    bookmarkName: "Passives",
                    maxPages: 1,
                    pages: (rp, cp, mp) => this.getCharTalentPage(char, rp + off, cp, mp, talentMode)
                })
                offset++
            }

            if (skills.constellations) {
                const off = offset
                pages.push({
                    bookmarkEmoji: "🇨",
                    bookmarkName: "Constellations",
                    maxPages: 1,
                    pages: (rp, cp, mp) => this.getCharTalentPage(char, rp + off, cp, mp, talentMode)
                })
                offset++
            }
        } else {
            let currentPage = 0
            for (const skills of char.skills ?? []) {
                const offset = currentPage

                if (skills.talents) {
                    pages.push({
                        bookmarkEmoji: data.emojis[skills.ult?.type as BotEmoji] ?? "❔",
                        bookmarkName: skills.ult?.type ?? "Unknown",
                        maxPages: skills.talents.length + 3,
                        pages: (rp, cp, mp) => this.getCharTalentPage(char, rp + offset, cp, mp, talentMode)
                    })

                    currentPage += skills.talents.length + 3
                }
            }
        }


        pages.push({
            bookmarkEmoji: "🎨",
            bookmarkName: "Art",
            maxPages: char.imgs.length,
            pages: (rp, cp, mp) => this.getArtPage(char, rp, cp, mp)
        })

        return pages
    }
}
