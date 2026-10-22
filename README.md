# Spore Multiplayer Mod — Version 1.0.1 + Creature-stage patch

**Cell stage, plus a stage-transition patch for the Creature stage.**

SporeCoop is a community co-op mod for the Steam edition of **SPORE: Galactic Adventures** on Windows. Upstream Version 1 covers the first stage, **Cell**. This fork adds the transition into the **Creature** stage; Tribal, Civilization and Space multiplayer are still not included.

The supported launch workflow runs two game windows on one PC with separate profiles. Remote LAN/VPN play and complete world transfer between computers are still unfinished.

## Creature-stage patch (this fork)

Upstream stops the co-op session at the end of the Cell stage: the mod intercepts the landfall transition and shows the version 1 ending screen instead. This fork changes that.

- The Cell stage completion is reported to the session server, the native landfall runs, and the land editor opens as it does in single-player.
- The client reports the stage it entered (`Simulator::IsCreatureGame()`) with a new `stageTransition` message. The server validates it, advances the shared stage and broadcasts it to both windows. The message is additive: the protocol stays at 10 and an unmodified 1.0.1 client still connects.
- The Cell stage completion became a fact about the shared world, so it survives a server restart. The shared stage is persisted the same way.
- The version 1 ending screen is still used when the mod runs without a cooperative session.

**Not implemented:** Creature-stage gameplay synchronisation. Two players still do not see each other's creature, a shared planet, shared herds or creature interactions; the Creature simulator stays local to each window. The land editor remains shared, because the editor is the design step for the creature.

**Compatibility, checked in both directions.** An unmodified 1.0.1 client talks to this server as before: the new message only adds a field to the state broadcast. A patched client talking to an **unpatched** 1.0.1 server gets `{"type":"error","message":"Unknown message type"}` back; the server rolls the protocol state back, keeps the session alive and the client shows the text in its status line instead of disconnecting. The co-op session then simply stays in the Cell stage, as it did before.

The patch was verified with the shipped client code and the real session server over TCP (`node tests/native-stage.test.mjs` moves a shared world from "cell" to "creature"), with the mod's own suites (148 protocol assertions, 119 native assertions), with a raw protocol probe against the patched and the unpatched server, and by loading the rebuilt DLL into two real game windows. It has **not** been verified by playing the Cell stage to its end in a running game, because that needs a full playthrough of the first stage.

## End of the first stage

Finish Cell and close the final History screen as usual. The mod intercepts the transition before landfall and the Creature editor, then shows a black screen:

> The first stage is complete!
>
> More stages are coming soon
>
> to the mod for SPORE on Steam.

The screen also identifies **Version 1 — Cell stage** and has a **Main menu** button. The mod uses localized text for Russian game installations. Both players receive completion; a player still viewing History can close it first. The owner requests a native Cell save; the invited player's campaign remains protected from saving. Normal History viewing during Cell does not end the game.

The Steam wording describes the target game and planned updates. This repository distributes the mod through GitHub releases.

## Included in Version 1

- Version 1.0.1: guest kills can drop eligible part fragments outside the owner's camera. Native part eligibility and loot probabilities are preserved.
- Version 1.0.1: the guest can finish reading final History after the owner leaves, then reach the ending screen.
- Invitations from the pause menu, with either window able to own the selected world.
- Shared Cell growth, DNA, parts, diet history, species name and creature editor.
- Player movement and appearance, NPC replication and shared object interactions.
- Guest entry at the shared growth level without replaying old unlock notifications.
- Corrected avatar respawn size, guest corpse breakup and replica scale/culling from Beta 15.
- Owner-only campaign saves, saved species names and guest exit when the owner leaves.
- A clear ending after Cell, with further native stage progression blocked in the co-op launch.

## Install and run

Requirements: Windows, the Steam Galactic Adventures executable supported by Spore ModAPI, and **SPORE ModAPI Launcher Kit**. This build targets the Steam March 2017 executable. Base SPORE alone is insufficient.

1. Close both SPORE windows.
2. Download and extract `spore-multiplayer-mod-v1.0.1-windows.zip` from [Releases](https://github.com/emerald194520350-alt/spore-multiplayer-mod/releases).
3. Run `Start-TwoSpore.ps1`. On an existing installation, the **SPORE Coop** desktop shortcut runs the same workflow.
4. Load a Cell world in one window and invite the other player through the pause menu. Accept in the second window.

**Update both DLLs and the server together. Version 1 uses protocol 10 and is incompatible with Beta 1–15.** The launcher installs the DLLs into both Launcher Kit directories and runs the matching server.

Version 1.0.1 keeps protocol 10 and the Version 1.0.0 server. Update both client DLLs to receive the fixes.

The second profile is `%AppData%\SporeCoop2`. The launcher prepares copies of the first profile's saved games and backs up the second profile before copying. Prepared copies are hidden from the second window's galaxy menu but remain available for invitations. The guest loader currently chooses the newest prepared campaign; use that campaign for the local session.

## Verification and remaining limits

DLL/server builds and automated checks pass. The tests cover network state, native message parsing, growth coordinates, editor synchronization, native size calculations, meat-table selection and the actual History-close callback from the installed executable. They do not constitute a full two-player playthrough.

Version 1.0.1 also executes the native loot selector with part pickups: it reproduces the owner-camera rejection and checks the fix for nine part types, already unlocked parts, missing parts and native pickup retention. This uses an isolated executable image with a substituted spawn sink.

The new fragment-drop fix, final ending screen, native save/return-to-menu flow and the Beta 15 gameplay fixes still need interactive verification in two windows. Visual layout has not been confirmed in a live game. Rare save states, tutorials and unusual editor transitions may still expose defects. Version 1 names the Cell-only release scope; it does not claim support for the rest of SPORE.

The Creature-stage patch of this fork was checked at the protocol level and with the real client code and the real session server, and the rebuilt DLL was loaded into two live game windows. The Cell stage has not been played through to its end in a running game, so the landfall, the land editor and the stage report still need one interactive confirmation. The patch moves the shared session into the Creature stage; it does not synchronise Creature-stage gameplay.

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for current changes and archived beta history.

## Build and test

Building requires Visual Studio C++ tools (MSVC v143 and Windows SDK), .NET Framework 4 and the included Spore ModAPI source. Node.js 22 or newer runs the server/source tests.

```powershell
.\Build-Probe.ps1 -LauncherRoot 'C:\ProgramData\SPORE ModAPI Launcher Kit'
.\Build-Server.ps1
.\Test-Server.ps1
.\Test-Native.ps1 -GameExecutable 'C:\Games\SPORE Collection\SporebinEP1\SporeApp.exe'
node .\tests\native-source.test.mjs
node .\tests\native-stage.test.mjs
```

`tests/native-stage.test.mjs` starts the real session server and two real native clients, completes the real invitation handshake and moves the shared world from the Cell stage into the Creature stage over TCP. It needs `bin\tests\NativeVisualTests.exe`, so run `Test-Native.ps1` first.

The engine tests map a private executable image without starting the game. Binaries, symbols, local saves and temporary files are excluded from Git. The release archive includes the runtime files and third-party notices.

For a bug report, provide `%TEMP%\SporeCoop.Probe.log`, the version and the last action in each window. `coopStatus` writes current diagnostic state; `coopJoin` and `coopSpawn` are diagnostic commands and are not required for ordinary invitations.

## License

The original SporeCoop source is covered by [LICENSE](LICENSE). Third-party components, including Spore ModAPI and its dependencies, retain their own licenses; the binary distribution includes their notices and license texts.

**Note on the upstream licence metadata.** The upstream `LICENSE` file is MIT, but the core sources of the project — `native/Probe.cpp`, `server/SessionServer.cs` and 18 other files — carry `SPDX-License-Identifier: GPL-3.0-or-later` headers, and the remaining sources carry no header at all. That inconsistency is in the upstream project and is left untouched here. The Creature-stage patch in this fork is released under **GPL-3.0-or-latter**, the stricter of the two, and its new file `tests/native-stage.test.mjs` carries that header.

SporeCoop is an independent community project, not affiliated with or endorsed by Electronic Arts, Maxis or Valve.
