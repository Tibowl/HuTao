import { ColorResolvable, Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed, Snowflake } from "discord.js"
import log4js from "log4js"
import config from "./../data/config.json"
import client from "./../main"
import { CommandSource, Cover, Event, EventType, Guide, GuidePage, NameTable, Padding, SendMessage, Server, StoredNews } from "./Types"

const Logger = log4js.getLogger("Utils")

/**
 * Send a message to a list of channels
 * @param channels List of channel ids
 * @param content Content to send
 * @param embed Possible embed/attachment to send
 * @returns All the messages send
 */
export async function sendToChannels(channels: Snowflake[] | undefined, content?: string, embed?: MessageEmbed): Promise<PromiseSettledResult<Message | Message[]>[]> {
    const messages = []
    if (!channels) return Promise.all([])

    for (const channel of channels) {
        try {
            const chanObj = await client.channels.fetch(channel)
            if (!(chanObj && chanObj.isText()))
                continue
            if (embed && content && content.length > 0)
                messages.push(chanObj.send({ content, embeds: [embed] }))
            else if (embed)
                messages.push(chanObj.send({ embeds: [embed] }))
            else if (content)
                messages.push(chanObj.send(content))
        } catch (error) {
            Logger.error(`Failed to fetch ${channel}`)
        }
    }

    return Promise.allSettled(messages)
}

/**
 * Send something to the error log channels
 * @param content Content to send
 * @param embed Possible embed/attachment to send
 * @returns List of messages
 */
export async function sendError(content: string, embed?: MessageEmbed): Promise<Message[]> {
    Logger.error(content)
    return (await sendToChannels(config.errorLog as Snowflake[], content, embed)).filter((x): x is PromiseFulfilledResult<Message | Message[]> => x.status == "fulfilled").map(x => x.value).flat()
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
export function createTable(names: NameTable | undefined, rows: (string | number)[][], pads: Padding[] = [PAD_END]): string {
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
    Asia:    +8,
    Europe:  +1,
    America: -5,
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

export function timeLeft(diff: number, full = false, short = true): string {
    const ago = diff < 0
    if (ago) diff = -diff

    const result = [], originalTime = diff / 1000

    diff /= 1000 // convert to s
    if (diff >= 24*60*60) {
        const days = Math.floor(diff / 24 / 60 / 60)
        result.push(days + (short ? "d" : (days == 1 ? " day" : " days")))
        diff -= days * 24 * 60 * 60
    }

    if (diff >= 60*60) {
        const hours = Math.floor(diff / 60 / 60)
        result.push(hours + (short ? "h" : (hours == 1 ? " hour" : " hours")))
        diff -= hours * 60 * 60
    }

    if (diff >= 60 && (originalTime < 24*60*60 || full)) {
        const minutes = Math.floor(diff / 60)
        result.push(minutes + (short ? "m" : (minutes == 1 ? " minute" : " minutes")))
        diff -= minutes * 60
    }

    if (diff > 0  && (originalTime < 60*60 || full)) {
        const seconds = Math.floor(diff)
        result.push(seconds + (short ? "s" : (seconds == 1 ? " second" : " seconds")))
    }

    return result.join(", ") + (ago ? " ago" : "")
}

export function getDate(timestamp: string, timezone = "+08:00"): Date {
    timestamp = timestamp.replace(" ", "T")
    if (!timestamp.includes("T")) timestamp += "T23:59:59"
    return new Date(`${timestamp}${timezone}`)
}

export function isServerTimeStart(event: Event) {
    return event.start_server ?? (event.type == EventType.Banner || event.type == EventType.InGame || event.type == EventType.Unlock)
}
export function getStartTime(event: Event, serverTimezone: string) {
    return event.start != undefined && getDate(event.start, event.timezone ?? isServerTimeStart(event) ? serverTimezone : undefined)
}

export function isServerTimeEnd(event: Event) {
    return event.end_server ?? (event.type == EventType.Banner || event.type == EventType.InGame || event.type == EventType.Web)
}
export function getEndTime(event: Event, serverTimezone: string) {
    return event.end != undefined && getDate(event.end, event.timezone ?? isServerTimeEnd(event) ? serverTimezone : undefined)
}

// Format news
export function getNewsEmbed(post: StoredNews, relativePage = -1, currentPage?: number, maxPages?: number): MessageEmbed | undefined {
    const embed = new MessageEmbed()
        .setTitle(post.subject)
        .setAuthor(post.nickname)
        .setTimestamp(post.created_at * 1000)
        .setURL(post.lang == "bbs-zh-cn" ? `https://bbs.mihoyo.com/ys/article/${post.post_id}` : `https://www.hoyolab.com/article/${post.post_id}`)
        .setColor(([Colors.AQUA, Colors.GREEN, "#EA6907"][post.type - 1] ?? "#C1C1C1") as ColorResolvable)

    const parsed = parseNewsContent(post.content)

    if (relativePage == -1) {
        embed.setDescription(truncate(parsed.find(k => k.text)?.text ?? "Unknown text", 1500))

        if (post.image_url) {
            const imgData: Cover[] = JSON.parse(post.image_url)
            if (imgData?.[0]?.url)
                embed.setImage(imgData[0].url)
        }
    } else if (relativePage >= 0 && relativePage < parsed.length) {
        const cont = parsed[relativePage]
        if (cont.text)
            embed.setDescription(truncate(cont.text, 1500))
        else if (cont.img)
            embed.setImage(cont.img).setDescription(`[Open image in browser](${cont.img})`)
        embed.setFooter(`Page ${currentPage} / ${maxPages}`)
    } else
        return undefined
    return embed
}

interface Content {
    text?: string
    img?: string
}

export function parseNewsContent(content: string, maxLength = 1000): Content[] {
    const target: Content[] = []
    let currentLine = ""

    const matches = content.match(/<(p|div|h\d).*?>(.*?)<\/(p|div|h\d)>/g)
    if (!matches) return target

    for (const paragraph of matches) {
        let middle = paragraph.match(/<(p|div|h\d).*?>(.*?)<\/(p|div|h\d)>/)?.[2]
        if (!middle) continue
        middle = middle
            .replace(/<\/?br.*?>/g, "\n")
            .replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
            .replace(/<\/?span.*?>/g, "")
            .replace(/<\/?strong.*?>/g, "**")
            // .replace(/<\/?b.*?>/g, "**")
            // .replace(/<\/?i.*?>/g, "*")
            // .replace(/<\/?em.*?>/g, "*")
            .replace(/<a.*?href="(.*?)".*?>(.*?)<\/a>/g, (_, link, title) => `[${title}](${link})`)
            .replace(/<iframe.*?src="(.*?)".*?><\/iframe>/g, (_, link) => `[Link](${link})`)

        const imgFinder = middle.match(/<img.*?src="(.*?)".*?>/)

        if (imgFinder && currentLine.trim().length > 0) {
            target.push({ text: clean(currentLine) })
            currentLine = ""
        } else if (currentLine.length >= maxLength) {
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

function relativeTimestampFromString(timestamp: string, timezone = "+08:00"): string {
    return displayTimestamp(getDate(timestamp, timezone), "R")
}

export function displayTimestamp(time: Date, display = "R"): string {
    return `<t:${Math.floor(time.getTime() / 1000)}:${display}>`
}

export function getEventEmbed(event: Event): MessageEmbed {
    const embed = new MessageEmbed()

    embed.setTitle(event.name)
    if (event.img) embed.setImage(event.img)
    if (event.link) embed.setURL(event.link)
    embed.addField(event.type == EventType.Unlock ? "Unlock Time" : "Start Time", event.start ? `${event.prediction ? "(prediction) " : ""}${event.start}${event.timezone?` (GMT${event.timezone})`:""}\n${startTimes(event)}` : "Unknown", true)
    if (event.end) embed.addField("End Time", `${event.end}${event.timezone?` (GMT${event.timezone})`:""}\n${endTimes(event)}`, true)
    if (event.type && event.type !== EventType.Unlock) embed.addField("Type", event.type, true)

    return embed
}
function startTimes(e: Event) {
    if (!e.start) return ""

    if (!isServerTimeStart(e))
        return `Global: ${relativeTimestampFromString(e.start, e.timezone)}`

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return getServerTimeInfo().map(st => `${st.server}: ${relativeTimestampFromString(e.start!, `${st.offset.split("").join("0")}:00`)}`).join("\n")
}
function endTimes(e: Event) {
    if (!e.end) return ""

    if (!isServerTimeEnd(e))
        return relativeTimestampFromString(e.end, e.timezone)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return getServerTimeInfo().map(st => `${st.server}: ${relativeTimestampFromString(e.end!, `${st.offset.split("").join("0")}:00`)}`).join("\n")
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
function paginatorLoop(id: string, reply: Message, pageInfo: Bookmarkable[], currentPage = 0): void {
    reply.awaitMessageComponent( {
        filter: (interaction) => (interaction.user.id == id || config.admins.includes(interaction.user.id)),
        time: 60000
    }).then(async (r) => {
        const name = r.customId

        if (name == "delete") {
            client.recentMessages = client.recentMessages.filter(k => k != reply)
            await reply.delete()
            return
        }

        if (name == "prev") {
            currentPage = await updatePage(r, reply, currentPage, currentPage - 1, pageInfo)
        } else if (name == "next") {
            currentPage = await updatePage(r, reply, currentPage, currentPage + 1, pageInfo)
        } else if (name) {
            let newPage = 0
            for (const pi of pageInfo) {
                if (pi.bookmarkName == name) {
                    currentPage = await updatePage(r, reply, currentPage, newPage, pageInfo)
                    break
                }
                newPage += pi.maxPages
            }
        }

        paginatorLoop(id, reply, pageInfo, currentPage)
    }).catch(async (error) => {
        if (error.name == "Error [INTERACTION_COLLECTOR_ERROR]") {
            client.recentMessages = client.recentMessages.filter(k => k != reply)
            const user = client.user
            if (user == undefined || !reply.editable) return
            await reply.edit({ components: [] })
        } else {
            Logger.error("Error during pagination: ", error)
            paginatorLoop(id, reply, pageInfo, currentPage)
        }
    }).catch(error => {
        Logger.error("Error during pagination error handling: ", error)
    })
}

function getPageEmbed(newPage: number, maxPages: number, pageInfo: Bookmarkable[]) {
    let bookmark = pageInfo[0], currentPage = 0
    for (const bm of pageInfo) {
        bookmark = bm
        if (currentPage + bm.maxPages > newPage) break
        currentPage += bm.maxPages
    }
    return bookmark.pages(newPage - currentPage, newPage + 1, maxPages)
}

async function updatePage(interaction: MessageComponentInteraction, reply: Message, oldPage: number, newPage: number, pageInfo: Bookmarkable[]): Promise<number> {
    const maxPages = pageInfo.reduce((p, c) => p + c.maxPages, 0)

    const embed = getPageEmbed(newPage, maxPages, pageInfo)
    if (!embed) return oldPage

    const content = { embeds: [embed], components: getButtons(pageInfo, newPage, maxPages) }
    try {
        await interaction.update(content)
    } catch (error) {
        await reply.edit(content)
    }
    return newPage
}

type PageFunction = ((relativePage: number, currentPage: number, maxPages: number) => MessageEmbed | undefined)
export type Bookmarkable = {
    bookmarkName: string
    bookmarkEmoji: string
    pages: PageFunction
    maxPages: number
    invisible?: boolean
}

export async function paginator(source: CommandSource, pageInfo: Bookmarkable[], startPage: number | string = 0): Promise<void> {
    const maxPages = pageInfo.reduce((p, c) => p + c.maxPages, 0)

    let currentPage = 0
    if (typeof startPage == "string") {
        let newPage = 0
        for (const pi of pageInfo) {
            if (pi.bookmarkName == startPage) {
                currentPage = newPage
                break
            }
            newPage += pi.maxPages
        }
    } else {
        currentPage = startPage
    }

    const embed = getPageEmbed(currentPage, maxPages, pageInfo)

    if (!embed) return

    const reply = await sendMessage(source, embed, getButtons(pageInfo, currentPage, maxPages))
    if (!isMessage(reply)) {
        Logger.info("Invalid reply in paginator")
        return
    }

    paginatorLoop(getUserID(source), reply, pageInfo, currentPage)

    client.recentMessages.push(reply)
}

export async function simplePaginator(message: CommandSource, pager: PageFunction, maxPages: number, startPage = 0): Promise<void> {
    return paginator(message, [{
        bookmarkEmoji: "⏮️",
        bookmarkName: "Default",
        pages: pager,
        maxPages,
        invisible: true
    }], startPage)
}

function getButtons(pageInfo: Bookmarkable[], currentPage: number, maxPages: number) {
    let i = 0
    let currentRow = new MessageActionRow()
    const rows = [currentRow]

    let newPage = 0
    for (const pi of pageInfo) {
        if (!pi.invisible) {
            if (i++ % 5 == 0 && i !== 1) {
                currentRow = new MessageActionRow()
                rows.push(currentRow)
            }

            currentRow.addComponents(
                new MessageButton()
                    .setCustomId(pi.bookmarkName)
                    .setLabel(pi.bookmarkName)
                    .setStyle("SECONDARY")
                    .setDisabled(newPage == currentPage)
                    .setEmoji(pi.bookmarkEmoji),
            )
        }

        newPage += pi.maxPages
    }

    if (i !== 0 && i % 5 !== 1 && i % 5 !== 2) {
        currentRow = new MessageActionRow()
        rows.push(currentRow)
    }

    currentRow.addComponents(
        new MessageButton()
            .setCustomId("prev")
            .setLabel("Previous")
            .setStyle("PRIMARY")
            .setDisabled(currentPage == 0)
            .setEmoji(emojis[0]),

        new MessageButton()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle("PRIMARY")
            .setDisabled(currentPage >= maxPages - 1)
            .setEmoji(emojis[1]),

        new MessageButton()
            .setCustomId("delete")
            .setLabel("Delete")
            .setStyle("DANGER")
            .setEmoji("✖️"),
    )
    return rows
}

export function getDeleteButton(): MessageActionRow {
    const row = new MessageActionRow()

    row.addComponents(
        new MessageButton()
            .setCustomId("delete")
            .setLabel("Delete")
            .setStyle("DANGER")
            .setEmoji("✖️"),
    )
    return row
}

export async function sendMessage(source: CommandSource, response: string | MessageEmbed, components?: (MessageActionRow)[], ephemeral?: boolean): Promise<SendMessage | undefined> {
    let embeds: (MessageEmbed)[] | undefined
    let content: string | undefined

    if (typeof response == "string")
        content = response
    else
        embeds = [response]

    if (!components && !(ephemeral && !(source instanceof Message)) && source.channel?.type != "DM")
        components = [getDeleteButton()]

    try {
        if (source instanceof Message)
            return await source.channel.send({ content, embeds, components })
        else
            return await source.reply({ content, embeds, components, fetchReply: true, ephemeral })
    } catch (error) {
        Logger.error("sendMessage", error)
    }
}

export function isMessage(msg: SendMessage | CommandSource | undefined): msg is Message {
    return msg instanceof Message
}

export function getUserID(source: CommandSource): string {
    if (isMessage(source))
        return source.author.id
    else
        return source.user.id
}


export function parseDuration(time: string): number {
    let duration = 0
    const times = [...time.matchAll(/((\d+) ?(months?|mo|weeks?|w|days?|d|hours?|h|minutes?|min|m|seconds?|sec|s|resins?|r))/gi)]

    for (const time of times) {
        const name = time[3].toLowerCase(), amount = parseInt(time[2])
        if      (name.startsWith("mo")) duration += amount * 30 * 24 * 60 * 60 * 1000
        else if (name.startsWith("w"))  duration += amount *  7 * 24 * 60 * 60 * 1000
        else if (name.startsWith("d"))  duration += amount * 24 * 60 * 60 * 1000
        else if (name.startsWith("h"))  duration += amount * 60 * 60 * 1000
        else if (name.startsWith("m"))  duration += amount * 60 * 1000
        else if (name.startsWith("s"))  duration += amount * 1000
        else if (name.startsWith("r"))  duration += amount * client.data.minutes_per_resin * 60 * 1000
    }

    return duration
}


export function getLinkToGuide(guide: Guide, page: GuidePage): string {
    return `[${page.name}](${client.data.baseURL}guides/${urlify(guide.name, false)}/${urlify(page.name, true)})`
}

export function urlify(input: string, shouldRemoveBrackets: boolean): string {
    if (shouldRemoveBrackets)
        input = removeBrackets(input)
    return input.toLowerCase().replace(/[():"']/g, "").trim().replace(/ +/g, "-")
}

export function removeBrackets(input: string) {
    return input.replace(/\(.*\)/g, "").replace(/ +:/, ":")
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

export function fuzzySearchScore(a: string, b: string): number {
    if (a.length == 0) return 0
    if (b.length == 0) return 0

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

    return b.length - row[a.length]
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

    const dists = target.map(e => fuzzySearchScore(searchClean(e), cleaned) + fuzzySearchScore(caps(e), caps(search)))
    const max = Math.max(...dists)

    let candidates = target.filter((_, index) => dists[index] == max)

    let filteredCandidates = candidates.filter(t => searchClean(t).startsWith(cleaned.substring(0, 3)) || searchClean(t).endsWith(cleaned.substring(cleaned.length - 3)))
    if (filteredCandidates.length != 0) candidates = filteredCandidates

    filteredCandidates = candidates.filter(t => caps(t).includes(search[0].toUpperCase()))
    if (filteredCandidates.length != 0) candidates = filteredCandidates

    filteredCandidates = candidates.filter(t => caps(t) == caps(search))
    if (filteredCandidates.length != 0) candidates = filteredCandidates

    const lengths = candidates.map(t => t.length)
    const min = Math.min(...lengths)
    return candidates[lengths.indexOf(min)]
}

export function findFuzzyBestCandidates(target: string[], search: string, amount: number): string[] {
    const cleaned = searchClean(search)
    const found = target.find(t => searchClean(t) == search)
    if (found)
        return [found]

    const dists = target.map(e => fuzzySearchScore(searchClean(e), cleaned) + fuzzySearchScore(caps(e), caps(search)) - e.length / 100 + 1)
    const max = Math.max(...dists)

    return target
        .map((t, i) => {
            return {
                t,
                d: dists[i]
            }
        })
        .sort((a, b) => b.d - a.d)
        .filter((e, i) => i < amount && e.d > max * 0.65)
        .map(({ t, d }) => {
            if (searchClean(t).startsWith(cleaned.substring(0, 3)) || searchClean(t).endsWith(cleaned.substring(cleaned.length - 3)))
                d += 1
            if (caps(t).includes(search[0]?.toUpperCase()))
                d += 1.5
            if (caps(t) == caps(search))
                d += 0.5

            return { t, d }
        })
        .sort((a, b) => b.d - a.d)
        .map(e => e.t)
}

export const Colors: Record<string, ColorResolvable> = {
    GREEN: "#00EA69",
    DARK_GREEN: "#2EF41F",

    ORANGE: "#F49C1F",

    RED: "#F7322E",
    DARK_RED: "#F4231F",

    AQUA: "#07EADB",
    PURPLE: "#6B68B1",

    "Anemo": "#32D39F",
    "Cryo": "#79E8EB",
    "Electro": "#CA7FFF",
    "Geo": "#FEE263",
    "Hydro": "#06E5FE",
    "Pyro": "#FFAA6E",
    "Dendro": "#B2EB28",

    "None": "#545353",
}
