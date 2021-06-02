import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { Colors, createTable,  simplePaginator } from "../../utils/Utils"
import { Artifact } from "../../utils/Types"
import config from "../../data/config.json"

export default class ArtifactCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Artifact",
            usage: "artifact [name]",
            help: `Displays artifact set information. If no name is provided, a list of all artifact sets will be displayed.

Note: this command supports fuzzy search.`,
            aliases: ["artifactset", "arti", "artiset", "artefact", "arte", "arteset", "a"]
        })
    }

    getArtiSetsPages(): string[] {
        const { data } = client
        const arti = Object.entries(data.artifacts)
            .sort(([an, a],  [bn, b]) => Math.max(...b.levels) - Math.max(...a.levels) || Math.min(...a.levels) - Math.min(...b.levels) || an.localeCompare(bn))
            .map(([name, info]) => `**${name}**: ${Math.min(...info.levels)}★ ~ ${Math.max(...info.levels)}★`)

        const pages: string[] = []
        let paging = "", c = 0
        for (const art of arti) {
            if (paging.length + arti.length > 1800 || ++c > 15) {
                pages.push(paging.trim())
                paging = art
                c = 1
            } else
                paging += "\n" + art
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getArtiSets(pages: string[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Artifact Sets")
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages} - See '${config.prefix}help artifact' for more info about what you can do`)
            .setColor(Colors.GREEN)

        return embed
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { data } = client

        if (args.length == 0) {
            const pages = this.getArtiSetsPages()
            if (pages.length == 0) return message.channel.send("No artifact data loaded")

            await simplePaginator(message, (relativePage, currentPage, maxPages) => this.getArtiSets(pages, relativePage, currentPage, maxPages), pages.length)
            return undefined
        }

        const arti = data.getArtifactByName(args.join(" "))
        if (arti == undefined)
            return message.channel.send("Unable to find artifact")

        await simplePaginator(message, (relativePage, currentPage, maxPages) => this.getArti(arti, relativePage, currentPage, maxPages), 1 + arti.artis.length)
        return undefined
    }

    getArti(set: Artifact, relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(set.icon)
            .setFooter(`Page ${currentPage} / ${maxPages}`)

        if (relativePage == 0) {
            for (const bonus of set.bonuses)
                embed.addField(`${bonus.count}-Set Bonus`, bonus.desc)

            embed.setTitle(`${set.name}: Set info`)
                .addField("Possible levels", set.levels.map(k => k + "★").join(", "))
                .setDescription(`This set contains ${set.artis.length} artifacts`)

            return embed
        }

        if (relativePage <= set.artis.length) {
            const arti = set.artis[relativePage - 1]
            const mainStats = data.artifactMainStats[arti.type]
            const total = mainStats.map(m => m.weight).reduce((a, b) => a+b, 0)

            embed.setTitle(`${arti.name}`)
                .setDescription(arti.desc)
                .addField("Possible main stats", `\`\`\`
${createTable(
        ["Rate", "Stat"],
        mainStats.sort((a, b) => b.weight - a.weight).map(am => [`${(am.weight / total * 100).toFixed(1)}%`, am.name])
    )}
\`\`\`

*See \`${config.prefix}artifact-levels <main stat> [stars = 5]\` for more info about artifact main stats*`)
                .setThumbnail(arti.icon)

            return embed
        }
        return undefined
    }
}
