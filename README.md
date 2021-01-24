# KT-Web
## [Play now!](https://thedarksid3r.github.io/kt-web)
A version of Keep Talking and Nobody Explodes recreated using (mostly) manual SVGs and JavaScript.

---

<br/>

## How does it work?

To start a round, there are three options. You can use [Free Play](#freeplay), [select a pre-existing mission](#selecting), [create your own mission](#3creating), or use the [Dynamic Mission Generator (DMG)](#dmg).

While in-game, you can select the Menu button in the top-left to open the menu dossier. From here, you can tweak settings or quit the bomb. The poster on the back wall of the gameplay room displays current mission details.

<br/>

# 1. Free Play {#freeplay}

To use vanilla Free Play, select the "Free Play" option from the setup menu.

<br/>

# 2. Selecting a mission {#selecting}

To start a round using an existing mission, select "Missions" from the setup menu. Select a table of contents (if no extra missions are installed, you'll only have access to the vanilla missions) and select a mission from the list.

Once selected, the mission's information will be displayed as well as its leaderboard if you've completed the mission, and you can select START to start the round.

<br/>

# 3. Creating a mission {#creating}

To create a mission, select "[Mission Creator](https://thedarksid3r.github.io/kt-web/missions.html)" from the setup menu. The mission creator allows you to create a table of contents with missions just like the original KTaNE modkit.

<br/>

# 4. Dynamic Mission Generator (DMG) {#dmg}

This DMG works exactly like the [original DMG mod](https://steamcommunity.com/sharedfiles/filedetails/?id=1633427044). To use the DMG, select "Dynamic Mission Generator" from the setup menu. Type a mission string and select "Start" to start the round using the mission string.

## Usage

A mission string consists of a combination of the following tokens, separated by spaces.

* `[number]*[module ID]` – adds the specified number of the specified type of module. For compatibility, `;` may be used in place of `*`. The number and `*` may be omitted to add a single module. If the module ID contains spaces, enclose it in quotation marks. If you specify multiple module IDs separated with `,` or `+`, modules will be selected at random from those types. The following special tokens may be used in place of a module ID list:
  * `ALL_SOLVABLE` – any regular module
  * `ALL_NEEDY` – any needy module
  * `ALL_VANILLA` – any vanilla regular module
  * `ALL_MODS` – any mod regular module
  * `ALL_VANILLA_NEEDY` – any vanilla needy module
  * `ALL_MODS_NEEDY` – any mod needy module
* `[h]:[m]:[s]` – sets the starting bomb time. The hours may be omitted. The default is 2 minutes per regular module.
* `[number]X` – sets the strike limit. The default is 1 per 12 regular modules with a minimum of 3.
* `needyactivationtime:[seconds]` – sets the time before all needy modules activate. The default is 90 seconds.
* `widgets:[number]` – sets the number of random widgets. The default is 5.
* `nopacing` – disables pacing events.
* `frontonly` – forces all modules to be on the face with the timer where possible.

Starting to type certain tokens will cause a list of potential completions to appear. You can quickly insert one of these options by clicking it or pressing Tab.