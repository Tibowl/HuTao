import { MessageEmbed } from "discord.js"
import log4js from "log4js"
import Twit from "twit"

import config from "../data/config.json"
import client from "../main"
import { FollowCategory, Tweet } from "./Types"
import { sendError } from "./Utils"

const Logger = log4js.getLogger("TweetManager")

export default class Tweetmanager {
    stream: Twit.Stream | undefined = undefined
    tweeters: {[x in FollowCategory]?: string} = {
        twitter_en: "1072404907230060544",
        twitter_jp: "1070960596357509121",
        // twitter_fr: "1133565935615299585",
        // twitter_ko: "1133563273914212352",
        // twitter_es: "1149150831679135745"
    }

    init(): void {
        const T = new Twit(config.twitter)

        const follow = Object.values(this.tweeters).map(k => k ?? "")
        this.stream = T.stream("statuses/filter", { follow })
        this.stream.on("tweet", async (tweet: Tweet) => this.handleTweet(tweet).catch(Logger.error))
        this.stream.on("limit", l => Logger.debug("Twitter limit", l))
        this.stream.on("warning", w => Logger.debug("Twitter warning", w))
        this.stream.on("error", e => Logger.error("Twitter error", e))

        Logger.info(`Following ${follow.length} twitter account(s)!`)
    }

    handleTweet = async (tweet: Tweet): Promise<void> => {
        if (!Object.values(this.tweeters).includes(tweet.user.id_str)) return
        const tweetLink = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`

        if (tweet.retweeted_status && Object.values(this.tweeters).includes(tweet.retweeted_status.user.id_str))
            return Logger.debug(`Skipping RT ${tweetLink}`)
        if (tweet.in_reply_to_user_id_str && !Object.values(this.tweeters).includes(tweet.in_reply_to_user_id_str))
            return Logger.debug(`Skipping random reply ${tweetLink}`)

        let text = (tweet.extended_tweet?.full_text ?? tweet.text).replace(/&gt;/g, ">").replace(/&lt;/g, "<")

        Logger.info(`Sending tweet to channels: ${tweetLink}`)

        const tweeter = tweet.user.id_str
        if (tweet.retweeted_status)
            tweet = tweet.retweeted_status

        const embed = new MessageEmbed()
            .setAuthor(tweet.user.name, tweet.user.profile_image_url_https, `https://twitter.com/${tweet.user.screen_name}`)
            .setColor(`#${tweet.user.profile_background_color}`)

        // Tweet has media, don't embed it
        if (tweet.extended_entities?.media) {
            if (tweet.extended_entities.media[0].type != "photo") {
                await this.send(tweeter, tweetLink)
                return
            } else
                embed.setImage(tweet.extended_entities.media[0].media_url_https)
        }


        if (tweet.extended_tweet?.entities) {
            const entities = tweet.extended_tweet.entities

            if (entities.urls)
                for (const url of entities.urls)
                    text = text.replace(url.url, url.expanded_url)

            // Tweet has media, don't embed it
            if (entities.media) {
                if (entities.media[0].type != "photo") {
                    await this.send(tweeter, tweetLink)
                    return
                } else
                    embed.setImage(entities.media[0].media_url_https)
            }

        } else if (tweet.entities?.urls) {
            for (const url of tweet.entities.urls)
                text = text.replace(url.url, url.expanded_url)
        }

        embed.setDescription(text)

        await this.send(tweeter, `<${tweetLink}>`, embed)
    }

    async send(tweeter: string, content?: string, embed?: MessageEmbed): Promise<void> {
        const category = Object.entries(this.tweeters).find(([_k, v]) => v == tweeter)?.[0] as FollowCategory | undefined

        if (!category) {
            await sendError(`Unknown Tweeter ${tweeter}, ${content}`)
            return
        }

        await client.followManager.send(category, content, embed)
    }

    shutdown = (): void => {
        if (this.stream !== undefined)
            this.stream.stop()
    }
}
