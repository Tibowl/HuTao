import { ApplicationCommandOptionType, ChatInputCommandInteraction, Message } from "discord.js"
import memoize from "memoizee"

import log4js from "log4js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { createTable, PAD_END, PAD_START, sendMessage } from "../../utils/Utils"

const Logger = log4js.getLogger("GachaCalc")

function pityRate(baseRate: number, pityStart: number): (pity: number) => number {
    return (pity) => pity < pityStart ? baseRate : baseRate + baseRate * 10 * (pity - pityStart + 1)
}

const gachas: Record<string, Banner> = {
    char: {
        bannerName: "5* Banner character",
        banner: 0.55,
        guaranteed: 1,
        minConst: -1,
        maxConst: 6,
        constFormat: "C",
        constName: "Constellations",
        maxPity: 90,
        rate: pityRate(0.6, 74)
    },
    "4*char": {
        bannerName: "Specific 4* banner character",
        banner: 0.5,
        guaranteed: 1/3,
        minConst: -1,
        maxConst: 6,
        constFormat: "C",
        constName: "Constellations",
        maxPity: 10,
        rate: pityRate(5.1, 9)
    },
    weapon: {
        bannerName: "Specific 5* banner weapon",
        banner: 0.75,
        guaranteed: 1/2,
        guaranteedPity: 2,
        minConst: 0,
        maxConst: 5,
        constFormat: "R",
        constName: "Refinements",
        maxPity: 80,
        rate: pityRate(0.7, 63)
    }
}

type Banner = {
    bannerName: string
    banner: number
    guaranteed: number
    guaranteedPity?: number
    minConst: number
    maxConst: number
    maxPity: number
    constFormat: string
    constName: string
    rate: (pity: number) => number
}

type Sim = ReducedSim & {
    pity: number
    guaranteed: boolean
    guaranteedPity: number
}
type ReducedSim = {
    const: number
    rate: number
}

export default class GachaCalc extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Calculate chance to get banner character/weapon in a certain amount of pulls. (Updated for 5.0+)
Also available online at <${client.data.baseURL}tools/gachacalc>

Available banners: ${Object.keys(gachas).map(x => `\`${x}\``).join(", ")}

NOTE: Updated to use rate data of <https://www.hoyolab.com/article/497840> and assumes weapon selected for "Epitomized Path" <https://www.hoyolab.com/article/533196>

Example with just amount of pulls (assumes char banner, 50/50 limited, 0 pity): \`${config.prefix}gachacalc 70\`
Example with 70 pulls and 10 pity: \`${config.prefix}gachacalc 70 10\`
Example with 70 pulls, 10 pity and guaranteed: \`${config.prefix}gachacalc 70 10 y\`
Example with 70 pulls, 10 pity and guaranteed for 5 star weapon banner: \`${config.prefix}gachacalc weapon 70 10 y\`
`,
            usage: "gachacalc [gacha] <pulls> [pity] [guaranteed] [current const/refinement] [Epitomized Path progress]",
            aliases: ["gc", "gachasim", "gcalc", "gsim", "gs"],
            options: [{
                name: "pulls",
                description: "Amount of pulls to simulate",
                type: ApplicationCommandOptionType.Integer,
                required: true
            }, {
                name: "gacha",
                description: "Start with guaranteed rate up",
                type: ApplicationCommandOptionType.String,
                choices: [{
                    name: "Character banner (5*)",
                    value: "char"
                }, {
                    name: "Specific rate-up 4* on character banner",
                    value: "4*char"
                }, {
                    name: "Weapon banner (specific rate-up 5*)",
                    value: "weapon"
                }],
                required: false
            }, {
                name: "pity",
                description: "Amount of pity to start at",
                type: ApplicationCommandOptionType.Integer,
                required: false
            }, {
                name: "guaranteed",
                description: "Start with guaranteed rate up",
                type: ApplicationCommandOptionType.Boolean,
                required: false
            }, {
                name: "current",
                description: "Current amount of copies to start with (default: none)",
                type: ApplicationCommandOptionType.Integer,
                required: false
            }, {
                name: "guaranteed_pity",
                description: "Amount of Epitomized Path to start with (for Weapon banner)",
                type: ApplicationCommandOptionType.Integer,
                required: false
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const gacha = options.getString("gacha") ?? "char"
        const pulls = options.getInteger("pulls", true)
        const pity = options.getInteger("pity") ?? 0
        const current = options.getInteger("current") ?? -1
        const guaranteedPity = options.getInteger("guaranteed_pity") ?? 0
        const guaranteed = options.getBoolean("guaranteed") ?? false

        return this.run(source, gacha, current, pulls, pity, guaranteed, guaranteedPity)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length <= 0) return this.sendHelp(source)

        let gacha = "char"
        if (Object.keys(gachas).includes(args[0].toLowerCase()))
            gacha = args.shift()?.toLowerCase() ?? "char"

        const pulls = parseInt(args[0] ?? "75")
        const pity = parseInt(args[1] ?? "0")
        const current = parseInt(args[3] ?? "-1")
        const guaranteedPity = parseInt(args[4] ?? "0")

        let guaranteed = false
        if (args[2]?.match(/y(es)?|t(rue)?|g(uaranteed)?/))
            guaranteed = true
        else if (args[2]?.match(/no?|f(alse)?|50\/50|75\/25/))
            guaranteed = false
        else if (args[2])
            return sendMessage(source, "Invalid 50/50, should be y(es)/g(uaranteed) or n(o)/50/50")
        return this.run(source, gacha, current, pulls, pity, guaranteed, guaranteedPity)
    }

    async run(source: CommandSource, gacha: string, current: number, pulls: number, pity: number, guaranteed: boolean, guaranteedPity: number): Promise<SendMessage | undefined> {
        const banner = gachas[gacha]

        if (isNaN(pulls) || pulls <= 0 || pulls > 9999)
            return sendMessage(source, "Invalid pulls amount, should be a number greater than 1")
        if (isNaN(pity) || pity < 0 || pity > banner.maxPity)
            return sendMessage(source, `Invalid pity amount, should be a number between 0 and ${banner.maxPity}`)
        if (isNaN(current) || current > banner.maxConst)
            return sendMessage(source, `Invalid currently owned, should be a number between -1 (not owned) and ${banner.maxConst}`)
        if (isNaN(guaranteedPity) || guaranteedPity < 0 || guaranteedPity > (banner.guaranteedPity ?? 0))
            return sendMessage(source, `Invalid guaranteed pity/Epitomized Path, should be a number between 0 and ${banner.guaranteedPity ?? 0}`)

        if (current < banner.minConst) current = banner.minConst

        const start = Date.now()
        const sims = this.calcSims(current, pity, pulls, guaranteed, guaranteedPity, banner)
        const time = Date.now() - start
        Logger.info(`Calculation done in ${time}ms`)

        return sendMessage(source, `**${banner.bannerName}** in **${pulls}** pulls, starting from **${pity}** pity and **${guaranteed ? "guaranteed" : `${banner.banner * 100}/${(1 - banner.banner) * 100}`}** banner:
\`\`\`
${createTable(
        [banner.constName, "Rate", "Cumulative Rate"],
        sims
            .sort((a, b) => a.const - b.const)
            .map((k, i, a) => [
                k.const == banner.minConst ? "/" : `${banner.constFormat}${k.const}`,
                `${(k.rate * 100).toFixed(2)}%`,
                `${(a.slice(i, a.length).reduce((p, c) => p + c.rate, 0) * 100).toFixed(2)}%`
            ]),
        [PAD_END, PAD_START, PAD_START]
    )}
\`\`\`
Web calculator (with graphs) is available on <${client.data.baseURL}tools/gachacalc>`)
    }

    calcSims = memoize(this.calcSimsRegular, { max: 50 })

    private calcSimsRegular(current: number, pity: number, pulls: number, guaranteed: boolean, guaranteedPity: number, banner: Banner): ReducedSim[] {
        // Max pity / const
        if (banner.guaranteed >= 1 && pulls + pity >= banner.maxPity * (banner.maxConst * 2 - (guaranteed ? 1 : 0)))
            return [{
                const: banner.maxConst,
                rate: 1
            }]

        if (banner.guaranteedPity && banner.guaranteedPity >= 1 && pulls + pity >= banner.maxPity * (banner.maxConst * banner.guaranteedPity * 2 - (guaranteed ? 1 : 0)))
            return [{
                const: banner.maxConst,
                rate: 1
            }]

        return this.calcSimsInt({
            pity,
            guaranteed,
            guaranteedPity,
            const: current,
            rate: 1
        }, pulls, banner)
    }


    private calcSimsInt(starterSim: Sim, pulls: number, banner: Banner): ReducedSim[] {
        const sims: Sim[] = this.calcSimsExact([starterSim], pulls, banner)

        // Reducing to simple sims with less information
        const reducedSims: ReducedSim[] = []
        sims.forEach((sim: Sim) => {
            if (sim.rate == 0) return

            const other = reducedSims[sim.const + 1]

            if (other)
                other.rate += sim.rate
            else
                reducedSims[sim.const + 1] = {
                    const: sim.const,
                    rate: sim.rate
                }
        })

        return reducedSims.filter(k => k.rate >= 0.005)
    }

    private calcSimsExact(sims: Sim[], pulls: number, banner: Banner, prune = 1e-8) {
        for (let i = 0; i < pulls; i++) {
            const newSims: Record<number, Sim> = {}

            const addOrMerge = (sim: Sim) => {
                if (sim.rate <= 0) return

                const v = sim.pity + (banner.maxPity + 1) * ((sim.const + 1) + ((banner.maxConst + 2) * (+sim.guaranteed + (2 * sim.guaranteedPity))))
                const other = newSims[v]

                if (other) {
                    // if (other.const != sim.const) console.error("const", v, sim, other)
                    // if (other.guaranteed != sim.guaranteed) console.error("guaranteed", v, sim, other)
                    // if (other.guaranteedPity != sim.guaranteedPity) console.error("guaranteedPity", v, sim, other)
                    // if (other.pity != sim.pity) console.error("pity", v, sim, other)

                    other.rate += sim.rate
                    return
                }

                newSims[v] = sim
            }

            for (const sim of sims) {
                if (!sim) continue
                if (sim.rate <= prune) continue // Pruning
                if (sim.const >= banner.maxConst) { // Limited to C6
                    addOrMerge(sim)
                    continue
                }
                const currentPity = sim.pity + 1
                let rate = banner.rate(currentPity) / 100
                if (rate > 1) rate = 1
                else if (rate < 0) rate = 0
                const bannerRate = (
                    sim.guaranteed ||
                (banner.guaranteedPity && sim.guaranteedPity >= banner.guaranteedPity - 1)
                ) ? 1 : banner.banner

                // Failed
                if (rate < 1)
                    addOrMerge({
                        pity: currentPity,
                        guaranteed: sim.guaranteed,
                        guaranteedPity: sim.guaranteedPity,
                        const: sim.const,
                        rate: sim.rate * (1 - rate)
                    })

                // Got wanted banner item
                addOrMerge({
                    pity: 0,
                    guaranteed: false,
                    guaranteedPity: 0,
                    const: sim.const + 1,
                    rate: sim.rate * rate * bannerRate * banner.guaranteed
                })

                // Got banner item but not wanted (eg. wrong rate up 4* char/5* char)
                if (banner.guaranteed < 1)
                    if (banner.guaranteedPity && sim.guaranteedPity >= banner.guaranteedPity - 1)
                    // https://www.hoyolab.com/article/533196
                        addOrMerge({
                            pity: 0,
                            guaranteed: false,
                            guaranteedPity: 0,
                            const: sim.const + 1,
                            rate: sim.rate * rate * bannerRate * (1 - banner.guaranteed)
                        })
                    else
                        addOrMerge({
                            pity: 0,
                            guaranteed: false,
                            guaranteedPity: banner.guaranteedPity ? sim.guaranteedPity + 1 : 0,
                            const: sim.const,
                            rate: sim.rate * rate * bannerRate * (1 - banner.guaranteed)
                        })

                // Failed banner items (eg. 4* char rate ups vs regular 4*)
                if (bannerRate < 1)
                    addOrMerge({
                        pity: 0,
                        guaranteed: true,
                        guaranteedPity: banner.guaranteedPity ? sim.guaranteedPity + 1 : 0,
                        const: sim.const,
                        rate: sim.rate * rate * (1 - bannerRate)
                    })
            }

            sims = Object.values(newSims)
        }
        return sims
    }
}

/*
const gc = new GachaCalc("gc")
const start = Date.now()
for (let i = 0; i < 1000; i += 20) {
    gc.calcSims(-1, 0, i, false, 0, gachas.weapon)
}
console.log(Date.now() - start)
*/
