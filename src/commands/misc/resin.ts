import { Message } from "discord.js"
import client from "../../main"

import Command from "../../utils/Command"
import { sendMessage, timeLeft } from "../../utils/Utils"
import config from "../../data/config.json"

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
            aliases: ["re"]
        })
    }

    async run(message: Message, args: string[]): Promise<Message | Message[]> {
        if (args.length <= 0) return this.sendHelp(message)
        const { max_resin, minutes_per_resin } = client.data

        // eslint-disable-next-line prefer-const
        let [resin, timeleft] = args

        const currentResin = parseInt(resin)
        if (isNaN(currentResin) || currentResin < 0 || currentResin > max_resin)
            return sendMessage(message, `Invalid current resin should be a number between 0 and ${max_resin}`)

        if (timeleft == undefined)
            timeleft = `${minutes_per_resin}:0`

        const split = timeleft.split(":").map(arg => parseInt(arg))
        if (split.length < 2)
            split.push(0)
        else if (split.length > 2)
            return sendMessage(message, "Invalid time left until next resin should be in mm:ss format")

        const [mm, ss] = split

        if (isNaN(mm) || mm < 0 || mm > minutes_per_resin)
            return sendMessage(message, `Invalid minutes until next resin should be a number between 0 and ${minutes_per_resin} minutes`)
        if (isNaN(ss) || ss < 0 || ss > 59 || (mm == minutes_per_resin && ss != 0))
            return sendMessage(message, "Invalid time until next resin, seconds should be a number between 0 and 59 seconds")

        if (currentResin == max_resin)
            return sendMessage(message, `Already at max resin (${currentResin}/${max_resin})`)

        const correction = mm * 60 + ss

        return sendMessage(message, `Starting from ${currentResin}/${max_resin}:

${values.filter(target => target > currentResin).map(target => `**${target}**/${max_resin} resin in **${timeLeft(((target - currentResin - 1) * minutes_per_resin * 60 + correction) * 1000)}**`).join("\n")}`)
    }
}
