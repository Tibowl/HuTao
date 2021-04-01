import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { paginator } from "../../utils/Utils"
import { BotEmoji, Character } from "../../utils/Types"

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

    "Fire": "#FFAA6E",
    "Pyro": "#FFAA6E",

    "Dendro": "#B2EB28",
    "Grass": "#B2EB28",

    "None": "#545353",
}

export default class CharacterCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            usage: "character [name]",
            help: "Search for a character",
            aliases: ["characters", "cstats", "cmeta", "c", "cascension", "char"]
        })
    }

    getCharacters(page: number): MessageEmbed | undefined {
        const { data } = client
        const arti = Object.entries(data.characters)
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

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        const { data } = client

        if (args.length == 0) {
            const embed = this.getCharacters(0)
            if (!embed) return message.channel.send("No character data loaded")

            const reply = await message.channel.send(embed)
            await paginator(message, reply, (page) => this.getCharacters(page))
            return reply
        }

        const char = data.getCharacterByName(args.join(" "))
        if (char == undefined)
            return message.channel.send("Unable to find character")

        const embed = this.getCharacter(char, 0)
        if (!embed) return message.channel.send("No character data loaded")

        const reply = await message.channel.send(embed)

        await paginator(message, reply, (page) => this.getCharacter(char, page), this.getCharPages(char))
        return reply
    }

    getCharPages(char: Character): Record<string, number> {
        const { data } = client

        const pages: Record<string, number> = {
            "📝": 0,
            "🚀": 2,
        }

        let currentPage = 3
        if (char.skills.length == 1) {
            pages[data.emojis[char.weaponType as BotEmoji] ?? "⚔️"] = currentPage

            const skills = char.skills[0]
            currentPage += skills.talents.length + 1 + skills.passive.length
            pages["🇨"] = currentPage

            currentPage += skills.constellations.length
            pages["🎨"] = currentPage
        } else {
            for (const skills of char.skills) {
                pages[data.emojis[skills.ult.type as BotEmoji] ?? "❔"] = currentPage
                currentPage += skills.talents.length + 1 + skills.passive.length + skills.constellations.length
            }
            pages["🎨"] = currentPage
        }

        return pages
    }

    getCharacter(char: Character, page: number): MessageEmbed | undefined {
        const { data } = client
        const embed = new MessageEmbed()
            .setColor(elementColors[char.meta.element] ?? "")
            .setThumbnail(char.icon)
            .setFooter(`Page ${page + 1} / ${this.getCharPages(char)["🎨"] + 1}`)

        if (page == 0) {
            embed.setTitle(`${char.name}: Description`)
                .addField("Basics", `${this.getElementIcons(char)} ${char.star}★ ${data.emoji(char.weaponType, true)} user`)
                .setDescription(char.desc)

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
            embed.setTitle(`${char.name}: Ascensions + stats`)
                .setDescription("TODO")
            return embed
        }

        let currentPage = 3
        for (const skills of char.skills) {
            embed.setColor(elementColors[skills.ult.type ?? "None"])

            for (const talent of skills.talents) {
                if (currentPage++ == page) {
                    embed.setTitle(`${char.name}: ${talent.name}`)
                        .setDescription(talent.desc) // TODO
                    return embed
                }
            }

            if (currentPage++ == page) {
                embed.setTitle(`${char.name}: ${skills.ult.name}`)
                    .setDescription(skills.ult.desc) // TODO
                return embed
            }

            for (const passive of skills.passive) {
                if (currentPage++ == page) {
                    embed.setTitle(`${char.name}: ${passive.name}`)
                        .setDescription(passive.desc) // TODO
                    return embed
                }
            }

            let c = 0
            for (const constellation of skills.constellations) {
                c++
                if (currentPage++ == page) {
                    embed.setTitle(`${char.name} C${c}: ${constellation.name}`)
                        .setThumbnail(constellation.icon)
                        .setDescription(constellation.desc) // TODO
                    return embed
                }
            }
        }

        if (currentPage++ == page) {
            embed.setTitle(`${char.name}`)
                .setImage(char.iconBig)
            embed.thumbnail = null
            return embed
        }

        return undefined
    }
}
