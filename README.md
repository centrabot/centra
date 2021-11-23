<div align='center'>
    <img src='https://i.imgur.com/FJe0DmY.png' width='100'>
    <h2>Centra</h2>
    <p>A powerful moderation & utility bot for Revolt servers</p>
</div>

## Invite
Centra is in development and an invite link is not yet public

## Features
- Straight-forward moderation tools
    - Kicking
    - Banning (with optional duration for temp bans*)
    - Warnings (with pardoning)
    - Muting (with optional duration for timed mutes)*
    - Message purging (with filters)*
    - Slowmode*
    - Sever/channel lockdown*
- Useful server utilities
    - Server/user/role/avatar information
    - Invite management
    - Reminders*
    - Polls*
- Fully featured, persistent punishment history with reason and duration* updating
- Configurable logging of all server events
    - Member joins, edits and leaves
    - Channel creation, edits and deletion
    - Server edits*
    - Role creation, edits and deletion*
- Tags system with mention option and moderator-only functionality
- Auto-response system based on specified keyword matches
- Private per-server user notes shared with all moderators to help keep notes on particular users
- Configurable auto moderation with automatic warning issuing
    - Word filtering
    - Spam filtering (message, emoji)*
    - Anti-hoisting*
    - Name normalisation (ie. `𝓣𝓱𝓪𝓽𝓣𝓸𝓷𝔂𝓫𝓸` to `ThatTonybo`)
    - Invite blocking*
    - Shortlink blocking (such as bit.ly, known scam links)
- Fully configurable trigger/threshold system to issue punishments based on certain thresholds*
    - Set thresholds such as: mute at 3 warnings, kick at 3 mutes
    - Hooks with auto moderation to provide full control over auto moderation
- Highly customizable server configuration to allow granular control of all features***
- Granular per-role node-based permission, allowing specific control of features for each role****

#### Disclaimers:
\* = indicates feature coming soon  
\*\* = banning is functional, temp banning coming soon  
\*\*\* = not all configuration features are present or complete  
\*\*\*\* = permissions are limited to role based mod and admin categories until the web dashboard can proceed, as such a granular system would be too complicated to complete, use or maintain through commands

## Development
Hosting a local version of Centra is currently only supported for development purposes. Local hosting will be supported once the bot is considered released and stable.

### Requirements
- Node.js v12 or above
- A MongoDB instance
- TypeScript (`npm install --global typescript`)
- Yarn (`npm install --global yarn`)

### Installation & Configuration
1. Clone the repo into a local directory: `git clone https://github.com/centrabot/centra.git`
2. Change into the directory and install dependencies: `yarn`
3. Create a database in your MongoDB instance with the collections `servers` and `reminders`
4. Create a copy of `.env.example` and name it `.env`, and fill in the fields with appropriate information

## Running
Before running the bot, the source code must be compiled to JavaScript. This can be done in two ways:
- Running `tsc` every time the source code changes
- Running `tsc --watch` in a separate console process to automatically compile new changes

Then, you can start the bot with node:
```bash
$ node dist
```

(As of right now, there is no separate development mode or variable, however it is coming soon)

## Credits
- [NinoDiscord/Nino](https://raw.githubusercontent.com/NinoDiscord/Nino) for the [shortlinks.json](https://github.com/NinoDiscord/Nino/blob/master/assets/shortlinks.json) (used with permission)
- [IonicaBizau/regex-emoji](https://github.com/IonicaBizau/regex-emoji)'s [:emoji: regex](https://github.com/IonicaBizau/regex-emoji/blob/master/test/index.js)

## License
(c) 2021 ThatTonybo  
Licensed under the MIT License