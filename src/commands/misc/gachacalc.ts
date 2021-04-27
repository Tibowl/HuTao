import { Message } from "discord.js"
import memoize from "memoizee"

import Command from "../../utils/Command"
import config from "../../data/config.json"
import { createTable } from "../../utils/Utils"
import log4js from "log4js"

const Logger = log4js.getLogger("GachaCalc")

const gachas: Record<string, Banner> = {
    char: {
        bannerName: "5* Banner character",
        banner: 0.5,
        guaranteed: 1,
        maxConst: 6,
        constFormat: "C",
        constName: "Constellations",
        maxPity: 90,
        rate: (pity) => pity < 74 ? 0.6 : [6.6, 12.9, 18.6, 24.4, 31, 36.3, 41.7, 48.4, 54.6, 60, 65, 71, 76, 82, 88, 94, 100][pity - 74] ?? 100
    },
    "4*char": {
        bannerName: "Specific 4* banner character",
        banner: 0.5,
        guaranteed: 1/3,
        maxConst: 6,
        constFormat: "C",
        constName: "Constellations",
        maxPity: 10,
        rate: (pity) => pity < 9 ? 6.2 : [57, 100][pity - 9] ?? 100
    },
    weapon: {
        bannerName: "Specific banner weapon",
        banner: 0.75,
        guaranteed: 0.5,
        maxConst: 5,
        constFormat: "R",
        constName: "Refinements",
        maxPity: 80,
        rate: (pity) => pity < 63 ? 0.7 : [7.96, 16, 22.3, 28.7, 37.1, 44, 49, 53, 61, 65.2, 70, 73, 78, 82, 86, 90, 95, 100][pity - 63] ?? 100
    }
}

type Banner = {
    bannerName: string
    banner: number
    guaranteed: number
    maxConst: number
    maxPity: number
    constFormat: string
    constName: string
    rate: (pity: number) => number
}

type Sim = ReducedSim & {
    pity: number
    guaranteed: boolean

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
            help: `Calculate chance to get banner character/weapon in a certain amount of pulls.

Available banners: ${Object.keys(gachas).map(x => `\`${x}\``).join(", ")}

NOTE: Rates with high pity might not be accurate, not a lot of data in this range (especially with weapon banner)...
            
Example with just amount of pulls (assumes char banner, 50/50 limited, 0 pity): \`${config.prefix}gachacalc 70\`
Example with 70 pulls and 10 pity: \`${config.prefix}gachacalc 70 10\`
Example with 70 pulls, 10 pity and guaranteed: \`${config.prefix}gachacalc 70 10 y\`
`,
            usage: "gachacalc [gacha] <pulls> [pity] [guaranteed]",
            aliases: ["gc", "gachasim", "gcalc", "gsim", "gs"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (args.length <= 0) return this.sendHelp(message)

        let gacha = "char"
        if (Object.keys(gachas).includes(args[0].toLowerCase()))
            gacha = args.shift()?.toLowerCase() ?? "char"

        const pulls = parseInt(args[0] ?? "75")
        if (isNaN(pulls) || pulls <= 0 || pulls > 9999)
            return message.channel.send("Invalid pulls amount, should be a number greater than 1")

        const pity = parseInt(args[1] ?? "0")
        if (isNaN(pity) || pity < 0 || pity >= 90) // TODO check banner
            return message.channel.send("Invalid pity amount, should be a number between 0 (inclusive) and 90 (exclusive)")

        let guaranteed = false
        if (args[2]?.match(/y(es)|t(rue)|g(uaranteed)/))
            guaranteed = true
        else if (args[2]?.match(/no?|f(alse)|50\/50|75\/25/))
            guaranteed = false
        else if (args[2])
            return message.channel.send("Invalid 50/50, should be y(es)/g(uaranteed) or n(o)/50/50")

        const banner = gachas[gacha]

        const start = Date.now()
        const sims = this.calcSims(pity, pulls, guaranteed, gacha)
        const time = Date.now() - start
        Logger.info(`Calculation done in ${time}ms`)

        return message.channel.send(`**${banner.bannerName}** in **${pulls}** pulls, starting from **${pity}** pity and **${guaranteed ? "guaranteed" : `${banner.banner * 100}/${(1 - banner.banner) * 100}`}** banner:
\`\`\`
${createTable(
        [banner.constName, "Rate"],
        sims
            .sort((a, b) => a.const - b.const)
            .map(k => [k.const < 0 ? "/" : `${banner.constFormat}${k.const}`, `${(k.rate * 100).toFixed(2)}%`])
    )}
\`\`\``)
    }

    calcSims = memoize(this.calcSimsRegular, { max: 1 })

    private calcSimsRegular(pity: number, pulls: number, guaranteed: boolean, bannerName: string): ReducedSim[] {
        const banner = gachas[bannerName]

        // Max pity / const
        if (banner.guaranteed >= 1 && pulls + pity >= banner.maxPity * (banner.maxConst * 2 - (guaranteed ? 1 : 0)))
            return [{
                const: banner.maxConst,
                rate: 1
            }]

        return this.calcSimsInt({
            pity,
            guaranteed,
            const: -1,
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
            const newSims: Sim[] = []

            const addOrMerge = (sim: Sim) => {
                if (sim.rate <= 0) return

                const v = ((+sim.guaranteed) * (banner.maxConst + 1) + (sim.const + 1)) * 100 + sim.pity
                const other = newSims[v]

                if (other) {
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
                const rate = banner.rate(currentPity) / 100
                const bannerRate = sim.guaranteed ? 1 : banner.banner

                // Failed
                if (rate < 1)
                    addOrMerge({
                        pity: currentPity,
                        guaranteed: sim.guaranteed,
                        const: sim.const,
                        rate: sim.rate * (1 - rate)
                    })

                // Got wanted banner item
                addOrMerge({
                    pity: 0,
                    guaranteed: false,
                    const: sim.const + 1,
                    rate: sim.rate * rate * bannerRate * banner.guaranteed
                })

                // Got banner item but not wanted
                if (banner.guaranteed < 1)
                    addOrMerge({
                        pity: 0,
                        guaranteed: false,
                        const: sim.const,
                        rate: sim.rate * rate * bannerRate * (1-banner.guaranteed)
                    })

                // Failed banner item
                if (bannerRate < 1)
                    addOrMerge({
                        pity: 0,
                        guaranteed: true,
                        const: sim.const,
                        rate: sim.rate * rate * (1 - bannerRate)
                    })
            }

            sims = newSims
        }
        return sims
    }
}
// const gc = new GachaCalc("a")
// while (true) {
//     const start = Date.now()
//     for (let i = 0; i < 1000; i += 20) {
//         gc.calcSims(0, i, false, "char")
//     }
//     console.log(Date.now() - start)
// }
