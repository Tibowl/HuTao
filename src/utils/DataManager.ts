import { exists, existsSync, move, readFileSync, unlink, writeFile } from "fs-extra"
import log4js from "log4js"
import { join } from "path"

import { AbyssFloor, AbyssSchedule, Artifact, ArtifactType, BotEmoji, Character, CharacterFull, Cost, CostTemplate, Enemy, Event, Guide, GuideLinks, GuidePage, Item, MainStatInfo, Material, PaimonShop, Store, Weapon } from "./Types"
import { findFuzzy } from "./Utils"

import artifactsData from "../data/gamedata/artifacts.json"
import artifactsMainLevels from "../data/gamedata/artifact_main_levels.json"
import artifactsMainStats from "../data/gamedata/artifact_main_stats.json"

import costTemplates from "../data/gamedata/cost_templates.json"

import characterData from "../data/gamedata/characters.json"
import characterCurves from "../data/gamedata/character_curves.json"
import characterLevels from "../data/gamedata/character_levels.json"

import weaponData from "../data/gamedata/weapons.json"
import weaponCurves from "../data/gamedata/weapon_curves.json"
import weaponLevels from "../data/gamedata/weapon_levels.json"

import paimonShop from "../data/gamedata/paimon_shop.json"

import abyssFloors from "../data/gamedata/abyss_floors.json"
import abyssSchedule from "../data/gamedata/abyss_schedule.json"

import enemyData from "../data/gamedata/enemies.json"

import materialData from "../data/gamedata/materials.json"

import emojiData from "../data/emojis.json"
import eventData from "../data/events.json"; // Not in gamedata since it also contains webevents
import guideData from "../data/guides.json"

const Logger = log4js.getLogger("DataManager")
const existsP = async (path: string): Promise<boolean> => new Promise((resolve) => exists(path, resolve))

const path = join(__dirname, "../../src/data/")
const store = join(path, "store.json")
const oldstore = join(path, "store.json.old")
const defaultStore: Store = {}

export default class DataManager {
    store: Store = defaultStore

    readonly max_resin = 200
    readonly minutes_per_resin = 8
    readonly baseURL = "https://hutaobot.moe/"

    readonly artifacts: Record<string, Artifact> = artifactsData as Record<string, Artifact>
    readonly artifactMainStats: Record<ArtifactType, MainStatInfo[]> = artifactsMainStats as Record<ArtifactType, MainStatInfo[]>
    readonly artifactMainLevels: Record<string, Record<number, Record<number, string>>> = artifactsMainLevels as Record<string, Record<number, Record<number, string>>>
    readonly characterLevels: Array<number> = characterLevels

    private readonly characters: Record<string, Character> = characterData as Record<string, Character>
    readonly weapons: Record<string, Weapon> = weaponData as Record<string, Weapon>
    readonly weaponLevels: Array<number[]> = weaponLevels

    private readonly abyssSchedule: Record<number, AbyssSchedule> = abyssSchedule
    readonly abyssFloors: Record<number, AbyssFloor> = abyssFloors

    readonly paimonsBargains: PaimonShop[] = paimonShop
    readonly costTemplates: Record<string, Cost[]> = costTemplates

    readonly enemies: Record<string, Enemy> = enemyData as Record<string, Enemy>

    readonly materials: Record<string, Material> = materialData

    readonly events: Event[] = eventData as Event[]
    readonly emojis: Record<BotEmoji, string> = emojiData
    readonly guides: Guide[] = guideData as Guide[]

    constructor() {
        try {
            if (existsSync(store))
                try {
                    this.store = Object.assign({}, defaultStore, JSON.parse(readFileSync(store).toString()))
                    return
                } catch (error) {
                    Logger.error("Failed to read/parse store.json")
                }

            if (existsSync(oldstore))
                try {
                    this.store = Object.assign({}, defaultStore, JSON.parse(readFileSync(oldstore).toString()))
                    Logger.error("Restored from old store!")
                    return
                } catch (error) {
                    Logger.error("Failed to read/parse store.json.old")
                }

            // writeFileSync(store, JSON.stringify(this.store))
        } catch (error) {
            Logger.error("Failed to open store.json", error)
        }
    }

    lastStore: number | NodeJS.Timeout | undefined = undefined
    saveStore(): void {
        if (this.lastStore == undefined) {
            this.lastStore = setTimeout(async () => {
                try {
                    if (await existsP(oldstore))
                        await unlink(oldstore)

                    if (await existsP(store))
                        await move(store, oldstore)

                    await writeFile(store, JSON.stringify(this.store, undefined, 4))
                } catch (error) {
                    Logger.error("Failed to save", error)
                }
                this.lastStore = undefined
            }, 1000)
        }
    }

    emoji(type: string | undefined, includeName?: boolean): string {
        if (!type)
            return type ?? "Unknown"

        const found = this.emojis[type as BotEmoji]
        if (!found && includeName == false) return ""
        if (!found) return type
        if (includeName) return `${found} ${type}`
        return found
    }

    getCharacters(): Character[] {
        return Object.values(this.characters)
    }

    getReleasedCharacters(): CharacterFull[] {
        return Object.values(this.characters).filter(char =>
            this.isFullCharacter(char)
        ) as CharacterFull[]
    }

    isFullCharacter(char: Character): char is CharacterFull {
        return typeof (char as CharacterFull).releasedOn == "string"
    }

    getAbyssSchedules(): AbyssSchedule[] {
        return Object.values(this.abyssSchedule)
    }

    getArtifactByName(name: string): Artifact | undefined {
        const targetNames = Object.keys(this.artifacts)
        const target = findFuzzy(targetNames, name)

        if (target)
            return this.artifacts[target]

        return undefined
    }

    getCharacterByName(name: string): Character | undefined {
        const targetNames = this.getCharacters().map(c => c.name)
        const target = findFuzzy(targetNames, name)

        if (target)
            return this.characters[target]

        return undefined
    }

    getReleasedCharacterByName(name: string): CharacterFull | undefined {
        const targetNames = this.getReleasedCharacters().map(c => c.name)
        const target = findFuzzy(targetNames, name)

        if (target)
            return this.characters[target] as CharacterFull

        return undefined
    }

    getWeaponByName(name: string): Weapon | undefined {
        const targetNames = Object.keys(this.weapons)
        const target = findFuzzy(targetNames, name)

        if (target)
            return this.weapons[target]

        return undefined
    }

    getEnemyByName(name: string): Enemy | undefined {
        const targetNames = Object.keys(this.enemies)
        const target = findFuzzy(targetNames, name)

        if (target)
            return this.enemies[target]

        return undefined
    }

    getMaterialByName(name: string): Material | undefined {
        const targetNames = Object.keys(this.materials)
        const target = findFuzzy(targetNames, name)

        if (target)
            return this.materials[target]

        return undefined
    }

    getGuides(type: keyof GuideLinks, name: string): { guide: Guide, page: GuidePage }[] {
        return this.guides
            .flatMap(guide => guide.pages
                .filter(page => page.links?.[type]?.includes(name))
                .map(page => ({
                    guide, page
                }))
            )
    }

    getCharStatsAt(char: CharacterFull, level: number, ascension: number): Record<string, number> {
        const stats: Record<string, number> = {
            "Base HP": char.baseStats.hpBase,
            "Base ATK": char.baseStats.attackBase,
            "Base DEF": char.baseStats.defenseBase,
            "CRIT Rate": char.baseStats.criticalBase,
            "CRIT DMG": char.baseStats.criticalDmgBase,
        }

        for (const curve of char.curves) {
            stats[curve.name] = stats[curve.name] * characterCurves[curve.curve][level - 1]
        }

        const asc = char.ascensions.find(a => a.level == ascension)

        for (const statup of asc?.statsUp ?? []) {
            stats[statup.stat] = (stats[statup.stat] ?? 0) + statup.value
        }

        return stats
    }

    getWeaponStatsAt(weapon: Weapon, level: number, ascension: number): Record<string, number> {
        const stats: Record<string, number> = {}

        for (const curve of weapon.weaponCurve ?? []) {
            stats[curve.stat] = curve.init * weaponCurves[curve.curve][level - 1]
        }

        const asc = (weapon.ascensions ?? []).find(a => a.level == ascension)

        for (const statup of asc?.statsUp ?? []) {
            stats[statup.stat] = (stats[statup.stat] ?? 0) + statup.value
        }

        return stats
    }

    stat(name: string, value: number): string {
        switch (name) {
            case "HP%":
            case "DEF%":
            case "ATK%":
            case "Anemo DMG Bonus":
            case "Cryo DMG Bonus":
            case "Dendro DMG Bonus":
            case "Electro DMG Bonus":
            case "Geo DMG Bonus":
            case "Hydro DMG Bonus":
            case "Physical DMG Bonus":
            case "Pyro DMG Bonus":
            case "Healing Bonus":
            case "Energy Recharge":
            case "CRIT Rate":
            case "CRIT DMG":
                return (value * 100).toFixed(1) + "%"

            case "HP":
            case "ATK":
            case "DEF":
            case "Base HP":
            case "Base ATK":
            case "Base DEF":
            case "Elemental Mastery":
                return value.toFixed(0)

            default:
                Logger.error(`Unknown stat '${name}', defaulting to formatting by value`)
                return value < 2 ? ((value * 100).toFixed(1) + "%") : value.toFixed(0)
        }
    }

    statName(name: string): string {
        return name.replace("Base ", "").replace("CRIT ", "C")
    }

    getCostsFromTemplate(costTemplate: CostTemplate): Cost[] {
        const template = this.costTemplates[costTemplate.template]

        return template.map(c => ({
            mora: c.mora,
            items: c.items.map(i => ({
                count: i.count,
                name:  i.name.replace(/<(.*?)>/g, (_, x) => costTemplate.mapping[x])
            }))
        }))
    }

    getCosts(cost: Cost): string {
        let items = cost.items
        if (cost.mora)
            items = [{
                name: "Mora",
                count: cost.mora
            }, ...items]

        return this.getItemCosts(items)
    }

    getItemCosts(items: Item[]): string {
        return items.map(i => `**${i.count}**x *${this.emoji(i.name, true)}*`).join("\n")
    }

    isInCosts(template: CostTemplate | Cost[], name: string): boolean {
        const costs = Array.isArray(template) ? template : this.getCostsFromTemplate(template)

        for (const c of costs)
            if (c.items.some(i => i.name == name))
                return true

        return false
    }
}
