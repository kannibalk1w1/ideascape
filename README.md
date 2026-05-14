# IdeaScape

IdeaScape is an experimental Electron app for building a living idea map: a physics-driven spider diagram with Markdown notes, Obsidian-style vault storage, replay exports, palettes, planet-like nodes, and ambient universe visuals.

The project is early and currently aimed at Windows tester builds.

## Current Features

- Add nodes by double-clicking or right-clicking the canvas.
- Add connected child/sibling nodes from a node context menu.
- Drag nodes to rearrange them or drop one node onto another to create a connection.
- Use floating or locked connections to mix organic movement with static mind-map islands.
- Switch connector styles, including solid, dashed, dotted, thick, faint, and arrows.
- Select multiple nodes with shift-drag.
- Open each node as a Markdown note with basic formatting tools and image import.
- Save/load idea maps as vault folders with Markdown notes and graph metadata.
- Recover nodes from Markdown notes if graph metadata is missing.
- Write richer note frontmatter so notes are easier to inspect outside IdeaScape.
- Import and save colour palettes.
- Save and apply visual themes for palette, universe, effects, orbit, screensaver, and node appearance settings.
- Use planet-style node skins, custom sprites, and descendant-based node evolution.
- Enable starscape, comets, connector pulses, idle orbit, and screensaver view.
- Replay the graph build-up and export replay GIFs.
- Export PNG and GIF snapshots.

## Requirements

- Windows
- Node.js and npm

## Development

Install dependencies:

```powershell
npm install
```

Run the app:

```powershell
npm start
```

Run tests:

```powershell
npm test
```

## Build A Windows Tester App

Create an unpacked local build:

```powershell
npm run pack
```

Run it from:

```text
release/win-unpacked/IdeaScape.exe
```

Create a shareable Windows ZIP:

```powershell
npm run dist:win
```

Share this file with testers:

```text
release/IdeaScape-0.1.0-win.zip
```

Testers can unzip it and run `IdeaScape.exe`. The build is currently unsigned, so Windows SmartScreen may show a warning.

## Tester Flow

See [TESTING.md](TESTING.md) for a short checklist. The quickest first test is:

1. Launch the portable app.
2. Click `Sample`.
3. Drag planet nodes.
4. Open `Replay` and try playback/export.
5. Create a vault, save, reopen, and check the graph returns.

## Project Structure

```text
main.js              Electron main process
renderer/            UI, graph, replay, editor, export, options
src/main/vault.js    Vault, assets, and export file operations
tests/               Jest tests for state, vault, palette, skins, package smoke
release/             Generated builds, ignored by git
```

## Notes

- The public repo does not include generated builds.
- Current packaging target is Windows portable only.
- The app still uses the default Electron icon.
- Obsidian compatibility is a goal, but graph metadata currently lives in IdeaScape-specific vault data.
