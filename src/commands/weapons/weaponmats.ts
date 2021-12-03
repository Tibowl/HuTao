import { CommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { sendMessage } from "../../utils/Utils"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class WeaponMats extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Weapons",
            help: "List weapon material days.",
            usage: "weaponmats",
            aliases: ["wm", "weaponmat", "wmats"],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        const { data } = client
        const { weaponMats } = data

        return sendMessage(source, `**Weapon Ascension Materials**:
${Object.entries(weaponMats).map(([day, mats]) => `**${day}**: ${mats.map(mat => data.emoji(mat, true)).join(" / ")}`).join("\n")}
**Sunday**: All materials are available`)
    }
}
