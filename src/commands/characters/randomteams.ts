import { CommandInteraction, Message } from "discord.js"

import Command from "../../utils/Command"
import client from "../../main"
import { sendMessage } from "../../utils/Utils"
import { CommandSource, SendMessage } from "../../utils/Types"

export default class RandomTeams extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Character",
            help: "Generate random teams.",
            usage: "randomteam",
            aliases: ["randomteam", "rt", "rts", "rab", "randomabyss", "rng"],
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
        const chars = this.shuffle(data.getReleasedCharacters().map(x => x.name))

        return sendMessage(source, `**Random teams**:
**Team 1**: ${chars.slice(0, 4).map(x => data.emoji(x, true)).join(", ")}
**Team 2**: ${chars.slice(4, 8).map(x => data.emoji(x, true)).join(", ")}

Replacement characters in case you're missing any: ${chars.slice(8, 14).map(x => data.emoji(x, true)).join(", ")}`)
    }

    shuffle(input: string[]): string[] {
        for (let i = input.length; 0 !== i; i--) {
            const rand = Math.floor(Math.random() * (i+1))

            const tmp = input[i]
            input[i] = input[rand]
            input[rand] = tmp
        }

        return input
    }
}
