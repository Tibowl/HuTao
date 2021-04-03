import log4js from "log4js"
import SQLite from "better-sqlite3"
import { ensureDirSync } from "fs-extra"
import { News, StoredNews } from "./Types"
import fetch from "node-fetch"
import client from "../main"
import { getNewsEmbed } from "./Utils"

const Logger = log4js.getLogger("NewsManager")
ensureDirSync("data/")

export default class NewsManager {
    sql = new SQLite("data/news.db")

    constructor() {
        Logger.info("Initializing data")
        process.on("exit", () => this.sql.close())
        process.on("SIGHUP", () => process.exit(128 + 1))
        process.on("SIGINT", () => process.exit(128 + 2))
        process.on("SIGTERM", () => process.exit(128 + 15))

        this.sql.exec("CREATE TABLE IF NOT EXISTS news (post_id TEXT, type INT, subject TEXT, created_at INT, nickname TEXT, image_url TEXT, content TEXT, PRIMARY KEY (post_id))")
        // this.sql.exec("DELETE FROM news WHERE post_id='241284'")

        this.addNewsStatement = this.sql.prepare("INSERT OR REPLACE INTO news VALUES (@post_id, @type, @subject, @created_at, @nickname, @image_url, @content)")
        this.getNewsByIdStatement = this.sql.prepare("SELECT * FROM news WHERE post_id = @post_id")
        this.getNewsStatement = this.sql.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20")

        this.fetchNews()
    }

    async fetchNews(): Promise<void> {
        try {
            for (const type of [1, 2, 3]) {
                const data = await (await fetch(`https://bbs-api-os.hoyolab.com/community/post/wapi/getNewsList?gids=2&page_size=20&type=${type}`)).json()

                if (!data?.data?.list) continue

                const articles: News[] = data.data.list
                for (const article of articles) {
                    const post_id = article.post.post_id
                    if (this.getNewsById(post_id)) continue

                    Logger.info(`Fetching new post: ${post_id} - ${article.post.subject}`)
                    const postdata = await (await fetch(`https://bbs-api-os.hoyolab.com/community/post/wapi/getPostFull?gids=2&post_id=${post_id}&read=1`)).json()
                    if (!postdata?.data?.post) continue

                    const post: News = postdata.data.post
                    article.post = post.post

                    const stored = this.addNews(article, type)
                    this.post(stored)
                }
            }
        } catch (error) {
            Logger.error("An error occurred while fetching news", error)
        }
        setTimeout(() => {
            this.fetchNews()
        }, 60 * 1000)
    }

    async post(post: StoredNews): Promise<void> {
        const embed = getNewsEmbed(post)

        client.followManager.send("news", "A news article got posted on the forum", embed)
    }

    private addNewsStatement: SQLite.Statement
    addNews(post: News, type: number): StoredNews {
        const stored: StoredNews = {
            post_id: post.post.post_id,
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
    getNews(): StoredNews[] {
        return this.getNewsStatement.all()
    }

    private getNewsByIdStatement: SQLite.Statement
    getNewsById(post_id: string): StoredNews {
        return this.getNewsByIdStatement.get({
            post_id
        })
    }
}
