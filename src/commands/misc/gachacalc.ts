import { Message } from "discord.js"
import memoize from "memoizee"

import Command from "../../utils/Command"
import config from "../../data/config.json"
import { createTable } from "../../utils/Utils"
import log4js from "log4js"

const Logger = log4js.getLogger("GachaCalc")

const gachas: Record<string, Banner> = {
    char: {
        banner: 0.5,
        rate: (pity) => pity < 74 ? 0.6 : [6.8, 12.7, 18.8, 24.9, 30.7, 37.1, 42.3, 48.6, 55, 60.2, 62.3, 70, 75, 80, 90, 95, 100][pity - 74] ?? 100
    }
}

type Banner = {
    banner: number
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
            help: `Calculate chance to get banner character in a certain amount of pulls.

NOTE: Rates with high pity might not be accurate, not a lot of data in this rang...
            
Example with just amount of pulls (assumes char banner, 50/50 limited, 0 pity): \`${config.prefix}gachacalc 70\``,
            usage: "gachacalc <pulls>",
            aliases: ["gc", "gachasim", "gcalc", "gsim", "gs"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (args.length <= 0) return this.sendHelp(message)

        const pulls = parseInt(args[0] ?? "75")
        if (isNaN(pulls) || pulls <= 0 || pulls > 1000)
            return message.channel.send("Invalid pulls amount, should be a number greater than 1")

        const pity = parseInt(args[1] ?? "0")
        if (isNaN(pity) || pity < 0 || pity >= 90)
            return message.channel.send("Invalid pity amount, should be a number between 0 (inclusive) and 90 (exclusive)")

        let guaranteed = false
        if (args[2]?.match(/y(es)|t(rue)|g(uaranteed)/))
            guaranteed = true
        else if (args[2]?.match(/no?|f(alse)|50\/50/))
            guaranteed = false
        else if (args[2])
            return message.channel.send("Invalid 50/50, should be y(es)/g(uaranteed) or n(o)/50/50")

        const start = Date.now()
        const sims = this.calcSims(pity, pulls, guaranteed, "char")
        const time = Date.now() - start
        Logger.info(`Calculation done in ${time}ms`)

        return message.channel.send(`Banner character in **${pulls}** pulls, starting from **${pity}** pity and **${guaranteed ? "guaranteed" : "50/50"}** banner:
\`\`\`
${createTable(
        ["Constellations", "Rate"],
        sims
            .sort((a, b) => a.const - b.const)
            .map(k => [k.const < 0 ? "/" : `C${k.const}`, `${(k.rate * 100).toFixed(2)}%`])
    )}
\`\`\``)
    }

    calcSims = memoize(this.calcSimsRegular, { max: 100 })

    private calcSimsRegular(pity: number, pulls: number, guaranteed: boolean, banner: string): ReducedSim[] {
        return this.calcSimsInt({
            pity,
            guaranteed,
            const: -1,
            rate: 1
        }, pulls, gachas[banner])
    }

    private calcSimsInt(starterSim: Sim, pulls: number, banner: Banner): ReducedSim[] {
        const sims: Sim[] = this.calcSimsExact([starterSim], pulls, banner)

        // Reducing to simple sims with less information
        const reducedSims: ReducedSim[] = []
        sims.forEach((sim: Sim) => {
            if (sim.rate == 0) return

            const other = reducedSims.find(s =>
                s.const == sim.const
            )

            if (other)
                other.rate += sim.rate
            else
                reducedSims.push({
                    const: sim.const,
                    rate: sim.rate
                })
        })

        return reducedSims.filter(k => k.rate >= 0.006)
    }

    private calcSimsExact(sims: Sim[], pulls: number, banner: Banner, prune = 1e-8) {
        for (let i = 0; i < pulls; i++) {
            const newSims: Sim[] = []

            const addOrMerge = (sim: Sim) => {
                if (sim.rate < 0) return

                const v = ((+sim.guaranteed) * 10 + (sim.const + 1)) * 100 + sim.pity
                const other = newSims[v]

                if (other) {
                    other.rate += sim.rate
                    return
                }

                newSims[v] = sim
            }

            for (const sim of sims) {
                if (sim.rate <= prune) continue // Pruning
                if (sim.const >= 6) { // Limited to C6
                    addOrMerge(sim)
                    continue
                }
                const currentPity = sim.pity + 1
                const rate = banner.rate(currentPity) / 100
                const bannerRate = sim.guaranteed ? 1 : banner.banner

                // Failed
                addOrMerge({
                    pity: currentPity,
                    guaranteed: sim.guaranteed,
                    const: sim.const,
                    rate: sim.rate * (1 - rate)
                })

                // Got banner
                addOrMerge({
                    pity: 0,
                    guaranteed: false,
                    const: sim.const + 1,
                    rate: sim.rate * rate * bannerRate
                })

                // Failed banner
                addOrMerge({
                    pity: 0,
                    guaranteed: true,
                    const: sim.const,
                    rate: sim.rate * rate * (1 - bannerRate)
                })
            }

            sims = newSims.filter(x => x)
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
