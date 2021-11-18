import log4js from "log4js"
import { Interaction, TextChannel } from "discord.js"
import { addStats, getCommand, handleCommand } from "../utils/CommandHandler"

const Logger = log4js.getLogger("interactionCreate")

export async function handle(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return

    const cmdInfo = getCommand(interaction.commandName)

    if (cmdInfo && cmdInfo.cmd) {
        Logger.info(`${interaction.user.id} (${interaction.user.tag}) executes slash command in ${interaction.channel instanceof TextChannel ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.commandName} ${interaction.options.data.map(x => `${x.name}->${x.value??"/"}`)}`)

        addStats(cmdInfo)
        await handleCommand(cmdInfo, interaction)
    }
}
