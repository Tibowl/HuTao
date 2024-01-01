Hu Tao
=======

Hu Tao is a Discord bot for Genshin Impact offering [guide/routes](https://i.imgur.com/fD46Uf6.png), [character](https://i.imgur.com/0BkDmKH.png) and [weapon](https://i.imgur.com/nlj91gB.png) info, [news updates](https://i.imgur.com/9N9s1hd.png) and [event reminders](https://i.imgur.com/B21ye84.png) that you can follow, [reminders](https://i.imgur.com/TIfS4ZT.png), [gacha rate calculator](https://i.imgur.com/GXP3IDz.png) and more. Some parts are also available on [hutaobot.moe](https://hutaobot.moe/).

An invite link for this bot can be found [here](https://discord.com/oauth2/authorize?client_id=826550363355086918&scope=bot+applications.commands&permissions=313344). If you need help, you can find the support Discord [here](https://discord.gg/BM3Srp8j8G).

![Showcase](https://i.imgur.com/ZQhZZtW.gif)

## Commands
The bot command prefix is `/`, but also supports slash-commands. Help for a specific command can be retrieved via `/help <command>`. Syntax for these commands might be slightly different due to limitations of Discord, you can see the usage for those commands by typing `/` in a chat with the bot. For example typing `/char` will show the commands that start with `char` like [this](https://i.imgur.com/vEf0IGD.png). Most commands support [autocomplete](https://i.imgur.com/PeecLQm.png) when using the slash command version.

Every reply to commands will include an ❌ delete button, users can click this button to remove the bot post. This allows users to clean up in case something wasn't relevant to the conversation/reduce spam.

To improve usability, most commands that search stuff are fuzzy search and provide autocomplete in slash version when applicable. This means you can make a typo, or shorten the heck out of their names. (As of time of writing, `glad` matches `Gladiator's Finale`, `CW` matches `Crimson Witch of Flames`, `amus` matches `Amos' Bow`)

### Characters
- `/character`: Displays [a list of all characters](https://i.imgur.com/vsUq2sR.png). 
    - This command supports filtering such as element type (like `/character -pyro`), weapon type (like `/character -polearm`) and/or stars (like `/character -5*`). [Example](https://i.imgur.com/Pyyg8ex.png)
    - Available [on the site](https://hutaobot.moe/characters)
- `/character <name>`: Displays character information, such as [basic data](https://i.imgur.com/0BkDmKH.png) / [meta data](https://i.imgur.com/GHfHAMf.png) / [ascensions + stats](https://i.imgur.com/mL3I2RK.png) / [talent costs](https://i.imgur.com/jK0tKzM.png) / [talents](https://i.imgur.com/Q7p3VbU.png) / [passives](https://i.imgur.com/vkAYGDw.png) / [constellations](https://i.imgur.com/UcAdE7I.png) / [art](https://i.imgur.com/fg3L3dx.png).
    - See links for examples, buttons will correspond to directly skipping to that section. These can also be triggered directly via the command like `/character Hu Tao -art`.
    - Search is fuzzy, meaning `/character HT` *should* match Hu Tao as long as there's no other character being introduced that becomes a closer match.
    - Also available [on the site](https://hutaobot.moe/characters/hu-tao)

See `/help character` for more information.

- `/charstats <name> [level] A[ascension]`: Displays character stats at a certain level/ascension.
    - Without giving level/ascension: `/charstats Hu Tao` [picture](https://i.imgur.com/0kKlIcQ.png) 
    - With level: `/charstats Hu Tao 80` [picture](https://i.imgur.com/8XhBEaR.png)
    - With ascension: `/charstats Hu Tao A6` [picture](https://i.imgur.com/7iGChzb.png)
    - Search is also fuzzy, just like `/character`.
- `/charlevel <current level> [current level experience] [target level]`: Display experience (also in terms of experience books and 1★ weapons with minimal XP needed to farm) and mora required to *level* to a target level. [Examples](https://i.imgur.com/c4GluIl.png).
    - If no current experience is specified, 0 will be assumed.
    - If target level is not specified, both next ascension and max level (currently lv. 90) will be shown.
- `/books list`: Displays a list of [Talent Book availability per day](https://i.imgur.com/ONmc5fx.png)
- `/books calc <from> <target>`: Calculates how many books/other materials are needed for a certain set of talent upgrades (don't include +3 talent boosts from C3/C5) [Example](https://i.imgur.com/AIbSvS8.png)
- `/randomteams`: Create two teams to challenge yourself in the spiral abyss ;-) [Example](https://i.imgur.com/9Ol7OtA.png)

### Weapons
- `/weapon`: Displays [a list of all weapons](https://i.imgur.com/Yeqbcx9.png).
    - This command supports filtering such as weapon type (like `/weapon -polearm`) and/or stars (like `/weapon -5*`). [Example](https://i.imgur.com/PFGLJDO.png)
    - Available [on the site](https://hutaobot.moe/weapons)
- `/weapon <name>`: Displays weapon information, such as [basic info](https://i.imgur.com/nlj91gB.png) / [ascension cost and stats](https://i.imgur.com/GU7qA8E.png) / [refinements](https://i.imgur.com/XUIi5O8.png) / [lore](https://i.imgur.com/SU5f8N7.png) / [normal art](https://i.imgur.com/HXln4mt.png) / [2nd ascension art](https://i.imgur.com/TDFg1T0.png).
    - See links for examples, just as with `/character`, buttons will correspond to directly skipping to that section. These can also be triggered directly via the command like `/weapon Staff of Homa -art`.
    - Also available [on the site](https://hutaobot.moe/weapons/staff-of-homa)

See `/help weapon` for more information.
- `/weaponstats <name> [level] A[ascension]`: Displays [weapon stats at a certain level/ascension](https://i.imgur.com/oHVTcoA.png).
    - This command is very similar to `/charstats`, see that command for more information.
- `/weaponlevel <star> <current level> [current level experience] [target level]`: Display experience (also in terms of enhancement ores with minimal XP loss) and mora required to *level* to a target level. [Examples](https://i.imgur.com/1xB6zrn.png).
- `/weaponmats`: Displays a list of [Weapon Ascension Materials availability per day](https://i.imgur.com/fv3foO0.png)

### Artifacts
- `/artifact`: Displays [a list of all artifact sets](https://i.imgur.com/4QXGRCs.png). Can also be viewed [on the site](https://hutaobot.moe/artifacts)
- `/artifact <name>`: Displays artifact [set details](https://i.imgur.com/1Kq0PL7.png) and [specific items in the set](https://i.imgur.com/0yGJdnF.png). [Site version](https://hutaobot.moe/artifacts/shimenawas-reminiscence)
- `/artifact-levels <main stat> [stars]`: Displays [scaling of a main stat](https://i.imgur.com/y6yp6Or.png). Stars defaults to `5`, stat search is also fuzzy.

### News / Events
- `/news [lang]`: Displays [most recently posted news articles on the forum](https://i.imgur.com/jhjj1rS.png)
- `/news <id> [lang]`: Displays [a news article](https://i.imgur.com/cjaBydi.png), these most likely [have multiple pages](https://i.imgur.com/XV9MQxA.png).
- `/follow <list|add|remove> [type]`: [Add](https://i.imgur.com/PIXyiT5.png) or remove a certain events from the following list in the current channel (official forum posts and the twitter accounts, please refer to `/help follow` for an up to date list of supported languages). Or a [list](https://i.imgur.com/OhvclGx.png) of what the bot is following in your server.
    - Example of [forum news feed](https://i.imgur.com/0VfS4xp.png), [twitter feed](https://i.imgur.com/HnmV65Y.png) and [events](https://i.imgur.com/IYdeSsT.png) (there is also a variant without daily check-in reminders for events).
- `/events`: Check up on current and upcoming events. Examples: [list](https://i.imgur.com/yFOfidf.png), going to the left shows [current ones](https://i.imgur.com/x1UFBRP.png) while to the right are [future ones](https://i.imgur.com/1wjnsS3.png). Start/end/reminders for these can be followed with `/follow add events`. Hovering over the X time remaining/ago will show the times in your timezone. [The site](https://hutaobot.moe/events) will also show the times in your timezone.

### Other game information
- `/enemy [name]`: View [list of enemies](https://i.imgur.com/zJZob0L.png) or [check their resistances](https://i.imgur.com/pWy66nF.png). (Also [on site](https://hutaobot.moe/enemies))
- `/material [name]`: View [list of materials/food/specialties/etc.](https://i.imgur.com/Z1fm5j7.png) or [check information about a specific one](https://i.imgur.com/ggRwP60.png). (Also [on site](https://hutaobot.moe/materials))
- `/paimonsbargains`: Check [Paimon's Bargains schedule](https://i.imgur.com/a9wmck2.png)
- `/abyss [cycle: yyyy-mm-1/yyyy-mm-2] [floor]`: Displays current [abyss buff](https://i.imgur.com/taDR4uI.png) and [floors](https://i.imgur.com/DFYh7eH.png).
    - When a floor is provided, the embed will either just list that floor (for Corridor floors) or skip to it in the embed (for Moon Spire floors).
    - Old (and upcoming announced) floors/buffs can be accessed by providing the cycle, like: `/abyss 2020-11-2`
- `/banners`: View current/past event wishes
    - `/banners list [weapon|char]`: Quickly list all [weapon](https://i.imgur.com/bATrINi.png), [character](https://i.imgur.com/R18r6B3.png) or [both](https://i.imgur.com/XnXz6GO.png) event wishes
    - `/banners search <character or weapon name>`: Search for event wishes containing a specific [weapon](https://i.imgur.com/qFyxM7k.png)/[character](https://i.imgur.com/KP3lM7g.png)
    - `/banners view [id / page]`: View [more information about a specific or browse through them](https://i.imgur.com/lXVnFHZ.png)

### To help you
- `/guide [name]`: View some guides/routes. Use it without any name to get a [list of available categories](https://i.imgur.com/A47oAhy.png) and [guides](https://i.imgur.com/5l4vgLH.png) or [search for a particular guide](https://i.imgur.com/6qR8vhs.png). (Also available [on site](https://hutaobot.moe/guides))
- `/gachacalc <pulls> [pity] [guaranteed]`: Calculate chance to get a certain amount of constellations of a banner character in a certain amount of pulls. [Example](https://i.imgur.com/NZhbLQX.png).
    - For more information about the rates used, see [Statistical model for Genshin Impact's droprates](https://www.hoyolab.com/article/497840)
    - For graphs, use [the calculator on the site](https://hutaobot.moe/tools/gachacalc).
- `/time`: Check [current server times](https://i.imgur.com/yVXnh6v.png) as well as time until next daily/weekly reset.
- `/resin <current resin> [time until next resin in mm:ss]`: Check how long until your resin refills.
    - Example with just amount: `/resin 13` [picture](https://i.imgur.com/xBz9d77.png)
    - Example with time until next resin: `/resin 77 7:15` [picture](https://i.imgur.com/EmyVPwr.png)
- `/reminders`: List your current reminders. [Example of list](https://i.imgur.com/hw32SNK.png) - [Example of a reminder](https://i.imgur.com/WFTbRBQ.png)
- `/addreminder <name> in <duration>`: [Adds a reminder](https://i.imgur.com/TIfS4ZT.png)
    - Sometimes, the duration can be derived from the name. For example, running `/ar Parametric` will create a reminder about the Parametric Transformer in 6 days and 22 hours (reset time for that gadget). `/ar Ores` will create one in 3 days and `/ar Liyue Specialties` creates one for in 2 days.
    - `<duration>` needs to be something like `<amount> <unit>`, joined by pretty much anything spaces/commas/"and"/etc. Units can be abbreviated (`m` works for minutes, `d` for days, etc). Also supports `resin` as a unit of time. For example: `/ar Elite Boss in 36 resin`
- `/delreminder <id>`: [Deletes a reminder](https://i.imgur.com/QKgdJN1.png)
- `/notes`: View, create, edit or delete notes. Notes are either per category (when used in a guild) or per user (when used in DM's).
    - `notes list`: [List notes](https://i.imgur.com/bapxxwb.png) in the current context
    - `notes create <name>`: [Create a new note](https://i.imgur.com/2KXQyvO.png) in the current context (requires user to have Manage Messages permission)
    - `notes edit <id> <name>`:  [Edit a note](https://i.imgur.com/PFMNtwz.png) in the current context (requires user to have Manage Messages permission)
    - `notes remove <id>`: [Removes a note](https://i.imgur.com/M88p8iH.png) in the current context (requires user to have Manage Messages permission)

## Required Permissions
Please make sure the bot has these permissions inside the channels you want to use the bot. 
- **Send/Receive Messages**: Needed to actually receive and respond to commands when not using slash commands.
- **Attach Files** / **Embed Links**: Used to send embeds.
- **Use External Emoji**: Used in a handful of menu to indicate mora/materials/element/weapon type/...

**TIP**: You can check if these permissions are given with `/help`. In case one is missing, it'll be shown in a bold **NOTE** at the end of the message.

## Credits
- Thank you to Soul, Yukie, Maple and Jnight for providing the guides!
