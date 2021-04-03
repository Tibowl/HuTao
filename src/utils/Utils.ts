import {  Message, TextChannel, StringResolvable, MessageEmbed, MessageAttachment } from "discord.js"

import client from "./../main"
import config from "./../data/config.json"
import { Cover, NameTable, Padding, Server, StoredNews } from "./Types"

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

// Truncating of strings
function limitIndex(words: string[], maxLength = 50): number {
    let end = 0; let currentLength = 0
    for (; end < words.length; end++) {
        if (currentLength + words[end].length >= maxLength) {
            break
        }
        currentLength += words[end].length + 1
    }
    return end
}

export function truncate(text: string, maxLength = 50): string {
    const words = text.split(" ")
    const end = limitIndex(words, maxLength)
    return `${words.slice(0, end).join(" ")}${end < words.length ? "..." : ""}`
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


// Format news
export function getNewsEmbed(post: StoredNews, page = -1): MessageEmbed | undefined {
    const embed = new MessageEmbed()
        .setTitle(post.subject)
        .setAuthor(post.nickname)
        .setTimestamp(post.created_at * 1000)
        .setURL(`https://www.hoyolab.com/genshin/article/${post.post_id}`)
        .setColor(["#07EADB", "#00EA69", "#EA6907"][post.type - 1] ?? "#C1C1C1")

    const parsed = parseNewsContent(post.content)

    if (page == -1) {
        embed.setDescription(truncate(parsed.find(k => k.text)?.text ?? "Unknown text", 1500))

        if (post.image_url) {
            const imgData: Cover[] = JSON.parse(post.image_url)
            if (imgData?.[0]?.url)
                embed.setImage(imgData[0].url)
        }
    } else if (page >= 0 && page < parsed.length) {
        const cont = parsed[page]
        if (cont.text)
            embed.setDescription(truncate(cont.text, 1500))
        else if (cont.img)
            embed.setImage(cont.img).setDescription(`[Open image in browser](${cont.img})`)
        embed.setFooter(`Page ${page + 1}/${parsed.length}`)
    } else
        return undefined
    return embed
}

interface Content {
    text?: string
    img?: string
}

export function parseNewsContent(content: string): Content[] {
    const target: Content[] = []
    let currentLine = ""

    const matches = content.match(/<p.*?>(.*?)<\/p>/g)
    if (!matches) return target

    for (const paragraph of matches) {
        let middle = paragraph.match(/<p.*?>(.*?)<\/p>/)?.[1]
        if (!middle) continue
        middle = middle
            .replace(/<\/?br.*?>/g, "\n")
            .replace(/&gt;/g, ">")
            .replace(/&lt;/g, "<")
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
            .replace(/<\/?span.*?>/g, "")
            .replace(/<\/?strong.*?>/g, "**")
            // .replace(/<\/?b.*?>/g, "**")
            // .replace(/<\/?i.*?>/g, "*")
            // .replace(/<\/?em.*?>/g, "*")
            .replace(/<a.*?href="(.*?)".*?>(.*?)<\/a>/g, (_, link, title) => `[${title}](${link})`)

        const imgFinder = middle.match(/<img.*?src="(.*?)".*?>/)

        if (imgFinder && currentLine.trim().length > 0) {
            target.push({ text: clean(currentLine) })
            currentLine = ""
        } else if (currentLine.length >= 1000) {
            let splitted: string[] = [];
            ({ splitted, currentLine } = split(splitted, currentLine, /\n\s*\n/g))

            if (splitted.length > 0)
                target.push({ text: clean(splitted.join("\n\n")) })
            else {
                ({ splitted, currentLine } = split(splitted, currentLine, "\n"))

                if (splitted.length > 0)
                    target.push({ text: clean(splitted.join("\n")) })
            }
        }

        if (imgFinder) {
            target.push({ img: imgFinder[1] })
        } else {
            currentLine += middle
        }
        currentLine += "\n"
    }

    if (currentLine.trim().length > 0)
        target.push({ text: clean(currentLine) })

    return target
}

function split(splitted: string[], currentLine: string, toSplit: string | RegExp) {
    splitted = currentLine.split(toSplit)
    currentLine = splitted.pop() ?? ""

    while (currentLine.trim().length == 0 || splitted.join("\n\n").length >= 1000)
        currentLine = (splitted.pop() ?? "") + currentLine

    return { splitted, currentLine }
}

function clean(line: string) {
    return line.trim().replace(/\n\n\n+/g, "\n\n")
}

// Pagination functions
const emojis = ["⬅️", "➡️"]
async function paginatorLoop(message: Message, reply: Message, pages: ((p: number) => MessageEmbed | undefined), skipPages: Record<string, number> = {}, currentPage = 0): Promise<void> {
    reply.awaitReactions(
        (reaction, user) => [...emojis, ...Object.keys(skipPages).map(name => name.match(/<:(.*?):\d+>/)?.[1] ?? name)].includes(reaction.emoji.name) && (user.id == message.author.id || config.admins.includes(user.id)),
        { max: 1, time: 60000, errors: ["time"] }
    ).then((collected) => {
        const r = collected.first()
        const name = r?.emoji.name

        if (name == emojis[0]) {
            if (currentPage > 0) {
                const newEmbed = pages(currentPage - 1)
                if (newEmbed) {
                    currentPage--
                    reply.edit(newEmbed)
                }
            }
        } else if (name == emojis[1]) {
            const newEmbed = pages(currentPage + 1)
            if (newEmbed) {
                currentPage++
                reply.edit(newEmbed)
            }
        } else if (name) {
            const newPage = Object.entries(skipPages).find(([k]) => k == name || k.includes(`<:${name}:`))?.[1]
            if (newPage !== undefined) {
                const newEmbed = pages(newPage)
                if (newEmbed) {
                    currentPage = newPage
                    reply.edit(newEmbed)
                }
            }
        }

        try {
            r?.users.remove(message.author)
        } catch (error) {
            // No permission
        }

        paginatorLoop(message, reply, pages, skipPages, currentPage)
    }).catch(async () => {
        const user = client.user
        if (user == undefined) return
        try {
            await reply.reactions.removeAll()
        } catch (error) {
            await Promise.all(reply.reactions?.cache.map((reaction) => {
                if (reaction.me)
                    return reaction.users.remove(user)
            }).filter(r => r))
        }
    })

}
export async function paginator(message: Message, reply: Message, pages: ((p: number) => MessageEmbed | undefined), skipPages: Record<string, number> = {}, currentPage = 0): Promise<void> {
    paginatorLoop(message, reply, pages, skipPages, currentPage)

    for (const emoji of emojis)
        await reply.react(emoji)
    for (const emoji of Object.keys(skipPages))
        await reply.react(emoji)
}

export function addArg(args: string[], queries: string | string[], exec: () => void): void {
    if (typeof queries == "string")
        queries = [queries]

    const lowerArgs = args.map(a => a.toLowerCase())
    for (let query of queries) {
        query = query.toLowerCase()

        if (lowerArgs.includes(query)) {
            exec()
            args.splice(lowerArgs.indexOf(query), 1)
            lowerArgs.splice(lowerArgs.indexOf(query), 1)
        }
    }
}

export function levenshtein(a: string, b: string): number {
    if (a.length == 0) return b.length
    if (b.length == 0) return a.length

    // swap to save some memory O(min(a,b)) instead of O(a)
    if (a.length > b.length) [a, b] = [b, a]

    const row = []
    // init the row
    for (let i = 0; i <= a.length; i++)
        row[i] = i


    // fill in the rest
    for (let i = 1; i <= b.length; i++) {
        let prev = i
        for (let j = 1; j <= a.length; j++) {
            const val = (b.charAt(i - 1) == a.charAt(j - 1)) ? row[j - 1] : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1)
            row[j - 1] = prev
            prev = val
        }
        row[a.length] = prev
    }

    return row[a.length]
}

function searchClean(str: string): string {
    return str.toLowerCase().replace(/'/g, "")
}

function caps(str: string): string {
    return str.split("").filter(k => k != k.toLowerCase()).join("")
}

export function findFuzzy(target: string[], search: string): string | undefined {
    const cleaned = searchClean(search)
    const found = target.find(t => searchClean(t) == search)
    if (found)
        return found

    let candidates = target.filter(t => t[0].toLowerCase() == search[0].toLowerCase())
    if (candidates.length == 0) candidates = target
    // console.log(search, candidates)

    let filteredCandidates = candidates.filter(t => searchClean(t).startsWith(cleaned.substring(0, 3)) || searchClean(t).endsWith(cleaned.substring(cleaned.length - 3)))
    if (filteredCandidates.length != 0) candidates = filteredCandidates
    // console.log(search, filteredCandidates)

    filteredCandidates = candidates.filter(t => caps(t) == caps(search))
    if (filteredCandidates.length != 0) candidates = filteredCandidates
    // console.log(search, filteredCandidates)

    const dists = candidates.map(e => levenshtein(searchClean(e), cleaned))
    const min = Math.min(...dists)
    return candidates[dists.indexOf(min)]
}
