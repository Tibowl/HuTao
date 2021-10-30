import log4js from "log4js"
import SQLite from "better-sqlite3"
import { ensureDirSync } from "fs-extra"
import fetch from "node-fetch"

import { FollowCategory, News, NewsLang, StoredNews } from "./Types"
import client from "../main"
import { getNewsEmbed } from "./Utils"
import BannersCommand from "../commands/misc/banners"

const Logger = log4js.getLogger("NewsManager")
ensureDirSync("data/")


const langMap: Record<NewsLang, string> = {
    "zh-cn": "简体中文",
    "bbs-zh-cn": "简体中文",
    "zh-tw": "繁體中文",
    "de-de": "Deutsch",
    "en-us": "English",
    "es-es": "Español",
    "fr-fr": "Français",
    "id-id": "Indonesia",
    "ja-jp": "日本語",
    "ko-kr": "한국어",
    "pt-pt": "Português",
    "ru-ru": "Pусский",
    "th-th": "ภาษาไทย",
    "vi-vn": "Tiếng Việt",
}

const languages: { [x in FollowCategory]?: NewsLang} = {
    "news_en-us": "en-us",
    "news_zh-cn": "zh-cn",
    "news_bbs-zh-cn": "bbs-zh-cn",
    "news_zh-tw": "zh-tw",
    "news_de-de": "de-de",
    "news_es-es": "es-es",
    "news_fr-fr": "fr-fr",
    "news_id-id": "id-id",
    "news_ja-jp": "ja-jp",
    "news_ko-kr": "ko-kr",
    "news_pt-pt": "pt-pt",
    "news_ru-ru": "ru-ru",
    "news_th-th": "th-th",
    "news_vi-vn": "vi-vn",
}

export default class NewsManager {
    sql = new SQLite("data/news.db")

    constructor() {
        Logger.info("Initializing data")
        process.on("exit", () => this.sql.close())
        process.on("SIGHUP", () => process.exit(128 + 1))
        process.on("SIGINT", () => process.exit(128 + 2))
        process.on("SIGTERM", () => process.exit(128 + 15))

        this.sql.exec("CREATE TABLE IF NOT EXISTS news (post_id TEXT, lang TEXT, type INT, subject TEXT, created_at INT, nickname TEXT, image_url TEXT, content TEXT, PRIMARY KEY (post_id, lang))")
        this.sql.exec("CREATE INDEX IF NOT EXISTS news_post_id ON news (post_id)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS news_lang ON news (lang)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS news_created_at ON news (created_at)")

        this.addNewsStatement = this.sql.prepare("INSERT OR REPLACE INTO news VALUES (@post_id, @lang, @type, @subject, @created_at, @nickname, @image_url, @content)")
        this.getNewsByIdLangStatement = this.sql.prepare("SELECT * FROM news WHERE post_id = @post_id AND lang = @lang")
        this.getNewsStatement = this.sql.prepare("SELECT * FROM news WHERE lang = @lang ORDER BY created_at DESC, post_id DESC LIMIT 20")
        this.getEventWishesStatement = this.sql.prepare("SELECT * FROM news WHERE lang = 'en-us' AND subject LIKE 'Event Wish%' ORDER BY created_at ASC, post_id ASC")
    }

    lastFetched = 0
    async fetchNews(): Promise<void> {
        const nextScanTime = new Date()
        nextScanTime.setUTCMinutes(0, 0, 0)
        while (nextScanTime.getTime() < Date.now())
            nextScanTime.setUTCMinutes(nextScanTime.getUTCMinutes() + 5)

        setTimeout(() => {
            this.fetchNews().catch(e => Logger.error(e))
        }, Math.max(0, nextScanTime.getTime() - Date.now()) + 5000)

        if (this.lastFetched > Date.now() - 30 * 1000) return
        this.lastFetched = Date.now()

        for (const language of Object.keys(languages) as FollowCategory[])
            for (const type of [1, 2, 3]) {
                try {
                    const langid = languages[language]
                    if (langid == undefined) {
                        Logger.error(`Unknown lang ID ${language}`)
                        continue
                    }

                    let data
                    for (let attempt = 1; attempt <= 5; attempt++) {
                        try {
                            this.lastFetched = Date.now()
                            if (langid == "bbs-zh-cn")
                                data = await (await fetch(`https://bbs-api.mihoyo.com/post/wapi/getNewsList?gids=2&page_size=20&type=${type}`, { headers: { "x-rpc-language": langid, Referer: "https://bbs.mihoyo.com/" }, timeout: 29000 })).json()
                            else
                                data = await (await fetch(`https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=20&type=${type}`, { headers: { "x-rpc-language": langid, Referer: "https://www.hoyolab.com/" }, timeout: 29000 })).json()
                            break
                        } catch (error) {
                            Logger.error(`Failed to fetch ${language} - ${type}, attempt #${attempt}.`)
                            if (attempt == 5) throw error
                        }
                    }
                    if (!data) continue

                    this.lastFetched = Date.now()

                    if (!data?.data?.list) continue

                    const articles: News[] = data.data.list
                    for (const article of articles.reverse()) {
                        const post_id = article.post.post_id
                        if (this.getNewsByIdLang(post_id, langid)) continue

                        Logger.info(`Fetching new post: ${language} ${post_id} - ${article.post.subject}`)
                        let fetched
                        if (langid == "bbs-zh-cn")
                            fetched = await fetch(`https://bbs-api.mihoyo.com/post/wapi/getPostFull?gids=2&post_id=${post_id}&read=1`, { headers: { "x-rpc-language": langid, Referer: "https://bbs.mihoyo.com/" }, timeout: 29000 })
                        else
                            fetched = await fetch(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?gids=2&post_id=${post_id}&read=1`, { headers: { "x-rpc-language": langid, Referer: "https://bbs.mihoyo.com/" }, timeout: 29000 })

                        const postdata = await fetched.json()
                        this.lastFetched = Date.now()
                        if (!postdata?.data?.post) continue

                        const post: News = postdata.data.post
                        article.post = post.post

                        const stored = this.addNews(article, langid, type)
                        this.post(language, stored).catch(Logger.error)
                        const bc = client.commands.get("banners")
                        if (bc)
                            (bc as BannersCommand).parse(stored)
                    }
                } catch (error) {
                    Logger.error("An error occurred while fetching news", error)
                }
            }
    }

    async post(lang: FollowCategory, post: StoredNews): Promise<void> {
        const embed = getNewsEmbed(post)

        await client.followManager.send(lang, "A news article got posted on the forum", embed)
    }

    private addNewsStatement: SQLite.Statement
    addNews(post: News, lang: NewsLang, type: number): StoredNews {
        const stored: StoredNews = {
            post_id: post.post.post_id,
            lang,
            subject: post.post.subject,
            created_at: post.post.created_at,
            nickname: post.user.nickname,
            image_url: JSON.stringify(post.image_list),
            content: post.post.content,
            type
        }

        Logger.info(`Adding new post in ${stored.type} ID ${stored.post_id}: ${stored.subject}`)
        this.addNewsStatement.run(stored)
        return stored
    }

    private getNewsStatement: SQLite.Statement
    getNews(lang: string): StoredNews[] {
        return this.getNewsStatement.all({
            lang
        })
    }

    private getNewsByIdLangStatement: SQLite.Statement
    getNewsByIdLang(post_id: string, lang: NewsLang): StoredNews {
        return this.getNewsByIdLangStatement.get({
            post_id,
            lang
        })
    }

    private getEventWishesStatement: SQLite.Statement
    getEventWishes(): StoredNews[] {
        return this.getEventWishesStatement.all({})
    }

    getLanguages(): string[] {
        return Object.values(languages) as string[]
    }

    getLanguageName(lang: string): string {
        return langMap[lang as NewsLang] ?? lang
    }
}
