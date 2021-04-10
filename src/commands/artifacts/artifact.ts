import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { Colors, createTable, paginator } from "../../utils/Utils"
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
            aliases: ["artifactset", "arti", "artiset", "a"]
        })
    }

    getArtiSets(page: number): MessageEmbed | undefined {
        const { data } = client
        const arti = Object.entries(data.artifacts)
            .sort(([an, a],  [bn, b]) => Math.max(...b.levels) - Math.max(...a.levels) || Math.min(...a.levels) - Math.min(...b.levels) || an.localeCompare(bn))
            .map(([name, info]) => `**${name}**: ${Math.min(...info.levels)}★ ~ ${Math.max(...info.levels)}★`)

        const pages: string[] = []
        let paging = ""
        for (const art of arti) {
            if (paging.length + art.length > 500) {
                pages.push(paging.trim())
                paging = art
            } else
                paging += "\n" + art
        }
        if (paging.trim().length > 0) pages.push(paging)

        if (page >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle("Artifact Sets")
            .setDescription(pages[page])
            .setFooter(`Page ${page + 1} / ${pages.length}`)
            .setColor(Colors.GREEN)

        return embed
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { data } = client

        if (args.length == 0) {
            const embed = this.getArtiSets(0)
            if (!embed) return message.channel.send("No artifact data loaded")

            const reply = await message.channel.send(embed)
            await paginator(message, reply, (page) => this.getArtiSets(page))
            return undefined
        }

        const arti = data.getArtifactByName(args.join(" "))
        if (arti == undefined)
            return message.channel.send("Unable to find artifact")

        const embed = this.getArti(arti, 0)
        if (!embed) return message.channel.send("No artifact data loaded")

        const reply = await message.channel.send(embed)
        await paginator(message, reply, (page) => this.getArti(arti, page))
        return undefined
    }

    getArti(set: Artifact, page: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(Colors.AQUA)
            .setThumbnail(set.icon)
            .setFooter(`Page ${page + 1} / ${1 + set.artis.length}`)

        if (page == 0) {
            for (const bonus of set.bonuses)
                embed.addField(`${bonus.count}-Set Bonus`, bonus.desc)

            embed.setTitle(`${set.name}: Set info`)
                .addField("Possible levels", set.levels.map(k => k + "★").join(", "))
                .setDescription(`This set contains ${set.artis.length} artifacts`)

            return embed
        }

        if (page <= set.artis.length) {
            const arti = set.artis[page - 1]
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
