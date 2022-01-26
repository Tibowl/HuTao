import { AutocompleteInteraction, CommandInteraction, Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { Colors, createTable,  findFuzzyBestCandidates,  getLinkToGuide,  sendMessage,  simplePaginator, urlify } from "../../utils/Utils"
import { Artifact, CommandSource, SendMessage } from "../../utils/Types"
import config from "../../data/config.json"

export default class ArtifactCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Artifact",
            usage: "artifact [name]",
            shortHelp: "Displays artifact set information. If no name is provided, a list of all sets will be displayed.",
            help: `Displays artifact set information. If no name is provided, a list of all artifact sets will be displayed.

Note: this command supports fuzzy search.`,
            aliases: ["artifactset", "arti", "artiset", "artefact", "arte", "arteset", "a"],
            options: [{
                name: "name",
                description: "Name of the artifact set",
                type: "STRING",
                autocomplete: true
            }]
        })
    }

    async autocomplete(source: AutocompleteInteraction): Promise<void> {
        const targetNames = Object.keys(client.data.artifacts)
        const search = source.options.getFocused().toString()

        if (search == "") {
            return await source.respond([
                { name: "List all artifacts", value: "" },
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
        const { options } = source

        const set = options.getString("name")

        return this.run(source, set)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        const set = args.length > 0 ? args.join(" ") : undefined

        return this.run(source, set)
    }

    async run(source: CommandSource, set?: string | null): Promise<SendMessage | undefined> {
        const { data } = client

        if (!set) {
            const pages = this.getArtiSetsPages()
            if (pages.length == 0) return sendMessage(source, "No artifact data loaded")

            await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getArtiSets(pages, relativePage, currentPage, maxPages), pages.length)
            return undefined
        }

        const arti = data.getArtifactByName(set)
        if (arti == undefined)
            return sendMessage(source, "Unable to find artifact")

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getArti(arti, relativePage, currentPage, maxPages), 1 + arti.artis.length)
        return undefined
    }

    getArtiSetsPages(): string[] {
        const { data } = client
        const artis = Object.entries(data.artifacts)
            .sort(([an, a],  [bn, b]) => Math.max(...b.levels) - Math.max(...a.levels) || Math.min(...a.levels) - Math.min(...b.levels) || an.localeCompare(bn))
            .map(([name, info]) => `**${name}**: ${Math.min(...info.levels)}★ ~ ${Math.max(...info.levels)}★`)

        const pages: string[] = []
        let paging = "", c = 0
        for (const arti of artis) {
            if (paging.length + arti.length > 1800 || ++c > 15) {
                pages.push(paging.trim())
                paging = arti
                c = 1
            } else
                paging += "\n" + arti
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getArtiSets(pages: string[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Artifact Sets")
            .setURL(`${client.data.baseURL}artifacts`)
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages} - See '${config.prefix}help artifact' for more info about what you can do`)
            .setColor(Colors.GREEN)

        return embed
    }

    getArti(set: Artifact, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(`${data.baseURL}${set.artis.find(x => x.icon)?.icon ?? "img/unknown.png"}`)
            .setURL(`${data.baseURL}artifacts/${urlify(set.name, false)}`)
            .setFooter(`Page ${currentPage} / ${maxPages}`)

        if (relativePage == 0) {
            for (const bonus of set.bonuses)
                embed.addField(`${bonus.count}-Set Bonus`, bonus.desc)

            embed.setTitle(`${set.name}: Set info`)
                .addField("Possible levels", set.levels.map(k => k + "★").join(", "))
                .setDescription(`This set contains ${set.artis.length} artifacts`)


            const guides = client.data.getGuides("artifact", set.name).map(({ guide, page }) => getLinkToGuide(guide, page)).join("\n")

            if (guides)
                embed.addField("Guides", guides)

            return embed
        }

        if (relativePage <= set.artis.length) {
            const arti = set.artis[relativePage - 1]
            const mainStats = data.artifactMainStats[arti.type]
            const total = mainStats.map(m => m.weight).reduce((a, b) => a+b, 0)

            embed.setTitle(`${arti.name}`)
                .setURL(`${data.baseURL}artifacts/${urlify(set.name, false)}#artis`)
                .setDescription(arti.desc)
                .addField("Possible main stats", `\`\`\`
${createTable(
        ["Rate", "Stat"],
        mainStats.sort((a, b) => b.weight - a.weight).map(am => [`${(am.weight / total * 100).toFixed(1)}%`, am.name])
    )}
\`\`\`

*See \`${config.prefix}artifact-levels <main stat> [stars = 5]\` for more info about artifact main stats*`)
                .setThumbnail(`${data.baseURL}${arti.icon}`)

            return embed
        }
        return undefined
    }
}
