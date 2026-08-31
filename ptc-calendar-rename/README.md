# PTC calendar rename

Renames the 60 per-class PTC booking calendars to `<Class Name> PTC`
(e.g. `P1 Grateful PTC`), so they are identifiable in Google Calendar.

Source of the class → calendar ID map: the `WebApp` sheet of
**PTC 2026 Merger**, read out of the `var CALENDAR_ID = "…"` line in each
row's Apps Script column.

## How to run

1. Open any Apps Script project (a standalone one is fine, or the one bound
   to the spreadsheet) and paste in `RenameCalendars.gs`.
2. **Services (+) → Google Calendar API → Add** (identifier stays `Calendar`).
3. Run `previewRenames()` first — it changes nothing and logs the current vs.
   target name for all 60 calendars.
4. Run `renameAllCalendars()` to apply. Accept the OAuth prompt.

## What each result means

| Action | Meaning |
| --- | --- |
| `RENAMED` | Calendar title changed for everyone (you have edit access). |
| `RENAMED_FOR_ME_ONLY` | No edit access, so a personal display name (`summaryOverride`) was set — only you see it. |
| `SUBSCRIBED` | Calendar was added to your calendar list so it shows in the sidebar. |
| `ALREADY_OK` | Name already correct. |
| `NOT_FOUND` | Calendar ID unreachable from the account running the script. |
| `FAILED` | Both the global rename and the personal name failed; see the Error column. |

Run it from the account that owns these calendars (they were created under
the school admin account) to get real renames rather than personal ones.

`undoRenameAllCalendars()` reverts the titles to the plain class name.
