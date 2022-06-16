import { CommandInteraction, Message, Snowflake } from "discord.js"
import { APIMessage } from "discord-api-types/v9"

// Discord shortcuts
export type CommandSource = Message | CommandInteraction
export type SendMessage = Message | APIMessage
export type CommandResponse = Promise<SendMessage | undefined> | undefined

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

// Genshin stuff
export type Server = "Asia" | "Europe" | "America"

// Following stuff
export type FollowCategory =
    "events" | "events_no_daily" |
    "twitter_en" | /* "twitter_es" | "twitter_fr" | */"twitter_jp" |// "twitter_ko" |
    "news_en-us" | "news_es-es" | "news_fr-fr" | "news_ja-jp" | "news_ko-kr" | "news_zh-cn" | "news_bbs-zh-cn" | "news_zh-tw" | "news_de-de" |  "news_id-id" | "news_pt-pt" | "news_ru-ru" | "news_th-th" | "news_vi-vn"

export interface Follower {
    channelID: string
    category: FollowCategory
    addedOn: number
    addedBy: string
}

// Reminder stuff
export interface Reminder {
    id: number
    subject: string
    user: Snowflake
    timestamp: number
    duration: number
}

// Notes
export interface Note {
    guild_id:    string
    category_id: string
    id:          number
    user:        string
    subject:     string
    timestamp:   number
}

// News posts
export interface News {
    post:               Post
    // forum:              Forum
    // topics:             Topic[]
    user:               NewsUser
    // self_operation:     SelfOperation
    // stat:               Stat
    // help_sys?:          HelpSys | null
    // cover?:             Cover | null
    image_list:         Cover[]
    // is_official_master: boolean
    // is_user_master:     boolean
    // hot_reply_exist:    boolean
    // vote_count:         number
    // last_modify_time:   number
}

export interface Cover {
    url:    string
    height: number
    width:  number
    format: Format
    size:   string
}

export enum Format {
    Empty = "",
    GIF = "gif",
    JPG = "jpg",
    PNG = "png",
}

// export interface Forum {
//     id:      number
//     name:    string
//     icon:    string
//     game_id: number
// }

// export interface HelpSys {
//     top_up: null
// }

export interface Post {
    // game_id:                 number
    post_id:                 string
    // f_forum_id:              number
    // uid:                     string
    subject:                 string
    content:                 string
    // cover:                   string
    // view_type:               number
    created_at:              number
    // images:                  unknown[]
    // post_status:             PostStatus
    // topic_ids:               number[]
    // view_status:             number
    // max_floor:               number
    // is_original:             number
    // republish_authorization: number
    // reply_time:              Date
    // is_deleted:              number
    // is_interactive:          boolean
    // structured_content:      string
    // structured_content_rows: unknown[]
    // lang:                    string
    // official_type:           number
    // reply_forbid:            ReplyForbid | null
}

// export interface PostStatus {
//     is_top:      boolean
//     is_good:     boolean
//     is_official: boolean
// }

// export interface ReplyForbid {
//     date_type:  number
//     start_date: string
//     cur_date:   string
//     level:      number
// }

// export interface SelfOperation {
//     attitude:     number
//     is_collected: boolean
// }

// export interface Stat {
//     view_num:     number
//     reply_num:    number
//     like_num:     number
//     bookmark_num: number
//     share_num:    number
// }

// export interface Topic {
//     id:             number
//     name:           string
//     cover:          string
//     is_top:         boolean
//     is_good:        boolean
//     is_interactive: boolean
//     game_id:        number
// }

export interface NewsUser {
    // uid:           string
    nickname:      string
    // introduce:     string
    // avatar:        string
    // gender:        number
    // certification: Certification
    // level_exp:     LevelExp
    // is_following:  boolean
    // is_followed:   boolean
    // avatar_url:    string
}

// export interface Certification {
//     type:  number
//     label: string
// }

// export interface LevelExp {
//     level: number
//     exp:   number
// }

export type NewsLang = "zh-cn" | "bbs-zh-cn" | "zh-tw" | "de-de" | "en-us" | "es-es" | "fr-fr" | "id-id" | "ja-jp" | "ko-kr" | "pt-pt" | "ru-ru" | "th-th" | "vi-vn"

export interface StoredNews {
    post_id: string
    lang: NewsLang
    type: number
    subject: string
    created_at: number
    nickname: string
    image_url: string
    content: string
}

/* export interface StructuredContent {
    insert:      InsertClass | string
    attributes?: Attributes
}

export interface Attributes {
    align?: string
    bold?:  boolean
}

export interface InsertClass {
    image: string
}*/

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
    name: string
    screen_name: string
    id_str: string
    profile_image_url_https: string

    [key: string]: unknown
}

// Game data
export interface Artifact {
    name:     string
    note?:    string
    levels?:  number[]
    bonuses?: Bonus[]
    artis?:   Arti[]
}

export interface Arti {
    type: ArtifactType
    name: string
    desc: string
    icon: string
}

export enum ArtifactType {
    Flower = "Flower",
    Plume = "Plume",
    Sands = "Sands",
    Goblet = "Goblet",
    Circlet = "Circlet",
}

export interface Bonus {
    count: number
    desc:  string
}

export interface MainStatInfo {
    name:   string
    weight: number
}

export type Character = CharacterFull | CharacterPlaceholder
export interface CharacterPlaceholder {
    name:            string
    desc:            string
    star?:           number
    weaponType?:     WeaponType
    icon?:           string
    media:           Media
    meta:            Meta
    skills?:         Skills[]
    ascensionCosts?: CostTemplate
}
export type CharacterFull = Required<CharacterPlaceholder> & {
    releasedOn:     string
    icon:           string
    baseStats:      CharacterBaseStats
    curves:         CurveElement[]
    ascensions:     CharacterAscension[]
}

export interface Media {
    videos?: Record<string, string>
    imgs?:   string[]
}

export interface CharacterBaseStats {
    hpBase:          number
    attackBase:      number
    defenseBase:     number
    criticalBase:    number
    criticalDmgBase: number
}

export interface CharacterAscension {
    level:    number
    maxLevel: number
    statsUp:  StatsUp[]
}

export interface Cost {
    items: Item[]
    mora?: number
}

export interface CostTemplate {
    template: string
    mapping: Record<string, string>
}

export interface Item {
    count: number
    name:  string
}

export interface StatsUp {
    stat:  StatsName
    value: number
}

export enum StatsName {
    AnemoDMGBonus = "Anemo DMG Bonus",
    Atk = "ATK%",
    BaseATK = "Base ATK",
    BaseDEF = "Base DEF",
    BaseHP = "Base HP",
    CritRate = "CRIT Rate",
    CritDmg = "CRIT DMG",
    CryoDMGBonus = "Cryo DMG Bonus",
    Def = "DEF%",
    DendroDMGBonus = "Dendro DMG Bonus",
    ElectroDMGBonus = "Electro DMG Bonus",
    ElementalMastery = "Elemental Mastery",
    EnergyRecharge = "Energy Recharge",
    GeoDMGBonus = "Geo DMG Bonus",
    HP = "HP%",
    HealingBonus = "Healing Bonus",
    HydroDMGBonus = "Hydro DMG Bonus",
    PhysicalDMGBonus = "Physical DMG Bonus",
    PyroDMGBonus = "Pyro DMG Bonus",
}

export interface CurveElement {
    name:  StatsName
    curve: CurveEnum
}

export enum CurveEnum {
    RegularAtk4 = "Regular atk 4*",
    RegularAtk5 = "Regular atk 5*",
    RegularHpdef4 = "Regular hpdef 4*",
    RegularHpdef5 = "Regular hpdef 5*",
}

export interface Meta {
    birthMonth?:    number
    birthDay?:      number
    association?:   string
    title:          string
    detail:         string
    affiliation?:   string
    element:        string
    constellation?: string
    cvChinese?:     string
    cvJapanese?:    string
    cvEnglish?:     string
    cvKorean?:      string
}

export interface Skills {
    talents?:        Skill[]
    ult?:            Skill
    passive?:        Passive[]
    constellations?: Constellation[]
}

export interface Constellation {
    name: string
    desc: string
    icon: string
}

export interface Passive {
    name:          string
    desc:          string
    minAscension?: number
    icon?:         string
}

export interface Skill {
    name:         string
    desc:         string
    charges?:     number
    talentTable?: (TalentTable | TalentValue)[]
    costs?:       CostTemplate
    type?:        string
    video?:       string
    icon?:        string
}

export interface TalentTable {
    name:   string
    values: string[]
}
export interface TalentValue {
    name:   string
    value:  string
}

export enum WeaponType {
    Bow = "Bow",
    Catalyst = "Catalyst",
    Claymore = "Claymore",
    Polearm = "Polearm",
    Sword = "Sword",
}

export interface Weapon {
    name:              string
    desc?:             string
    placeholder?:      true
    placeholderStats?: PlaceHolderStats
    weaponType:        WeaponType
    stars:             number
    weaponCurve?:      WeaponCurve[]
    icon:              string
    awakenIcon?:       string
    ascensions?:       WeaponAscension[]
    ascensionCosts?:   CostTemplate
    lore?:             string
    refinements?:      Refinement[]
}

export interface WeaponAscension {
    level:    number
    maxLevel: number
    statsUp:  StatsUp[]
}

export interface Refinement {
    name: string
    desc: string
}

export interface WeaponCurve {
    stat: StatsName
    init: number
    curve: WeaponCurveName
}

export enum WeaponCurveName {
    Atk11 = "ATK 1.1",
    Atk12 = "ATK 1.2",
    Atk14 = "ATK 1.4",
    Atk21 = "ATK 2.1",
    Atk22 = "ATK 2.2",
    Atk23 = "ATK 2.3",
    Atk24 = "ATK 2.4",
    Atk31 = "ATK 3.1",
    Atk32 = "ATK 3.2",
    Atk34 = "ATK 3.4",
    C1 = "C1",
    C2 = "C2",
    C3 = "C3",
}


export interface PlaceHolderStats {
    level: number
    stats: Partial<Record<StatsName, number>>
}

export interface Enemy {
    name:         string
    placeholder?: true
    icon?:        string
    type?:        string
    kind?:        string
    desc?:        string
    notes?:       string
    resistance?:  string[][]
}

export interface Material {
    name:       string
    desc?:      string
    longDesc?:  string
    stars?:     number
    type?:      string
    category?:  string
    icon?:      string
    sources?:   string[]
    specialty?: { char: string, recipe: string }
    recipe?:    Item[]
    effect?:    string | Record<string, string>
}

export interface AbyssFloor {
    teams:     number
    leyline:   string
    chambers?: AbyssChamber[]
}

export interface AbyssChamber {
    chamber:  number
    level:    number
    conds:    string
    monsters: Array<string[]>
}

export interface AbyssSchedule {
    start:             string
    end:               string
    buff:              string
    buffDesc:          string
    regularFloors:     number[]
    spiralAbyssFloors: number[]
}

// Events
export interface Event {
    name:          string
    type:          EventType
    prediction?:   boolean
    link?:         string
    img?:          string
    start?:        string
    start_server?: boolean
    end?:          string
    end_server?:   boolean
    timezone?:     string
    reminder?:     EventReminderType
    remindtime?:   string
}

export enum EventType {
    Web = "Web",
    Quiz = "Quiz",
    InGame = "In-game",
    Maintenance = "Maintenance",
    Stream = "Stream",
    Unlock = "Unlock",
    Banner = "Banner"
}
export enum EventReminderType {
    Daily = "daily",
    End = "end"
}


// Emojis
export type BotEmoji =
    "Anemo" | "Cryo" | "Dendro" | "Electro" | "Geo" | "Hydro" | "Pyro" |
    "Bow" | "Catalyst" | "Claymore" | "Polearm" | "Sword"

// Paimon Shop
export interface PaimonShop {
    weapon: string
    char:   string[]
}

// Guides
export interface Guide {
    name:  string
    pages: GuidePage[]
}
export interface GuidePage {
    name:    string
    img?:    string
    desc?:   string
    url?:    string
    credits: string
    links?:  GuideLinks
}

export interface GuideLinks {
    material?:  string[]
    weapon?:    string[]
    artifact?:  string[]
    enemy?:     string[]
    character?: string[]
}
