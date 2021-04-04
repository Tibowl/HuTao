import { Message, MessageEmbed } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { paginator } from "../../utils/Utils"
import { AbyssSchedule } from "../../utils/Types"
import config from "../../data/config.json"

const names: Record<string, string> = {
    "1/1": "Enemies",
    "1/2": "First Half",
    "2/2": "Second Half",
}
export default class AbyssCommand extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            usage: "abyss [cycle: yyyy-mm-1/yyyy-mm-2] [floor]",
            help: `Displays abyss information. If no arguments are provided, current floors will be listed.

If only a floor is proved (like \`${config.prefix}abyss 7\`), then this floor is directly displayed.

Old abyss floors/buffs can be accessed by giving the cycle (like \`${config.prefix}abyss 2020-12-2\`)`,
            aliases: ["spiral", "spiralabyss", "floor"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[] | undefined> {
        const { data } = client

        const schedule = data.getAbyssSchedules()
        let abyss = schedule[schedule.length - 1]

        let floor = -1
        for (const arg of args) {
            const matchedDate = arg.match(/^(\d\d\d\d)-(\d\d?)-(\d)$/)
            if (arg.match(/^\d+$/)) {
                floor = +arg
            } else if (matchedDate) {
                const [line, year, month, cycle] = matchedDate

                abyss = schedule.filter(s => s.start.startsWith(`${year}-${month.padStart(2, "0")}-`))?.[+cycle - 1]
                if (!abyss)
                    return message.channel.send(`Couldn't find abyss \`${line}\``)
            } else
                return message.channel.send(`Unknown abyss argument \`${arg}\`.`)
        }
        if (floor > 0 && floor <= abyss.regularFloors.length) {
            return message.channel.send(this.getSpiralFloor(abyss.regularFloors[floor - 1], floor))
        }

        const defaultPage = floor > 0 ? floor - abyss.regularFloors.length : 0

        const embed = this.getSpiralAbyss(abyss, defaultPage)
        if (!embed) return message.channel.send("No abyss data loaded")

        const reply = await message.channel.send(embed)
        await paginator(message, reply, (page) => this.getSpiralAbyss(abyss, page), undefined, defaultPage)
        return undefined
    }

    getSpiralAbyss(abyss: AbyssSchedule, page: number): MessageEmbed | undefined {
        const footer = `Page ${page + 1} / ${1 + abyss.spiralAbyssFloors.length}`
        const embed = new MessageEmbed()
            .setColor("#6B68B1")
            .setFooter(footer)

        let currentPage = 0
        if (page == currentPage++) {
            embed.setTitle(`Spiral Abyss: ${abyss.buff}`)
                .setDescription(abyss.buffDesc)
                .addField("Starts", abyss.start, true)
                .addField("Ends", abyss.end, true)
            return embed
        }

        const floor = abyss.spiralAbyssFloors[page - 1]
        if (floor)
            return this.getSpiralFloor(floor, abyss.regularFloors.length + page)
                .setFooter(footer)

        return undefined
    }

    getSpiralFloor(floorId: number, num: number): MessageEmbed {
        const floor = client.data.abyssFloors[floorId]

        const embed = new MessageEmbed()
            .setColor("#6B68B1")
            .setTitle(`Floor ${num}`)
            .setDescription(floor.leyline)

        const lastChamber = floor.chambers[floor.chambers.length - 1]
        for (const chamber of floor.chambers) {
            embed.addField(`Chamber ${chamber.chamber}: Conditions`, chamber.conds.join("\n"))

            for (const [ind, monsters] of Object.entries(chamber.monsters)) {
                const status = `${+ind+1}/${chamber.monsters.length}`
                embed.addField(`${names[status] ?? status}: (Lv. ${chamber.level})`, `${monsters.join("\n")}${chamber == lastChamber ? "" : "\n\u200B"}`, true)
            }
        }

        return embed
    }
}
