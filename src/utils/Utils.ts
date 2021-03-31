import {  Message, TextChannel, StringResolvable, MessageEmbed, MessageAttachment } from "discord.js"

import client from "./../main"
import config from "./../data/config.json"
import { NameTable, Padding, Server } from "./Types"

/**
 * Send a message to a list of channels
 * @param channels List of channel ids
 * @param content Content to send
 * @param embed Possible embed/attachment to send
 * @returns All the messages send
 */
export async function sendToChannels(channels: string[] | undefined, content: StringResolvable, embed?: MessageEmbed | MessageAttachment): Promise<(Message | Message[])[]> {
    const messages = []
    if (!channels) return Promise.all([])

    for (const channel of channels) {
        const chanObj = await client.channels.fetch(channel)
        if (!(chanObj && chanObj instanceof TextChannel))
            continue

        if (embed)
            messages.push(chanObj.send(content, embed))
        else
            messages.push(chanObj.send(content))
    }

    return Promise.all(messages)
}

/**
 * Send something to the error log channels
 * @param content Content to send
 * @param embed Possible embed/attachment to send
 * @returns List of messages
 */
export async function sendError(content: StringResolvable, embed?: MessageEmbed | MessageAttachment): Promise<(Message | Message[])[]> {
    const channels = config.errorLog
    return sendToChannels(channels, content, embed)
}

export const PAD_START = 0
export const PAD_END = 1
/**
 * Create a string table from column names and data, assumes mono-width font
 * @param names Array or object with column names
 * @param rows Row data
 * @param pads Padding information
 * @returns Table
 */
export function createTable(names: NameTable | undefined, rows: StringResolvable[], pads: Padding[] = [PAD_END]): string {
    const maxColumns = Math.max(...rows.map(row => row.length))
    let title = "", currentInd = 0

    for (let i = 0; i < maxColumns; i++) {
        if (names && names[i])
            title = title.padEnd(currentInd) + names[i]

        const maxLength = Math.max(...rows.map(row => row.length > i ? (row[i]?.toString() ?? "").length : 0), (names && names[i + 1]) ? (title.length - currentInd) : 0)
        currentInd += 1 + maxLength

        rows.forEach(row => {
            if (row.length <= i) return

            const padEnd = pads.length > i ? pads[i] : pads[pads.length - 1]
            row[i] = padEnd ? row[i].toString().padEnd(maxLength) : row[i].toString().padStart(maxLength)
        })
    }

    const table = rows.map(row => row.join(" ").replace(/\s+$/, ""))
    if (names)
        return [title, ...table].join("\n")
    else
        return table.join("\n")
}

// Get time information
const offsets: {[server in Server]: number} = {
    America: -5,
    Europe: 1,
    Asia: +8,
    "TW, HK, MO": +8,
}
const servers = Object.keys(offsets) as Server[]

export function getServerTimeInfo(): {
    server: Server
    offset: string
    time: Date
    nextDailyReset: Date
    nextWeeklyReset: Date
}[] {
    return servers.map(server => {
        const now = new Date()
        const offset = offsets[server]
        now.setUTCHours(now.getUTCHours() + offset)

        const nextDailyReset = new Date(now.getTime())
        nextDailyReset.setUTCHours(4, 0, 0, 0)
        while (nextDailyReset.getTime() < now.getTime())
            nextDailyReset.setUTCDate(nextDailyReset.getUTCDate() + 1)

        const nextWeeklyReset = new Date(nextDailyReset.getTime())
        while (nextWeeklyReset.getDay() !== 1)
            nextWeeklyReset.setUTCDate(nextWeeklyReset.getUTCDate() + 1)

        return {
            server,
            offset: offset < 0 ? offset.toString() : `+${offset}`,
            time: now,
            nextDailyReset,
            nextWeeklyReset
        }
    })
}

export function timeLeft(diff: number): string {
    const result = [], originalTime = diff / 1000

    diff /= 1000 // convert to s
    if (diff >= 24*60*60) {
        result.push(Math.floor(diff / 24 / 60 / 60) + "d")
        diff -= Math.floor(diff / 24 / 60 / 60) * 24 * 60 * 60
    }

    if (diff >= 60*60) {
        result.push(Math.floor(diff / 60 / 60) + "h")
        diff -= Math.floor(diff / 60 / 60) * 60 * 60
    }

    if (diff >= 60 && originalTime < 24*60*60) {
        result.push(Math.floor(diff / 60) + "m")
        diff -= Math.floor(diff / 60) * 60
    }

    if (diff > 0  && originalTime < 60*60) {
        result.push(Math.floor(diff) + "s")
    }

    return result.join(", ")
}
