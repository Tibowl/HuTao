// Stored information
export interface Store {
    stats?: Stats
}

export interface Stats {
    [key: string]: CommandStats
}
export interface CommandStats {
    [key: string]: number
}

// Following stuff
export type FollowCategory = "birthday" | "maint" | "twitter_en" | "twitter_jp" | "twitter_fr" | "twitter_kr" | "twitter_es"
export interface Follower {
    channelID: string
    category: FollowCategory
    addedOn: number
    addedBy: string
}

// Table creation
export type Padding = 0 | 1
export interface NameTable {
    [key: number]: string
}

// Twitter stuff
export interface Tweet {
    created_at: string
    user: User
    extended_tweet?: Tweet
    retweeted_status?: Tweet
    entities?: Entities
    extended_entities?: Entities
    in_reply_to_user_id_str?: string
    text: string
    full_text?: string

    [key: string]: unknown
}

interface Entities {
    hashtags?: unknown[]
    media?: {
        media_url_https: string
        url: string
        type: "photo" | "video" | "animated_gif"

        [key: string]: unknown
    }[]
    user_mentions?: unknown[]
    symbols?: unknown[]
    urls?: {
        expanded_url: string
        url: string

        [key: string]: unknown
    }[]

    [key: string]: unknown
}

interface User {
    screen_name: string
    id_str: string
    profile_image_url_https: string

    [key: string]: unknown
}
