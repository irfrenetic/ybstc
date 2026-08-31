# PTC calendar tools

Apps Script tools for the 60 per-class PTC booking calendars
(conference day `2026-09-25`, 15-minute slots, 07:30–12:00 and 13:00–15:00
= **26 slots per class**).

| File | What it does |
| --- | --- |
| `Config.gs` | Shared settings + the class → calendar ID map. Required by all of them. |
| `RenameCalendars.gs` | Renames every calendar from `PTC Day` to `<Class Name> PTC`. |
| `Manager.gs` | Reads the calendars; writes the dashboard + booking sheets; deletes bookings. |
| `WebApp.gs` | Serves the admin page and answers its calls. |
| `Admin.html` | The admin page itself: live dashboard, search, one-click delete. |

The class → calendar ID map was read out of the `var CALENDAR_ID = "…"` line
in each row of the `WebApp` sheet in **PTC 2026 Merger**.

## Setup (once)

1. Sign in as the account that owns the calendars (the School profile).
2. [script.google.com](https://script.google.com) → **New project**.
3. Add the files and paste them in: `Config.gs`, `Manager.gs`, `WebApp.gs`,
   `RenameCalendars.gs`, and an **HTML** file named exactly `Admin`
   (File → New → HTML file → `Admin`) for `Admin.html`.
4. **Services (+) → Google Calendar API → Add** (identifier stays `Calendar`).
5. Run `refreshAll()` once and accept the OAuth prompt.

`Config.gs` holds the map, so the calendar IDs are written down once and
every tool stays in sync. Keep all the files in one project.

## The admin page (recommended)

Deploy → **New deployment** → **Web app**

- Execute as: **Me**
- Who has access: **Only myself**

The page can delete bookings, so keep it private. To let a colleague in,
set `ADMIN_EMAILS` in `WebApp.gs` to the addresses allowed, then widen the
deployment to *Anyone with a Google account* — anyone not on that list gets
turned away.

What the page gives you:

- **Live totals** — calendars reachable, slots taken across all classes and
  as a percentage, slots still free, duplicates found.
- **A card per class** — fill bar, `18 / 26`, and a red badge when that class
  has repeat bookings. Click a card to open its appointment list.
- **Filters** — by grade (P1…P6), *Duplicates only*, and a search box that
  matches student, parent, or email across every class you have loaded.
- **Delete** — a button on each booking. It asks for confirmation, shows who
  is being cancelled, and lets you choose whether Google emails the parent.
  The slot is free again the moment it returns.
- **Export to Sheet** — writes the same data into the two sheets below.

Classes are read a few at a time, so the dashboard fills in as results
arrive rather than making you wait for all 60 calendars in one request.

## Renaming

| Function | Effect |
| --- | --- |
| `previewRenames()` | Logs current → target name. Changes nothing. |
| `renameAllCalendars()` | Renames to `<Class Name> PTC`. |
| `undoRenameAllCalendars()` | Reverts to the plain class name. |

Result codes: `RENAMED` (changed for everyone), `RENAMED_FOR_ME_ONLY`
(no edit access, personal display name only), `SUBSCRIBED`, `ALREADY_OK`,
`NOT_FOUND`, `FAILED`.

## The spreadsheet view

Use this for bulk work — deleting twenty duplicates in one pass, or keeping
a record. `refreshAll()` reads all 60 calendars and writes two sheets. With no bound
spreadsheet it creates **PTC Control Panel** and logs the URL; that file is
remembered for later runs.

**PTC Dashboard** — one row per class:

Class · Calendar Name · Status · Slots · Booked · Free · Filled % ·
Duplicates · Off-slot · Free Times · Calendar ID

The header line totals it up: how many calendars are live, how many of the
1 560 slots are taken, and how many duplicates exist school-wide.

**PTC Bookings** — one row per appointment:

DELETE? · Class · Time · Student · Parent · Email · Phone · Flag ·
Booked At · Guests · Calendar ID · Event ID

Duplicate rows are shaded red, off-slot events amber.

### Deleting a double booking

1. `refreshBookings()` — always refresh right before deleting.
2. Either tick the **DELETE?** boxes yourself, or run
   `markDuplicatesForDeletion()` to tick every flagged duplicate.
3. Review the ticks.
4. `deleteMarkedBookings()`.

Each row is re-checked against the live event first. If the time or student
no longer matches the sheet, the row is skipped and marked
`SKIPPED (time changed - refresh first)` rather than deleted — a stale sheet
cannot delete the wrong parent's slot.

`deleteBookingById(calendarId, eventId)` deletes a single booking directly.

Settings in `Manager.gs`:

- `NOTIFY_ON_DELETE` — `"all"` emails the parent a cancellation, `"none"`
  frees the slot silently.
- `DELETE_DRY_RUN` — `true` marks rows `WOULD DELETE` without deleting.
- `CLASS_FILTER` (in `Config.gs`) — set to e.g. `"P1"` to work one grade at
  a time. A full 60-calendar scan stops at 4.5 minutes and marks anything
  unread `NOT SCANNED`; the filter is the fix.

### How duplicates are detected

The booking web app already *moves* a parent's booking when they rebook with
the same email, so a real duplicate means either:

- the same **student** was booked from two different email addresses, or
- the same **email** somehow produced two events.

Within a class the earliest booking is kept and later ones are flagged with
the time of the one they duplicate. Siblings in different classes are not
flagged — that is a legitimate pair of bookings.
