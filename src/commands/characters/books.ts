import { ApplicationCommandOptionType, ChatInputCommandInteraction, Message } from "discord.js"

import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, Cost, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"

export default class Books extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            help: `List talent book days or calculate amount needed.

Amounts need to be without extras from constellations`,
            usage: "books (list) | books calc <A/B/C> <X/Y/Z>",
            aliases: ["talent", "talents", "talentbook", "tb", "t", "b"],
            options: [{
                name: "list",
                description: "List book days",
                type: ApplicationCommandOptionType.Subcommand,
            }, {
                name: "calc",
                description: "Check how many books you need to go from A/B/C to X/Y/Z",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "current",
                    description: "Current talent levels (Excluding extra from constellations)",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }, {
                    name: "target",
                    description: "Target talent levels (Excluding extra from constellations)",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }]
            }, ]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source
        const sub = options.getSubcommand()

        if (sub == "list")
            return this.runList(source)
        else if (sub == "calc")
            return this.runCalc(source, options.getString("current", true), options.getString("target", true))
        else
            return sendMessage(source, `Unknown subcommand ${sub}`)
    }
    async runMessage(source: Message|ChatInputCommandInteraction, args: string[]): Promise<SendMessage | undefined> {
        const sub = args[0]?.toLowerCase() ?? "list"
        args.shift()

        if (["list", "l"].includes(sub)) {
            return this.runList(source)
        } else if (["calc", "amount"].includes(sub)) {
            if (args.length < 2) return this.sendHelp(source)

            return this.runCalc(source, args[0], args[1])
        } else {
            return sendMessage(source, `Unknown subcommand \`${sub}\``)
        }
    }

    async runList(source: CommandSource): Promise<SendMessage | undefined> {
        const { data } = client
        const { materials } = data

        const allBooks = Object.values(materials)
            .filter(x => x.type?.startsWith("Character Talent Material") && x.stars == 3)

        const days = [
            ["Monday & Thursday", "Monday/Thursday/Sunday"],
            ["Tuesday & Friday", "Tuesday/Friday/Sunday"],
            ["Wednesday & Saturday", "Wednesday/Saturday/Sunday"]
        ].map(([days, source]) => {
            const books = allBooks.filter(b => b.sources?.some(s => s.endsWith(`(${source})`))).map(b => b.name)
            return { days, books }
        })

        return sendMessage(source, `**Talent Books**:
${days.map(({ days, books }) => `**${days}**: ${books.map(book => `${data.emoji(book)} ${book.split(" ").pop()}`).join(" / ")}`).join("\n")}
**Sunday**: All books are available

Calculate how much you need with \`${config.prefix}b calc <current> <target>\` (Example: \`${config.prefix}b calc 4/6/6 9/9/9\`)`)
    }

    async runCalc(source: CommandSource, current: string, target: string): Promise<SendMessage | undefined> {
        const currents = current.split("/").map(x => parseInt(x))
        const targets = target.split("/").map(x => parseInt(x))

        const { talentCosts }= client.data.costTemplates
        const maxLevel = talentCosts.length + 1

        if (currents.some(x => isNaN(x)))
            return sendMessage(source, `Invalid current levels \`${current}\` (not a number)`, undefined, true)
        if (targets.some(x => isNaN(x)))
            return sendMessage(source, `Invalid target levels \`${target}\` (not a number)`, undefined, true)

        if (currents.some(x => x < 1))
            return sendMessage(source, `Invalid current levels \`${current}\` (too low)`, undefined, true)
        if (targets.some(x => x < 1))
            return sendMessage(source, `Invalid target levels \`${target}\` (too low)`, undefined, true)

        if (currents.some(x => x > maxLevel))
            return sendMessage(source, `Invalid current levels \`${current}\` (too big)`, undefined, true)
        if (targets.some(x => x > maxLevel))
            return sendMessage(source, `Invalid target levels \`${target}\` (too big)`, undefined, true)

        if (currents.length != targets.length)
            return sendMessage(source, `Amount of levels don't match \`${current}\` -> \`${target}\``, undefined, true)

        const names: Record<string, { emoji: string, text: string }>  = {
            "Teachings of <Book>": {
                emoji: "Teachings of Diligence",
                text: "Teachings of <Book>"
            },
            "Guide to <Book>": {
                emoji: "Guide to Diligence",
                text: "Guide to <Book>"
            },
            "Philosophies of <Book>": {
                emoji: "Philosophies of Diligence",
                text: "Philosophies of <Book>"
            },
            "<EnemyDropTier1>": {
                emoji: "Whopperflower Nectar",
                text: "Enemy Drop Tier 1"
            },
            "<EnemyDropTier2>": {
                emoji: "Shimmering Nectar",
                text: "Enemy Drop Tier 2"
            },
            "<EnemyDropTier3>": {
                emoji: "Energy Nectar",
                text: "Enemy Drop Tier 3"
            },
            "<BossMat>": {
                emoji: "Shard of a Foul Legacy",
                text: "Weekly Boss Material"
            },
            "Crown of Insight": {
                emoji: "Crown of Insight",
                text: "Crown of Insight"
            }
        }

        const totalCosts: Cost = {
            mora: 0,
            items: Object.keys(names).map(name => ({ name, count: 0 })),
        }

        for (const i in currents) {
            const current = currents[i]
            const target = targets[i]

            if (target <= current) currents[i] = target
            else
                for (let j = current; j < target; j++) {
                    const costs = talentCosts[j-1]
                    totalCosts.mora = (totalCosts.mora ?? 0) + (costs.mora ?? 0)

                    for (const item of costs.items) {
                        const found = totalCosts.items.find(i => i.name == item.name)
                        if (found)
                            found.count = found.count + item.count
                        else
                            totalCosts.items.push(item)
                    }
                }
        }


        return sendMessage(source, `Materials needed to go from talent levels \`${currents.join("/")}\` to \`${targets.join("/")}\`

${totalCosts.items.filter(i => i.count > 0).map(i => `${client.data.emoji(names[i.name]?.emoji ?? i.name, false)} ${names[i.name]?.text ?? i.name}: **${i.count}**`).join("\n")}
${client.data.emoji("Mora", true)}: **${totalCosts.mora?.toLocaleString()}**`)
    }
}
