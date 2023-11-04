import SQLite from "better-sqlite3"
import { Channel, ChannelType, EmbedBuilder, Guild, Message, Snowflake } from "discord.js"
import { ensureDirSync } from "fs-extra"
import log4js from "log4js"
import { FollowCategory, Follower } from "./Types"
import { sendToChannels } from "./Utils"


const Logger = log4js.getLogger("FollowManager")
ensureDirSync("data/")

export default class FollowManager {
    sql = new SQLite("data/follows.db")

    constructor() {
        Logger.info("Initializing data")
        process.on("exit", () => this.sql.close())
        process.on("SIGHUP", () => process.exit(128 + 1))
        process.on("SIGINT", () => process.exit(128 + 2))
        process.on("SIGTERM", () => process.exit(128 + 15))

        this.sql.exec("CREATE TABLE IF NOT EXISTS follows (guildID TEXT, channelID TEXT, category TEXT, addedOn BIGINT, addedBy TEXT, pingRole TEXT DEFAULT '', PRIMARY KEY (channelID, category))")
        this.sql.exec("CREATE INDEX IF NOT EXISTS follows_category ON follows (category)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS follows_channelID ON follows (channelID)")
        this.sql.exec("CREATE INDEX IF NOT EXISTS follows_guildID ON follows (guildID)")
        try {
            this.sql.exec("ALTER TABLE follows ADD COLUMN pingRole TEXT DEFAULT ''")
            Logger.debug("Table migrated for ping roles")
        } catch (error) {
            void 0
        }

        this.addFollowStatement = this.sql.prepare("INSERT OR REPLACE INTO follows VALUES (@guildID, @channelID, @category, @addedOn, @addedBy, @pingRole)")

        this.getFollowsStatement = this.sql.prepare("SELECT * FROM follows WHERE category = @category AND channelID = @channelID")
        this.getFollowsInChannelStatement = this.sql.prepare("SELECT * FROM follows WHERE channelID = @channelID")
        this.followingStatement = this.sql.prepare("SELECT category, channelID, pingRole FROM follows WHERE guildID = @guildID GROUP BY category, channelID")
        this.getFollowersStatement = this.sql.prepare("SELECT channelID, pingRole FROM follows WHERE category = @category")
        this.followsStatement = this.sql.prepare("SELECT channelID, pingRole FROM follows WHERE category = @category AND channelID = @channelID")

        this.unfollowsStatement = this.sql.prepare("DELETE FROM follows WHERE category = @category AND channelID = @channelID")
        this.dropChannelStatement = this.sql.prepare("DELETE FROM follows WHERE channelID = @channelID")
        this.dropGuildStatement = this.sql.prepare("DELETE FROM follows WHERE guildID = @guildID")
    }

    private addFollowStatement: SQLite.Statement
    addFollow(guild: Guild, channel: Channel, category: FollowCategory, addedBy: string, pingRole: string): void {
        Logger.info(`Following in ${category} for ${addedBy} in ${channel.id} in ${guild.name} (${guild.id}) - PingRole: ${pingRole}`)
        this.addFollowStatement.run({
            guildID: guild.id,
            channelID: channel.id,
            category,
            addedOn: new Date().getTime(),
            pingRole,
            addedBy
        })
    }

    private getFollowsStatement: SQLite.Statement
    private getFollowsInChannelStatement: SQLite.Statement
    getFollows(channel: { id: string }, category?: FollowCategory): Follower[] {
        if (category == undefined) {
            return this.getFollowsInChannelStatement.all({ channelID: channel.id }) as Follower[]
        }
        return this.getFollowsStatement.all({
            channelID: channel.id,
            category
        }) as Follower[]
    }

    private getFollowersStatement: SQLite.Statement
    getFollowers(category: string): { channelID: Snowflake, pingRole: Snowflake }[] {
        return this.getFollowersStatement.all({
            category
        }) as { channelID: Snowflake, pingRole: Snowflake }[]
    }

    private followsStatement: SQLite.Statement
    follows(channel: Channel, category: FollowCategory): boolean {
        return this.followsStatement.get({
            channelID: channel.id,
            category
        }) !== undefined
    }


    private unfollowsStatement: SQLite.Statement
    unfollow(channel: Channel, category: FollowCategory): void {
        Logger.info(`Unfollowing ${category} in ${channel.id}`)
        this.unfollowsStatement.run({
            channelID: channel.id,
            category
        })
    }

    private dropChannelStatement: SQLite.Statement
    dropChannel(channelID: Snowflake): void {
        Logger.info(`Removing channel ${channelID}`)
        this.dropChannelStatement.run({
            channelID
        })
    }

    private dropGuildStatement: SQLite.Statement
    dropGuild(guildID: Snowflake): void {
        Logger.info(`Removing guild ${guildID}`)
        this.dropGuildStatement.run({
            guildID
        })
    }

    private followingStatement: SQLite.Statement
    following(guild: Guild): { category: FollowCategory, channelID: Snowflake, pingRole: Snowflake }[] {
        return this.followingStatement.all({
            guildID: guild.id
        }) as { category: FollowCategory, channelID: Snowflake, pingRole: Snowflake }[]
    }

    async send(category: FollowCategory, content?: string, embed?: EmbedBuilder): Promise<(Message | Message[])[]> {
        let channels = this.getFollowers(category)
        channels = channels.filter((val, ind) => channels.findIndex(v => v.channelID == val.channelID) === ind)

        Logger.info(`Sending ${category} to ${channels.length} channels: ${content}`)
        try {
            const messages = (await sendToChannels(channels, content, embed)).filter((x): x is Message => x !== undefined)

            for (const message of messages)
                if (message instanceof Message && message.channel.type === ChannelType.GuildAnnouncement)
                    try {
                        await message.crosspost()
                    } catch (error) {
                        Logger.error(`Unable to publish to ${message.channel.id} from ${message.guild?.id}: `, error)
                    }
            return messages
        } catch (error) {
            Logger.error(`Unable to send to ${channels.length} channels: `, error)
            return []
        }
    }
}
