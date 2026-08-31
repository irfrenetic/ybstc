/**
 * Rename the 60 PTC booking calendars to "<Class Name> PTC".
 *
 * SETUP (once, in the Apps Script editor):
 *   1) Add Config.gs to the same project - it holds the class -> calendar map.
 *   2) Services (+) -> Google Calendar API -> Add.  The identifier must stay "Calendar".
 *   3) Run renameAllCalendars() and accept the OAuth prompt.
 *
 * WHAT IT DOES, per calendar:
 *   a) Tries a real rename (Calendar.Calendars.patch -> summary). This changes the
 *      calendar title for EVERYONE, and needs owner/"make changes" access.
 *   b) If that is not permitted, falls back to a personal display name
 *      (Calendar.CalendarList.patch -> summaryOverride). Only you see that name.
 *   c) Subscribes the calendar into your calendar list if it is not there yet,
 *      so it actually shows up in your Google Calendar sidebar.
 *
 * Set DRY_RUN = true first to preview without changing anything.
 */

// ============================================================
// CONFIG
// ============================================================

var DRY_RUN = false;

// Final name = className + NAME_SUFFIX, e.g. "P1 Grateful PTC".
var NAME_SUFFIX = " PTC";

// If true, the calendar is also added to your calendar list when missing.
var SUBSCRIBE_IF_MISSING = true;

// If true and the global rename is refused, set a personal display name instead.
var FALLBACK_TO_PERSONAL_NAME = true;


// ============================================================
// CLASS -> CALENDAR ID
// The map now lives in Config.gs, shared with Manager.gs.
// ============================================================


// ============================================================
// MAIN
// ============================================================

function renameAllCalendars() {

  var classes = selectedClasses();

  var results = [];

  for (var i = 0; i < classes.length; i++) {

    var row = classes[i];
    var target = row.className + NAME_SUFFIX;

    results.push(
      renameOne(
        row.className,
        row.calendarId,
        target
      )
    );
  }

  logResults(results);

  return results;
}


/**
 * Renames a single calendar and returns a result row.
 */
function renameOne(className, calendarId, targetName) {

  var result = {
    className: className,
    calendarId: calendarId,
    targetName: targetName,
    before: "",
    action: "",
    error: ""
  };

  // ---- 1) Read current state -------------------------------

  var current;

  try {
    current = Calendar.Calendars.get(calendarId);
    result.before = current.summary || "";
  } catch (e) {
    result.action = "NOT_FOUND";
    result.error = String(e);
    return result;
  }

  // ---- 2) Already correct? ---------------------------------

  if (result.before === targetName) {
    result.action = "ALREADY_OK";
    ensureSubscribed(calendarId, result);
    return result;
  }

  if (DRY_RUN) {
    result.action = "DRY_RUN_WOULD_RENAME";
    return result;
  }

  // ---- 3) Global rename ------------------------------------

  try {

    Calendar.Calendars.patch(
      { summary: targetName },
      calendarId
    );

    result.action = "RENAMED";

  } catch (e) {

    result.error = String(e);

    if (!FALLBACK_TO_PERSONAL_NAME) {
      result.action = "FAILED";
      return result;
    }

    // ---- 4) Personal display name only ---------------------

    try {

      ensureSubscribed(calendarId, result);

      Calendar.CalendarList.patch(
        { summaryOverride: targetName },
        calendarId
      );

      result.action = "RENAMED_FOR_ME_ONLY";

    } catch (e2) {
      result.action = "FAILED";
      result.error = result.error + " | " + String(e2);
      return result;
    }
  }

  ensureSubscribed(calendarId, result);

  return result;
}


/**
 * Adds the calendar to your own calendar list if it is not there yet,
 * so it is visible in the Google Calendar UI.
 */
function ensureSubscribed(calendarId, result) {

  if (!SUBSCRIBE_IF_MISSING || DRY_RUN) {
    return;
  }

  try {
    Calendar.CalendarList.get(calendarId);
    return; // already subscribed
  } catch (e) {
    // not in the list yet - fall through and insert
  }

  try {

    Calendar.CalendarList.insert({ id: calendarId });

    result.action = result.action
      ? result.action + "+SUBSCRIBED"
      : "SUBSCRIBED";

  } catch (e) {
    result.error = result.error
      ? result.error + " | subscribe: " + String(e)
      : "subscribe: " + String(e);
  }
}


// ============================================================
// PREVIEW / REPORTING
// ============================================================

/**
 * Safe preview: logs what would change, touches nothing.
 */
function previewRenames() {

  var keep = DRY_RUN;
  DRY_RUN = true;

  try {
    return renameAllCalendars();
  } finally {
    DRY_RUN = keep;
  }
}


/**
 * Writes results to the execution log, and to a "Rename Log" sheet
 * when this script is bound to a spreadsheet.
 */
function logResults(results) {

  var rows = [[
    "Class Name",
    "Calendar ID",
    "Name Before",
    "Name After",
    "Action",
    "Error"
  ]];

  results.forEach(function(r) {
    rows.push([
      r.className,
      r.calendarId,
      r.before,
      r.targetName,
      r.action,
      r.error
    ]);

    Logger.log(
      r.action + " | " + r.className + " | " +
      r.before + " -> " + r.targetName +
      (r.error ? " | " + r.error : "")
    );
  });

  var sheet = getOrCreateSheet_(
    getOutputSpreadsheet_(),
    "Rename Log"
  );

  sheet.clear();

  sheet
    .getRange(1, 1, rows.length, rows[0].length)
    .setValues(rows);

  sheet.setFrozenRows(1);
}


// ============================================================
// UNDO HELPERS
// ============================================================

/**
 * Reverts the calendar titles back to the plain class name
 * (drops NAME_SUFFIX). Only affects calendars you can edit.
 */
function undoRenameAllCalendars() {

  var results = [];

  selectedClasses().forEach(function(row) {
    results.push(
      renameOne(
        row.className,
        row.calendarId,
        row.className
      )
    );
  });

  logResults(results);

  return results;
}
