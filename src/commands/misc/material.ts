import { AutocompleteInteraction, CommandInteraction, Message, MessageEmbed } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { Character, CommandSource, Material, SendMessage, Weapon } from "../../utils/Types"
import { Bookmarkable, Colors, findFuzzyBestCandidates, getLinkToGuide, joinMulti, paginator, sendMessage, simplePaginator, urlify } from "../../utils/Utils"

export default class MaterialCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            usage: "material [name]",
            help: `Displays material information. If no name is provided, a list of all materials will be displayed.

Note: this command supports fuzzy search.`,
            aliases: ["mat"],
            options: [{
                name: "name",
                description: "Material name",
                type: "STRING",
                autocomplete: true,
                required: false
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = Object.keys(client.data.materials)
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                { name: "List all materials", value: "" },
                ...targetNames.filter((_, i) => i < 19).map(value => {
                    return { name: value, value }
                })
            ])
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

        const name = args.join(" ")
        if (name.length == 0) {
            const pages = this.getMaterialsPages()
            if (pages.length == 0) return sendMessage(source, "No material data loaded")

            await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getMaterialsPage(pages, relativePage, currentPage, maxPages), pages.length)
            return undefined
        }

        const material = data.getMaterialByName(name)
        if (material == undefined)
            return sendMessage(source, "Unable to find material")

        const pages: Bookmarkable[] = [{
            bookmarkEmoji: "📝",
            bookmarkName: "General",
            maxPages: 1,
            pages: (rp, cp, mp) => this.getMainMaterialPage(material, rp, cp, mp)
        }]
        if (material.longDesc)
            pages.push({
                bookmarkEmoji: "-",
                bookmarkName: "Lore",
                maxPages: 1,
                pages: (rp, cp, mp) => this.getLoreMaterialPage(material, rp, cp, mp),
                invisible: true
            })

        await paginator(source, pages)
        return undefined
    }


    getMaterialsPages(): string[] {
        const { data } = client
        const materials = Object.entries(data.materials)
            .map(([name, material]) => `**${material.category}**: ${material.stars?`${material.stars}★ `:""}${data.emoji(name, true)}`)

        const pages: string[] = []
        let paging = "", c = 0
        for (const material of materials) {
            if (paging.length + material.length > 1800 || ++c > 15) {
                pages.push(paging.trim())
                paging = material
                c = 1
            } else
                paging += "\n" + material
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getMaterialsPage(pages: string[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Materials")
            .setURL(`${client.data.baseURL}materials`)
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages} - See '${config.prefix}help material' for more info about what you can do`)
            .setColor(Colors.GREEN)

        return embed
    }

    getMainMaterialPage(material: Material, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const guides = data.getGuides("material", material.name).map(({ guide, page }) => getLinkToGuide(guide, page)).join("\n")
        const embed = new MessageEmbed()
            .setTitle(`${material.name}: Basic info`)
            .setURL(`${data.baseURL}materials/${urlify(material.name, false)}`)
            .setColor(Colors.AQUA)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setDescription(material.desc)

        if (material.category || material.type)
            embed.addField("Category", `**${material.category}**: ${material.type}`, true)

        if (material.stars)
            embed.addField("Rarity", `${material.stars}★`, true)

        if (guides)
            embed.addField("Guides", guides)

        if (material.sources)
            embed.addField("Sources", material.sources.join("\n"))

        const charAscension: Character[] = []
        const charTalents: Character[] = []

        for (const c of data.getCharacters()) {
            if (c.ascensionCosts && data.isInCosts(c.ascensionCosts, material.name))
                charAscension.push(c)

            if (c.skills) {
                const talents = c.skills.flatMap(s => [...(s.talents ?? []), s.ult])

                if (talents.some(x => x?.costs && data.isInCosts(x.costs, material.name)))
                    charTalents.push(c)
            }
        }

        const weaponAscension: Weapon[] = []
        for (const w of Object.values(data.weapons)) {
            if (w.ascensionCosts && data.isInCosts(w.ascensionCosts, material.name))
                weaponAscension.push(w)
        }

        const usedByDesc = []

        const overlap = charTalents.filter(x => charAscension.some(y => x.name == y.name))
        const uniqueTalents = charTalents.filter(x => !charAscension.some(y => x.name == y.name))
        const uniqueAscension = charAscension.filter(x => !charTalents.some(y => x.name == y.name))

        if (overlap.length > 0)
            usedByDesc.push(`Used by ${joinMulti(overlap.map(x => data.emoji(x.name)).filter((v, i, a) => a.indexOf(v) == i))} character talents and ascensions.`)

        if (uniqueTalents.length > 0)
            usedByDesc.push(`Used by ${joinMulti(uniqueTalents.map(x => data.emoji(x.name)))} character talents.`)

        if (uniqueAscension.length > 0)
            usedByDesc.push(`Used by ${joinMulti(uniqueAscension.map(x => data.emoji(x.name)))} character ascensions.`)

        const sortedWeapon = weaponAscension
            .sort((a, b) => (a.stars && b.stars && b.stars - a.stars) || (a.weaponType && b.weaponType && a.weaponType.localeCompare(b.weaponType)) || a.name.localeCompare(b.name))
        if (sortedWeapon.length > 0 && sortedWeapon.length < 7)
            usedByDesc.push(`Used by ${joinMulti(sortedWeapon.map(x => data.emoji(x.name)))} weapon ascensions.`)
        else if (sortedWeapon.length > 0 && sortedWeapon.filter(x => x.stars >= 4).length < 7)
            usedByDesc.push(`Used by ${joinMulti([...sortedWeapon.filter(x => x.stars >= 4).map(x => data.emoji(x.name)), "more low star"])} weapon ascensions.`)
        else if (sortedWeapon.length > 0)
            usedByDesc.push(`Used by ${joinMulti([...sortedWeapon.slice(0, 7).map(x => data.emoji(x.name)), "more"])} weapon ascensions.`)


        if (usedByDesc.length > 0)
            embed.addField("Used by", usedByDesc.join("\n"))

        if (material.icon)
            embed.setThumbnail(`${data.baseURL}${material.icon}`)

        return embed
    }

    getLoreMaterialPage(material: Material, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setTitle(`${material.name}: Description`)
            .setURL(`${data.baseURL}materials/${urlify(material.name, false)}#longdesc`)
            .setDescription(material.longDesc ?? "Unavailable")

        if (material.icon)
            embed.setThumbnail(`${data.baseURL}${material.icon}`)

        return embed
    }
}
