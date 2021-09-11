# Centra
A powerful moderation & utility bot for Revolt servers

## Invite
Centra is in development and an invite link is not yet public

## Features
- Straight-forward moderation tools (kicking, banning with optional duration**, warning with pardoning, muting*, message purging with filters*, slowmode* and lockdown*)
- Useful server utilities (serverinfo, userinfo, avatar, invites)
- Fully featured, persistent punishment history with reason* and duration* updating
- Configurable logging of all server events***
- Tags system with mention option and moderator-only functionality
- Auto-response system based on specified keyword matches*
- Configurable auto moderation (word filtering, message/emoji spam filtering, copypasta/assorted spam filtering, invite filtering) with optional automatic warning issuing*
- Fully configurable trigger/threshold system to issue punishments based on certain thresholds, ie. `mute at 3 warnings`, `ban at 3 mutes`*
- Highly customizable server configuration to allow granular control of all features****
- Granular per-role node-based permission, allowing specific control of features for each role**** 

#### Disclaimers:
\* = indicates feature coming soon  
\*\* = banning is functional, temp banning coming soon  
\*\*\* = not all server events are logged yet, and are not configurable yet  
\*\*\*\* = not all configuration features are present or complete  

## Development
Local hosting support is not supported yet, however it should be possible for development work. Clone the repo, fill in a `.env` and compile the TypeScript.