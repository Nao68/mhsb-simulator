# Codex Handoff

## Project

Workspace: `c:\Users\Owner\Desktop\nao\プログラム\MHSB`

This is a static HTML/CSS/JS Monster Hunter Rise: Sunbreak equipment and damage simulator.

No git repository was detected in this folder.

## Files

- `index.html`: main simulator shell
- `app.js`: main simulator logic
- `styles.css`: main simulator styles
- `missing-data.html`: manual missing-data editor shell
- `missing-data.js`: missing-data editor logic
- `missing-data.css`: missing-data editor styles
- `build_data.py`: generates `data.js` from JSON sources
- `data.js`: generated application data
- `mhrice.json`: source data
- `mhrice.full.backup.json`: large backup/source data

## Current Implementation Notes

Main app state and behavior are in `app.js`.

Important storage keys:

- `PRESET_STORAGE_KEY = "mhsb_presets_v1"`
- `LAST_STATE_KEY = "mhsb_last_state_v1"`
- `CHARM_STORAGE_KEY = "mhsb_charms_v1"`
- `MISSING_DATA_APPLIED_KEY = "mhsb_missing_data_applied_v1"`

Missing-data tool storage keys in `missing-data.js`:

- `DRAFT_STORAGE_KEY = "mhsb_missing_data_draft_v1"`
- `APPLIED_STORAGE_KEY = "mhsb_missing_data_applied_v1"`

Implemented areas seen in `app.js`:

- equipment selection
- weapon type filtering
- decoration selection
- rampage decoration selection
- weapon augment handling
- armor/charm augment-like editing
- charm save/update/delete
- preset save/update/apply/delete
- aggregate skill summary
- damage calculation
- applying manual missing-data overrides for weapon augments and bowguns

Implemented areas seen in `missing-data.js`:

- weapon augment override editor
- bowgun ammo/settings override editor
- draft persistence
- applied-data persistence for the main app
- JSON export/import
- saved override summary

## Verification Already Run

Node was installed by the user. User terminal showed:

- `node -v`: `v24.16.0`
- `npm -v`: `11.13.0`

The Codex shell PATH did not include Node yet, so use the full path if needed:

```powershell
& 'C:\Program Files\nodejs\node.exe' --check app.js
& 'C:\Program Files\nodejs\node.exe' --check missing-data.js
& 'C:\Program Files\nodejs\node.exe' --check data.js
```

All three checks passed.

Python check:

```powershell
python -m py_compile build_data.py
```

This passed.

## 2026-05-29 Update

User requested that the missing-data editor become easier for humans to use, with annotations explaining which input affects which main-app field.

Changes made:

- `missing-data.html`: added a hero-note bullet explaining that values reflect into the main app weapon area's "武器の傀異錬成" and "ボウガン詳細".
- `missing-data.js`: added `renderGuideList` and guide sections.
- `missing-data.js`: weapon augment editor now explains the save/apply flow and each table field's main-app effect.
- `missing-data.js`: bowgun editor now explains the save/apply flow and field mapping for reload, recoil, fluctuation, special ammo, rapid fire, and ammo rows.
- `missing-data.css`: added `.flow-guide` and `.cell-hint` styles.

Post-change checks:

```powershell
& 'C:\Program Files\nodejs\node.exe' --check missing-data.js
& 'C:\Program Files\nodejs\node.exe' --check app.js
```

Both passed.

## 2026-05-30 Update

User clarified that `slotBonus.*` should not appear on normal augment categories such as attack because those are separate from qurious slot unlock bonuses.

Changes made:

- `missing-data.js`: normal augment categories now render as simple rows: fixed `Lv` display, editable `Cost`, editable `値`.
- `missing-data.js`: `slotBonus.*` inputs now render only for the `slotUnlock` category.
- `missing-data.js`: `slotUnlock` rows now render fixed `Lv`, editable `Cost`, and editable slot unlock bonuses.
- `missing-data.js`: row editing now preserves the original option index after sorting by level.
- `missing-data.js`: adding a row now uses the next level number instead of always `1`.
- `missing-data.css`: added `.level-chip` and table width variants for simple vs slot-unlock augment tables.

Post-change checks:

```powershell
& 'C:\Program Files\nodejs\node.exe' --check missing-data.js
& 'C:\Program Files\nodejs\node.exe' --check app.js
```

Both passed.

## Encoding Note

Some Japanese text appeared mojibake when read without explicit UTF-8 in PowerShell. Reading with `Get-Content -Encoding UTF8` showed the text correctly. Do not assume the source files are actually corrupted just because default console output looks garbled.

## Likely Next Work

1. Run manual browser testing for `index.html`.
2. Run manual browser testing for `missing-data.html`.
3. Confirm localStorage workflows:
   - presets
   - last state
   - charms
   - missing-data draft
   - missing-data applied payload
4. Confirm that missing-data edits apply correctly in the main simulator:
   - weapon augment table overrides
   - bowgun settings/ammo overrides
5. Confirm damage calculation reflects selected equipment, skills, decorations, and augments.
6. Fix any browser console errors found during manual testing.

## Useful Commands

PowerShell:

```powershell
Get-ChildItem -Force
rg --files
rg -n "TODO|FIXME|console\.log|debugger" -g "*.html" -g "*.js" -g "*.css" -g "*.py"
& 'C:\Program Files\nodejs\node.exe' --check app.js
& 'C:\Program Files\nodejs\node.exe' --check missing-data.js
& 'C:\Program Files\nodejs\node.exe' --check data.js
python -m py_compile build_data.py
```

If `node` becomes available in PATH for the Codex process, plain `node --check ...` is fine.

## User Preference / Context

The user wants durable project notes because long chat sessions may hit conversation limits. Keep `WORKLOG.md` human-readable and `CODEX_HANDOFF.md` optimized for future Codex sessions.
