import { CommandInteraction, Message, MessageEmbed } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage, StoredNews } from "../../utils/Types"
import { Colors, findFuzzy, parseNewsContent, sendMessage, simplePaginator } from "../../utils/Utils"


const Logger = log4js.getLogger("main")

type Wish = {
    title: string
    img: string
    main: string[]
    other: string[]
    duration: string
    roughDate: number
}
// Hardcoded ones are due to missing in news database
let eventWishes: Wish[] = [
    // Pre-hoyolab era
    {
        title: "Event Wish \"Ballad in Goblets\" - Boosted Drop Rate for \"Windborne Bard\" Venti (Anemo)!",
        roughDate: 1601244000,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/e/e9/Wish_Ballad_in_Goblets_2020-09-28.jpg/revision/latest?cb=20201006234432",
        duration: "2020/09/28 12:00:00 – 2020/10/18 12:00:00",
        main: ["Venti"],
        other: ["Barbara", "Fischl", "Xiangling"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rate for Aquila Favonia (Sword) and Amos' Bow (Bow)!",
        roughDate: 1601244000,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/3/3d/Wish_Epitome_Invocation_2020-09-28.jpg/revision/latest?cb=20200929014948",
        duration: "2020/09/28 12:00:00 – 2020/10/18 12:00:00",
        main: ["Aquila Favonia", "Amos' Bow"],
        other: ["The Flute", "The Bell", "The Widsith", "The Stringless", "Favonius Lance" ]
    },
    {
        title: "Event Wish \"Sparkling Steps\" - Boosted Drop Rate for \"Fleeing Sunlight\" Klee (Pyro)!",
        roughDate: 1603209600,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/0/0c/Wish_Sparkling_Steps_2020-10-20.jpg/revision/latest?cb=20201018122142",
        duration: "2020/10/20 18:00:00 – 2020/11/10 14:59:59",
        main: ["Klee"],
        other: ["Xingqiu", "Noelle", "Sucrose"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rate for Lost Prayer to the Sacred Winds (Catalyst) and Wolf's Gravestone (Claymore)!",
        roughDate: 1603209600,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/b/be/Wish_Epitome_Invocation_2020-10-20.jpg/revision/latest?cb=20201018052455",
        duration: "2020/10/20 18:00:00 – 2020/11/10 14:59:59",
        main: ["Lost Prayer to the Sacred Winds", "Wolf's Gravestone"],
        other: ["Sacrificial Sword", "Sacrificial Bow", "Sacrificial Greatsword", "Sacrificial Fragments", "Dragon's Bane"]
    },
    {
        title: "Event Wish \"Farewell of Snezhnaya\" - Boosted Drop Rate for \"Childe\" Tartaglia (Hydro)!",
        roughDate: 1605085200,
        img: "https://upload-os-bbs.hoyolab.com/upload/2020/11/09/1015613/e951a355455532b442519b268085772d_3755913022779822697.jpg",
        duration: "After the Version 1.1 update – 2020/12/01 15:59:59",
        main: ["Tartaglia"],
        other: ["Diona", "Beidou", "Ningguang"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rates for Skyward Harp (Bow) and Memory of Dust (Catalyst)!",
        roughDate: 1605085200,
        img: "https://upload-os-bbs.hoyolab.com/upload/2020/11/09/1015613/a325dc0f41c012bfea82f9f00f92bf01_7894912188130132646.jpg",
        duration: "After the Version 1.1 update – 2020/12/01 15:59:59",
        main: ["Memory of Dust", "Skyward Harp"],
        other: ["The Flute", "Rainslasher", "Eye of Perception", "Rust", "Favonius Lance"]
    },
    {
        title: "Event Wish \"Gentry of Hermitage\" - Boosted Drop Rate for Zhongli!",
        roughDate: 1606842000,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/4/41/Wish_Gentry_of_Hermitage_2020-12-01.png/revision/latest?cb=20201129051143",
        duration: "2020-12-01 18:00:00 – 2020-12-22 14:59:59",
        main: ["Zhongli"],
        other: ["Xinyan", "Razor", "Chongyun"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rates for Vortex Vanquisher (Polearm) and The Unforged (Claymore)!",
        roughDate: 1606842000,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/a/a2/Wish_Epitome_Invocation_2020-12-01.jpg/revision/latest?cb=20201129051133",
        duration: "2020-12-01 18:00:00 – 2020-12-22 14:59:59",
        main: ["Vortex Vanquisher", "The Unforged"],
        other: ["Lion's Roar", "The Bell", "Favonius Codex", "Favonius Warbow", "Dragon's Bane"]
    },
    {
        title: "Event Wish \"Secretum Secretorum\" - Boosted Drop Rate for Albedo!",
        roughDate: 1608714000,
        img: "https://uploadstatic-sea.mihoyo.com/contentweb/20201218/2020121817530732640.jpg",
        duration: "After Version 1.2 update – 2021/01/12 15:59:59",
        main: ["Albedo"],
        other: ["Fischl", "Sucrose", "Bennett"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rates for Summit Shaper (Sword) and Skyward Atlas (Catalyst)!",
        roughDate: 1608714000,
        img: "https://uploadstatic-sea.mihoyo.com/contentweb/20201218/2020121818032328243.jpg",
        duration: "After Version 1.2 update – 2021/01/12 15:59:59",
        main: ["Summit Shaper", "Skyward Atlas"],
        other: ["Favonius Sword", "Favonius Greatsword", "Favonius Lance", "Sacrificial Fragments", "The Stringless"]
    },
    {
        title: "Event Wish \"Adrift in the Harbor\" - Boosted Drop Rate for Ganyu!",
        roughDate: 1610470800,
        img: "https://upload-os-bbs.mihoyo.com/upload/2021/01/10/1015537/a4a8e792d76b342c43a3e7f4eb284890_7429454184524275542.jpg",
        duration: "2021/01/12 18:00:00 – 2021/02/02 14:59:59",
        main: ["Ganyu"],
        other: ["Xiangling", "Xingqiu", "Noelle"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rates for Amos' Bow (Bow) and Skyward Pride (Claymore)!",
        roughDate: 1610470800,
        img: "https://upload-os-bbs.mihoyo.com/upload/2021/01/10/1015537/d39eefd21d5b792dad92111ffce8100e_223120952396802540.jpg",
        duration: "2021/01/12 18:00:00 – 2021/02/02 14:59:59",
        main: ["Amos' Bow", "Skyward Pride"],
        other: ["Sacrificial Sword", "The Bell", "Dragon's Bane", "Eye of Perception", "Favonius Warbow"]
    },
    {
        title: "Event Wish \"Invitation to Mundane Life\" - Boosted Drop Rate for Xiao!",
        roughDate: 1612342140,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/3/36/Wish_Invitation_to_Mundane_Life_2021-02-03.jpg/revision/latest?cb=20210201040314",
        duration: "After Version 1.3 update – 2021/02/17 15:59:59",
        main: ["Xiao"],
        other: ["Diona", "Beidou", "Xinyan"]
    },
    {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rates for Primordial Jade Cutter (Sword) and Primordial Jade Winged-Spear (Polearm)!",
        roughDate: 1612342140,
        img: "https://static.wikia.nocookie.net/gensin-impact/images/6/62/Wish_Epitome_Invocation_2021-02-03.jpg/revision/latest?cb=20210201040313",
        duration: "After Version 1.3 update – 2021/02/23 15:59:59",
        main: ["Primordial Jade Cutter", "Primordial Jade Winged-Spear"],
        other: ["Rust", "Eye of Perception", "Favonius Lance", "Sacrificial Greatsword", "The Flute"]
    },

    // Official post is missing "Hu Tao"
    {
        title: "Event Wish \"Moment of Bloom\" - Boosted Drop Rate for \"Fragrance in Thaw\" Hu Tao (Pyro)!",
        roughDate: 1614484802,
        img: "https://upload-os-bbs.hoyolab.com/upload/2021/02/26/1015537/69f3f8de572f61e72199df941a0576d1_4005495037262847383.jpg",
        duration: "2021/03/02 18:00:00 – 2021/03/16 14:59:59 ",
        main: ["Hu Tao"],
        other: ["Xingqiu", "Xiangling", "Chongyun"]
    },

    // Official post has date in image
    {
        title: "Event Wish \"Farewell of Snezhnaya\" - Boosted Drop Rate for \"Childe\" Tartaglia (Hydro)!",
        roughDate: 1617422401,
        img: "https://upload-os-bbs.hoyolab.com/upload/2021/04/02/1015537/b23dda81b6b9b0bb8a46b9adcd0e2a70_1479948151736832476.jpg",
        duration: "2021/04/06 18:00:00 – 2021/04/27 14:59:59",
        main: ["Tartaglia"],
        other: ["Rosaria", "Barbara", "Fischl"]
    }, {
        title: "Event Wish \"Epitome Invocation\" - Boosted Drop Rates for Skyward Harp (Bow) and Lost Prayer to the Sacred Winds (Catalyst)!",
        roughDate: 1617422402,
        img: "https://upload-os-bbs.hoyolab.com/upload/2021/04/02/1015537/2990bea9a81bbfa9aa348dbddaf0aad5_8867096048015043654.jpg",
        duration: "2021/04/06 18:00:00 – 2021/04/27 14:59:59",
        main: ["Skyward Harp", "Lost Prayer to the Sacred Winds"],
        other: ["Alley Hunter", "Favonius Sword", "Sacrificial Greatsword", "Favonius Codex", "Favonius Lance"]
    }
]
export default class BannersCommand extends Command {

    constructor(name: string) {
        super({
            name,
            category: "Misc",
            usage: `banners search <character or weapon name> | ${config.prefix}banners list [weapon|char] | ${config.prefix}banners browse [id / page]`,
            help: `Displays Event Wish information.
            
You can quickly go over past event wishes with \`${config.prefix}ew list [char | weapon | both (default)]\`
(Shorthands like \`${config.prefix}ew char\` or \`${config.prefix}ew weapon\` are also possible)

You can find a specific character's previous event wishes with \`${config.prefix}ew search <name>\` (\`s\`, \`find\`, \`f\` and \`has\` instead of \`search\` also work)
For example: \`${config.prefix}ew f Hu Tao\`

You can find more information about a specific banner or just browse through all with \`${config.prefix}ew view [id]\` (\`v\`, \`browse\` and \`b\` instead of \`view\` also work)
For example: \`${config.prefix}ew v 17\`

Note: this command supports fuzzy search.`,
            aliases: ["banner", "eventwish", "eventwishes", "ew"],
            options: [{
                name: "search",
                description: "Search for banners that contain a certain character/weapon",
                type: "SUB_COMMAND",
                options: [{
                    name: "query",
                    description: "Name of the character or weapon",
                    type: "STRING",
                    required: true
                }]
            }, {
                name: "list",
                description: "Search for banners that contain a certain character/weapon",
                type: "SUB_COMMAND",
                options: [{
                    name: "filter",
                    description: "Name of the character or weapon",
                    type: "STRING",
                    choices: [{
                        name: "Both",
                        value: "both"
                    }, {
                        name: "Weapons",
                        value: "weapons"
                    }, {
                        name: "Characters",
                        value: "char"
                    }]
                }]
            }, {
                name: "view",
                description: "Browse through the current and past banners or view a specific one",
                type: "SUB_COMMAND",
                options: [{
                    name: "start_page",
                    description: "Directly skip to this page",
                    type: "NUMBER"
                }]
            }]
        })

        client.newsManager.getEventWishes().forEach((news) => parseEventWishNews(news, false))
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        const { options } = source
        const command = options.getSubcommand()
        if (command == "search")
            return this.runSearch(source, options.getString("query", true))
        else if (command == "list")
            return this.runList(source, options.getString("filter") ?? "both")
        else if (command == "view")
            return this.runBrowse(source, options.getNumber("start_page"))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        const sub = args[0]?.toLowerCase() ?? "help"
        args.shift()
        const otherArgs = args.join(" ")

        // Search for a weapon/char
        if (["search", "s", "find", "f", "bychar", "byweapon", "by", "with", "includes", "has"].includes(sub)) {
            if (otherArgs.length == 0)
                return this.sendHelp(source)

            return this.runSearch(source, otherArgs)
        // List all char/weapon banners
        } else if (["list", "l", "summary", "char", "chars", "characters", "character", "weapon", "weapons"].includes(sub)) {
            let filter: "both" | "weapons" | "char" = "both"
            if (["char", "chars", "characters", "character"].includes(sub) || ["char", "chars", "characters", "character"].includes(otherArgs?.toLowerCase()))
                filter = "char"
            if (["weapon", "weapons"].includes(sub) || ["weapon", "weapons"].includes(otherArgs?.toLowerCase()))
                filter = "weapons"

            return this.runList(source, filter)
        // View a specific banner
        } else if (["browse", "b", "view", "v"].includes(sub)) {
            const parsed = otherArgs?.match(/\d+/)
            if (parsed)
                return this.runBrowse(source, parseInt(parsed[0]))
            return this.runBrowse(source)
        // Help menu
        } else {
            return this.sendHelp(source)
        }
    }

    async runSearch(source: CommandSource, query: string): Promise<SendMessage | undefined> {
        const wishes = eventWishes.map((w, index) => {
            return { ...w, index: index + 1 }
        })

        const namesToSearch = wishes.flatMap(w => [...w.other, ...w.main])
        const name = findFuzzy(namesToSearch, query)
        if (name == undefined) return sendMessage(source, "No banner data loaded/found")
        const toShow = wishes.filter(w => w.main.includes(name) || w.other.includes(name))

        const pages = this.getWishesPages(toShow)
        if (pages.length == 0) return sendMessage(source, "No banner data loaded/found")

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getWishes(pages, relativePage, currentPage, maxPages, name), pages.length)
        return undefined
    }

    async runList(source: CommandSource, filter: string): Promise<SendMessage | undefined> {
        const wishes = eventWishes.map((w, index) => {
            return { ...w, index: index + 1 }
        })

        const toShow = wishes.filter(w => filter == "both" || (filter == "weapons" && w.title.includes("Epitome Invocation")) || (filter == "char" && !w.title.includes("Epitome Invocation")))

        const pages = this.getWishesPages(toShow)
        if (pages.length == 0) return sendMessage(source, "No banner data loaded")

        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getWishes(pages, relativePage, currentPage, maxPages, filter), pages.length)
        return undefined
    }

    async runBrowse(source: CommandSource, startPage?: number | null): Promise<SendMessage | undefined> {
        const wishes = eventWishes.map((w, index) => {
            return { ...w, index: index + 1 }
        })

        const defaultPage = (startPage ?? (wishes.length - 1)) - 1
        await simplePaginator(source, (relativePage, currentPage, maxPages) => this.getWish(wishes, relativePage, currentPage, maxPages), wishes.length, defaultPage)
        return undefined
    }

    getWishesPages(toShow: (Wish & {index: number})[]): string[] {
        const wishes = toShow.map(wish => `\`#${wish.index}\` ${wish.main.map(v => `**${v}**`).join(" and ")}${wish.other.length < 4 ? ` with ${wish.other.join(", ")}`:""}`).reverse()

        const pages: string[] = []
        let paging = "", c = 0
        for (const wish of wishes) {
            if (paging.length + wish.length > 1800 || ++c > 15) {
                pages.push(paging.trim())
                paging = wish
                c = 1
            } else
                paging += "\n" + wish
        }
        if (paging.trim().length > 0) pages.push(paging)
        return pages
    }

    getWishes(pages: string[], relativePage: number, currentPage: number, maxPages: number, filter: string): MessageEmbed | undefined {
        if (relativePage >= pages.length)
            return undefined

        const embed = new MessageEmbed()
            .setTitle(`Event Wishes (${filter})`)
            .setDescription(pages[relativePage])
            .setFooter(`Page ${currentPage} / ${maxPages} - See '${config.prefix}banners view <id>' for more info about a specific one`)
            .setColor(Colors.GREEN)

        return embed
    }


    getWish(wishes: Wish[], relativePage: number, currentPage: number, maxPages: number): MessageEmbed | undefined {
        if (relativePage >= wishes.length)
            return undefined

        const wish = wishes[relativePage]

        const embed = new MessageEmbed()
            .setTitle(wish.title)
            .setImage(wish.img)
            .addField("Duration", wish.duration)
            .addField("Main", wish.main.join("\n"), true)
            .addField("Other", wish.other.join("\n"), true)
            .setFooter(`Page ${currentPage} / ${maxPages}`)
            .setColor(Colors.GREEN)

        return embed
    }
}

export function parseEventWishNews(news: StoredNews, recent = true): void {
    const { data } = client
    const wish: {
        title: string
        img?: string
        main?: string[]
        other?: string[]
        duration?: string
        roughDate: number
    } = {
        title: news.subject,
        roughDate: news.created_at
    }

    function split(str: string): string[] {
        str = str.replace(/·/g, " ")
        const names = data.getCharacters().map(x => x.name).concat(Object.keys(data.weapons)).sort((a, b) => a.length - b.length)
        const found: string[] = []

        outer: for (const m of str.matchAll(/([A-Z][^"]*?) \([A-Za-z]+?\)/g)) {
            for (const name of names)
                if (m[1].trim().endsWith(name)) {
                    found.push(name)
                    continue outer
                }
            Logger.error("Not found", m[1], "in", str)
            found.push(m[1])
        }

        return found
    }

    const parsed = parseNewsContent(news.content, 1e6)
    for (const page of parsed) {
        if (wish.img == undefined && page.img)
            wish.img = page.img

        if (!page.text) continue

        const lines = page.text.split("\n")
        for (const i in lines) {
            const line = lines[i].trim()
            if (line.includes("Event Wish Duration"))
                wish.duration = lines[+i + 1].trim()

            const mainMatch = line.match(/.*?5-star.*?(?:weapons?|characters?) (.*?) will (?:receive|get|recieve) a huge/)
            if (mainMatch)
                wish.main = split(mainMatch[1])

            const subMatch = line.match(/.*?4-star.*?(?:weapons?|characters?) (.*?) will (?:receive|get|recieve) a huge/)
            if (subMatch)
                wish.other = split(subMatch[1])
        }
    }

    if (wish.img && wish.main && wish.other && wish.duration) {
        eventWishes.forEach(otherWish => {
            if (otherWish.title == wish.title && otherWish.duration == wish.duration)
                eventWishes.splice(eventWishes.indexOf(otherWish))
        })

        eventWishes.push(wish as Wish)
        // Logger.info("Added", wish)

        eventWishes = eventWishes.sort((a, b) => {
            if (Math.abs(a.roughDate - b.roughDate) < 3600)
                return a.title.includes("Epitome") ? 1 : -1
            else
                return a.roughDate - b.roughDate
        })
    } else if (recent)
        Logger.error(wish)
}
