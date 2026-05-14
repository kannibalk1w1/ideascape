# IdeaScape Tester Checklist

Use `release/IdeaScape-0.1.0-win.zip` for early Windows testing. Unzip it and run `IdeaScape.exe`.

## First Run

- Launch the portable app.
- Click `Sample` to load a ready-made idea map.
- Drag planet nodes and confirm the canvas does not pan instead.
- Right-click a node and try adding a connected node.
- Shift-drag a selection box around multiple nodes.

## Vault Flow

- Click `New vault` and choose an empty folder.
- Add or edit a few nodes.
- Click `Save`.
- Close and reopen the app, then use `Open vault` on the same folder.
- Confirm nodes, notes, colours, and settings return.

## Export Flow

- Click `PNG` and confirm an image appears in the vault exports.
- Exports are written to the vault's `exports` folder.
- Click `Replay`, use `Play`, `Prev`, `Next`, and the speed selector.
- Click `Replay GIF` and confirm a GIF appears in the vault exports.

## Options

- Open `Options`.
- Switch node appearance to `Tinted planets`.
- Save a palette, reload it, and apply it to existing nodes.
- Toggle connector pulses, ships, comets, and screensaver settings.

## Known Rough Edges

- The Windows build is unsigned and uses the default Electron icon.
- Windows SmartScreen may warn testers because this is an early unsigned build.
- The package currently targets Windows portable sharing only.
