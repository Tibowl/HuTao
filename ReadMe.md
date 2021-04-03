Hu Tao
=======
[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/A0A81MOVN)

Hu Tao is a Genshin Impact discord bot. An invite link for this bot can be found [here](https://discord.com/api/oauth2/authorize?client_id=826550363355086918&scope=bot&permissions=319552).

## Permissions Required
Please make sure the bot has these permissions inside the channels you want to use the bot. 
- **Send/Receive Messages**: Needed to actually receive and respond to commands.
- **Manage Messages**: Used to delete reactions of others after clicking them, improves user experience by making it easier to click on it again.
- **Attach Files** / **Embed Links**: Used to send embeds, as well as display forum links.
- **Add Reactions**: Used to add reactions on own messages that users can click on.
- **Use External Emoji**: Used in character/weapon menu to indicate mora/items/element/weapon type/...

**TIP**: You can check if these are given with `ht!help`. In case one is missing, it'll be shown in a bold **NOTE** at the end of the message.

## Commands
The bot command prefix is `ht!`. Help for a specific command can be retrieved via `ht!help <command>`.

Every reply to commands will include an ❌ reaction, users can click this reaction to remove the bot post. This allows users to clean up in case something wasn't relevant to the conversation/reduce spam.

To improve usability, most commands that search stuff are fuzzy search. This means you can make a typo, or shorten the heck out of their names. (As of time of writing, `glad` matches `Gladiator's Finale`, `CW` matches `Crimson Witch of Flames`, `amus` matches `Amos' Bow`)

### Characters
- `ht!character`: Displays [a list of all characters](https://i.imgur.com/TdUS701.png). 
    - This command supports filtering such as element type (like `ht!c -pyro`), weapon type (like `ht!c -polearm`) and/or stars (like `ht!c -5*`). [Example](https://i.imgur.com/OB6Fhz0.png)
- `ht!character <name>`: Displays character information, such as [basic data](https://i.imgur.com/mtKqXOR.png) / [meta data](https://i.imgur.com/tYZdMLM.png) / [ascensions + stats](https://i.imgur.com/COQQwbZ.png) / [talent costs](https://i.imgur.com/9FKcdom.png) / [talents](https://i.imgur.com/nJjAbhQ.png) / [passives](https://i.imgur.com/dFZ70km.png) / [constellations](https://i.imgur.com/GiXH0N8.png) / [art](https://i.imgur.com/DwcdR4R.png).
    - See links for examples, reactions will correspond to directly skipping to that section. These can also be triggered directly via the command like `ht!c Hu Tao -art`.
    - Search is fuzzy, meaning `ht!c HT` *should* match Hu Tao as long as there's no other character being introduced that becomes a closer match.

See `ht!help character` for more information.

- `ht!charstats <name> [level] A[ascension]`: Displays character stats at a certain level/ascension.
    - Without giving level/ascension: `ht!cs Hu Tao` [picture](https://i.imgur.com/KCYR046.png) 
    - With level: `ht!cs Hu Tao 80` [picture](https://i.imgur.com/1USGQSo.png)
    - With ascension: `ht!cs Hu Tao A6` [picture](https://i.imgur.com/Xc5EOnC.png)
    - Search is also fuzzy, just like `ht!character`.

### Weapons
- `ht!weapon`: Displays [a list of all weapons](https://i.imgur.com/HbQwOYV.png).
    - This command supports filtering such as weapon type (like `ht!w -polearm`) and/or stars (like `ht!w -5*`). [Example](https://i.imgur.com/1YFGmFf.png)
- `ht!weapon <name>`: Displays weapon information, such as [basic info](https://i.imgur.com/MF5GMtM.png) / [ascension cost and stats](https://i.imgur.com/xYDJPh1.png) / [refinements](https://i.imgur.com/ALTnNWg.png) / [lore](https://i.imgur.com/vLl4YfX.png) / [normal art](https://i.imgur.com/QBsKotI.png) / [2nd ascension art](https://i.imgur.com/iREPS5n.png).
    - See links for examples, just as with `ht!character`, reactions will correspond to directly skipping to that section. These can also be triggered directly via the command like `ht!w Staff of Homa -art`.

See `ht!help weapon` for more information.
- `ht!weaponstats <name> [level] A[ascension]`: Displays [weapon stats at a certain level/ascension](https://i.imgur.com/g8ZBKmD.png).
    - This command is very similar to `ht!charstats`, see that command for more information.

### Artifacts
- `ht!artifact`: Displays [a list of all artifact sets](https://i.imgur.com/zBrbFET.png).
- `ht!artifact <name>`: Displays artifact [set details](https://i.imgur.com/bnqPEA7.png) and [specific items in the set](https://i.imgur.com/8bRmk9K.png)
    - See links for examples.
- `ht!artifact-levels <main stat> [stars]`: Displays [scaling of a main stat](https://i.imgur.com/vWxcaNA.png). Stars defaults to `5`, stat search is also fuzzy.

### News
- `ht!news`: Displays [most recently posted news articles on the forum](https://i.imgur.com/PFAuOJQ.png)
- `ht!news <id>`: Displays [a news article](https://i.imgur.com/mEqXMyg.png), these most likely [have multiple pages](https://i.imgur.com/fxO8LZv.png).
- `ht!follow <list|add|remove> [type]`: [Add](https://i.imgur.com/XBMu09D.png) or remove a certain events from the following list in the current channel (official forum posts and the twitter accounts, please refer to `ht!help follow` for an up to date list). Or a [list](https://i.imgur.com/OhvclGx.png) of what the bot is following in your server.
    - Example of [forum news feed](https://i.imgur.com/0VfS4xp.png) and [twitter_en feed](https://i.imgur.com/HnmV65Y.png).

### Time
- `ht!time`: Check [current server times](https://i.imgur.com/CKSe9XT.png) as well as time until next daily/weekly reset.
- `ht!resin <current resin> [time until next resin in mm:ss]`: Check how long until your resin refills.
    - Example with just amount: `ht!resin 13` [picture](https://i.imgur.com/JBLeDUa.png)
    - Example with time until next resin: `ht!resin 77 7:15` [picture](https://i.imgur.com/kPRQfEb.png)


**TODO**: replace weapon & char image, char/weapon stats image