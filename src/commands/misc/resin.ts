import { CommandInteraction, Message } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { displayTimestamp, sendMessage, timeLeft } from "../../utils/Utils"
import config from "../../data/config.json"
import { CommandSource, SendMessage } from "../../utils/Types"

const values = [20, 40, 60, client.data.max_resin]
export default class Resin extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: `Get time until full resin refill/certain values (these are ${values.join(", ")}).

Example with just amount: \`${config.prefix}resin 13\`
Example with time until next resin: \`${config.prefix}resin 77 7:15\``,
            usage: "resin <current resin> [time until next resin in mm:ss]",
            aliases: ["re"],
            options: [{
                name: "current",
                description: "Current amount of resin",
                type: "NUMBER",
                required: true
            }, {
                name: "timeleft",
                description: "Amount of time until next resin gets refilled, using in-game's mm:ss format.",
                type: "STRING",
                required: false
            }]
        })
    }
    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source

        const currentResin = options.getNumber("current", true)
        const timeleft = options.getString("timeleft")

        return this.run(source, currentResin, timeleft)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length <= 0) return this.sendHelp(source)

        const [resin, timeleft] = args
        const currentResin = parseInt(resin)

        return this.run(source, currentResin, timeleft)
    }

    async run(source: CommandSource, currentResin: number, timeleft?: string | null): Promise<SendMessage | undefined> {
        const { max_resin, minutes_per_resin } = client.data

        if (isNaN(currentResin) || currentResin < 0 || currentResin > max_resin)
            return sendMessage(source, `Invalid current resin should be a number between 0 and ${max_resin}`)

        if (timeleft == undefined)
            timeleft = `${minutes_per_resin}:0`

        const split = timeleft.split(":").map(arg => parseInt(arg))
        if (split.length < 2)
            split.push(0)
        else if (split.length > 2)
            return sendMessage(source, "Invalid time left until next resin should be in mm:ss format")

        const [mm, ss] = split

        if (isNaN(mm) || mm < 0 || mm > minutes_per_resin)
            return sendMessage(source, `Invalid minutes until next resin should be a number between 0 and ${minutes_per_resin} minutes`)
        if (isNaN(ss) || ss < 0 || ss > 59 || (mm == minutes_per_resin && ss != 0))
            return sendMessage(source, "Invalid time until next resin, seconds should be a number between 0 and 59 seconds")

        if (currentResin == max_resin)
            return sendMessage(source, `Already at max resin (${currentResin}/${max_resin})`)

        const correction = mm * 60 + ss
        const getDelta = (target: number) => ((target - currentResin - 1) * minutes_per_resin * 60 + correction) * 1000

        return sendMessage(source, `Starting from ${currentResin}/${max_resin}:

${values.filter(target => target > currentResin).map(target => `**${target}**/${max_resin} resin in **${timeLeft(getDelta(target))}** (${displayTimestamp(new Date(Date.now() + getDelta(target)), "f")})`).join("\n")}`)
    }
}
