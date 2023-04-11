import { ChatInputCommandInteraction, Message } from "discord.js"

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

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        const { data } = client
        const { materials } = data

        const allWeaponMats = Object.values(materials)
            .filter(x => x.type == "Weapon Ascension Material" && x.stars == 3)

        const days = [
            ["Monday & Thursday", "Monday/Thursday/Sunday"],
            ["Tuesday & Friday", "Tuesday/Friday/Sunday"],
            ["Wednesday & Saturday", "Wednesday/Saturday/Sunday"]
        ].map(([days, source]) => {
            const weaponMats = allWeaponMats.filter(wm => wm.sources?.some(s => s.endsWith(`(${source})`))).map(wm => wm.name)
            return { days, weaponMats }
        })

        return sendMessage(source, `**Weapon Ascension Materials**:
${days.map(({ days, weaponMats }) => `**${days}**: ${weaponMats.map(weaponMat => `${data.emoji(weaponMat)} ${weaponMat}`).join(" / ")}`).join("\n")}
**Sunday**: All materials are available`)
    }
}
