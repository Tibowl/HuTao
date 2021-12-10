import log4js from "log4js"
import { Interaction, TextChannel } from "discord.js"
import { addACStats, addStats, getCommand, handleAutoComplete, handleCommand } from "../utils/CommandHandler"

const Logger = log4js.getLogger("interactionCreate")

export async function handle(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand() && !interaction.isAutocomplete()) return

    const cmdInfo = getCommand(interaction.commandName)

    if (cmdInfo && cmdInfo.cmd) {
        if (interaction.isCommand()) {
            Logger.info(`${interaction.user.id} (${interaction.user.tag}) executes slash command in ${interaction.channel instanceof TextChannel ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.commandName} ${interaction.options.data.map(x => `${x.name}->${x.value??"/"}`)}`)
            addStats(cmdInfo)
            await handleCommand(cmdInfo, interaction)
        } else if (interaction.isAutocomplete()) {
            Logger.info(`${interaction.user.id} (${interaction.user.tag}) executes slash command in ${interaction.channel instanceof TextChannel ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.commandName} ${interaction.options.data.map(x => `${x.name}->${x.value??"/"}`)}`)
            addACStats(cmdInfo)
            await handleAutoComplete(cmdInfo, interaction)
        }
    }
}
