import { Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"

export default class WeaponMats extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Weapons",
            help: "List weapon material days.",
            usage: "weaponmats",
            aliases: ["wm", "weaponmat", "wmats"]
        })
    }

    async run(message: Message): Promise<Message | Message[]> {
        const { data } = client

        const mats = {
            "Monday & Thursday": ["Debris of Decarabian's City", "Lustrous Stone from Guyun"],
            "Tuesday & Friday": ["Boreal Wolf's Cracked Tooth", "Mist Veiled Mercury Elixir"],
            "Wednesday & Saturday": ["Chains of the Dandelion Gladiator", "Piece of Aerosiderite"],
        }

        return message.channel.send(`**Weapon Ascension Materials**:
${Object.entries(mats).map(([day, mats]) => `**${day}**: ${mats.map(mat => data.emoji(mat, true)).join(" / ")}`).join("\n")}
**Sunday**: All materials are available`)
    }
}
