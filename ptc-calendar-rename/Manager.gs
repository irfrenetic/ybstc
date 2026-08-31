/**
 * PTC CALENDAR MANAGER
 *
 * Reads all 60 class calendars for PTC_DATE and gives you:
 *   - a dashboard: which calendars are live, slots taken, slots free
 *   - a booking list: every appointment, with duplicates flagged
 *   - deletion: tick a box in the sheet, run one function, slot is freed
 *
 * Needs Config.gs in the same project, and the Calendar advanced
 * service enabled (Services + -> Google Calendar API -> Add).
 *
 * TYPICAL USE
 *   1) refreshAll()                  build/refresh both sheets
 *   2) open the "PTC Bookings" sheet, look at the Flag column
 *   3) markDuplicatesForDeletion()   ticks every extra booking
 *      (or tick / untick the DELETE? boxes yourself)
 *   4) deleteMarkedBookings()        deletes exactly what is ticked
 */

// ============================================================
// DELETION SETTINGS
// ============================================================

/**
 * "all"  - Google Calendar emails the parent a cancellation
 * "none" - slot is freed silently (tell the parent yourself)
 */
var NOTIFY_ON_DELETE = "all";

/**
 * true  - deleteMarkedBookings() only reports what it would delete
 * false - it actually deletes
 */
var DELETE_DRY_RUN = false;


/**
 * Stop scanning after this long and write what was read so far.
 * Apps Script kills a run at 6 minutes with no output at all.
 */
var MAX_SCAN_MS = 4.5 * 60 * 1000;


// ============================================================
// MENU (only appears when this project is bound to a sheet)
// ============================================================

function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu("PTC Admin")
    .addItem("Refresh dashboard + bookings", "refreshAll")
    .addItem("Refresh dashboard only", "refreshDashboard")
    .addItem("Refresh bookings only", "refreshBookings")
    .addSeparator()
    .addItem("Tick all duplicates", "markDuplicatesForDeletion")
    .addItem("Delete ticked bookings", "deleteMarkedBookings")
    .addToUi();
}


// ============================================================
// MAIN ENTRY POINTS
// ============================================================

function refreshAll() {
  var data = readAllClasses_();
  writeDashboard_(data);
  writeBookings_(data);
  return summarize_(data);
}


function refreshDashboard() {
  var data = readAllClasses_();
  writeDashboard_(data);
  return summarize_(data);
}


function refreshBookings() {
  var data = readAllClasses_();
  writeBookings_(data);
  return summarize_(data);
}


// ============================================================
// READING THE CALENDARS
// ============================================================

/**
 * Shared scan context: the slot times the booking page offers,
 * plus the day window to query. Built once per run.
 */
function buildScanContext_() {

  var slots = generateSlots(PTC_DATE);
  var slotKeys = {};

  slots.forEach(function(s) {
    slotKeys[formatHHmm(s)] = true;
  });

  return {
    slots: slots,
    slotKeys: slotKeys,
    bounds: getDayBounds(PTC_DATE)
  };
}


/**
 * Reads ONE class calendar and returns its status plus every booking
 * on it. Used by the sheet tools and by the web app.
 */
function readClass_(row, ctx) {

  var entry = {
    className: row.className,
    calendarId: row.calendarId,
    calendarName: "",
    status: "OK",
    slotsTotal: ctx.slots.length,
    bookings: [],
    offSlot: 0,
    freeTimes: []
  };

  var cal;

  try {
    cal = CalendarApp.getCalendarById(row.calendarId);
  } catch (e) {
    cal = null;
    entry.status = "ERROR: " + e;
  }

  if (!cal) {

    if (entry.status === "OK") {
      entry.status = "NOT FOUND / NO ACCESS";
    }

    entry.slotsTotal = 0;
    return entry;
  }

  entry.calendarName = cal.getName();

  var events;

  try {
    events = cal.getEvents(ctx.bounds.start, ctx.bounds.end);
  } catch (e) {
    entry.status = "ERROR: " + e;
    return entry;
  }

  var takenKeys = {};

  events.forEach(function(ev) {

    if (ev.isAllDayEvent && ev.isAllDayEvent()) {
      return;
    }

    var booking = parseBooking_(ev, row.className);

    if (ctx.slotKeys[booking.time]) {
      takenKeys[booking.time] = true;
    } else {
      booking.flag = "OFF-SLOT";
      entry.offSlot++;
    }

    entry.bookings.push(booking);
  });

  flagDuplicates_(entry.bookings);

  ctx.slots.forEach(function(s) {
    var k = formatHHmm(s);
    if (!takenKeys[k]) {
      entry.freeTimes.push(k);
    }
  });

  entry.bookings.sort(function(a, b) {
    return a.start - b.start;
  });

  return entry;
}


/**
 * Reads every selected class calendar and returns one entry each.
 */
function readAllClasses_() {

  var classes = selectedClasses();
  var ctx = buildScanContext_();

  // Apps Script stops a run at 6 minutes. Leave a margin so the
  // sheets still get written with whatever was read.
  var deadline = Date.now() + MAX_SCAN_MS;

  var out = [];

  classes.forEach(function(row) {

    if (Date.now() > deadline) {
      out.push({
        className: row.className,
        calendarId: row.calendarId,
        calendarName: "",
        status: "NOT SCANNED (time limit - set CLASS_FILTER)",
        slotsTotal: 0,
        bookings: [],
        offSlot: 0,
        freeTimes: []
      });
      return;
    }

    out.push(readClass_(row, ctx));
  });

  return out;
}


/**
 * Turns one calendar event into a booking record.
 * Title is "PTC Appointment | <Class> | <Student>";
 * the parent details live in the description.
 */
function parseBooking_(ev, className) {

  var title = ev.getTitle() || "";
  var desc = ev.getDescription() || "";

  // The description may carry real newlines, literal "\n", or <br>.
  var plain = desc
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<[^>]+>/g, "");

  function field(label) {
    var m = plain.match(
      new RegExp(label + "\\s*:\\s*([^\\n]*)", "i")
    );
    return m ? m[1].trim() : "";
  }

  var studentFromTitle = "";
  var parts = title.split("|");

  if (parts.length >= 3) {
    studentFromTitle = parts[parts.length - 1].trim();
  }

  var guests = [];

  try {
    guests = ev.getGuestList().map(function(g) {
      return normalizeEmail_(g.getEmail());
    });
  } catch (e) {
    guests = [];
  }

  var email = normalizeEmail_(field("Email")) || guests[0] || "";

  return {
    className: className,
    time: formatHHmm(ev.getStartTime()),
    start: ev.getStartTime(),
    student: field("Student") || studentFromTitle,
    parent: field("Parent"),
    email: email,
    phone: field("Phone"),
    guests: guests.join(", "),
    created: ev.getDateCreated(),
    title: title,
    eventId: ev.getId(),
    flag: ""
  };
}


/**
 * Flags repeat bookings inside one class.
 *
 * The booking app already moves a parent's existing booking when they
 * rebook with the SAME email, so a real duplicate means either the same
 * student booked from two different emails, or the same email produced
 * two events. The earliest booking is kept, later ones are flagged.
 */
function flagDuplicates_(bookings) {

  var byStudent = {};
  var byEmail = {};

  var sorted = bookings.slice().sort(function(a, b) {
    return a.created - b.created;
  });

  sorted.forEach(function(b) {

    if (b.flag === "OFF-SLOT") {
      return;
    }

    var sKey = String(b.student || "").trim().toLowerCase();
    var eKey = b.email;

    if (sKey && byStudent[sKey]) {
      b.flag = "DUPLICATE student (also " +
               byStudent[sKey].time + ")";
      return;
    }

    if (eKey && byEmail[eKey]) {
      b.flag = "DUPLICATE email (also " +
               byEmail[eKey].time + ")";
      return;
    }

    if (sKey) byStudent[sKey] = b;
    if (eKey) byEmail[eKey] = b;
  });
}


// ============================================================
// DASHBOARD SHEET
// ============================================================

function writeDashboard_(data) {

  var ss = getOutputSpreadsheet_();
  var sheet = getOrCreateSheet_(ss, DASHBOARD_SHEET);

  sheet.clear();

  var s = summarize_(data);

  var header = [
    "Class Name",
    "Calendar Name",
    "Status",
    "Slots",
    "Booked",
    "Free",
    "Filled %",
    "Duplicates",
    "Off-slot",
    "Free Times",
    "Calendar ID"
  ];

  var rows = [
    ["PTC Dashboard - " + PTC_DATE, "", "", "", "", "", "", "", "", "", ""],
    [
      "Generated " +
        Utilities.formatDate(new Date(), TZ, "d MMM yyyy HH:mm"),
      "", "", "", "", "", "", "", "", "", ""
    ],
    [
      s.classesOk + " of " + s.classesTotal + " calendars live | " +
      s.booked + " of " + s.slots + " slots taken (" + s.filled + "%) | " +
      s.duplicates + " duplicates",
      "", "", "", "", "", "", "", "", "", ""
    ],
    ["", "", "", "", "", "", "", "", "", "", ""],
    header
  ];

  data.forEach(function(c) {

    var booked = c.bookings.length;
    var free = c.freeTimes.length;

    var dupes = c.bookings.filter(function(b) {
      return b.flag.indexOf("DUPLICATE") === 0;
    }).length;

    rows.push([
      c.className,
      c.calendarName,
      c.status,
      c.slotsTotal,
      booked,
      free,
      c.slotsTotal
        ? Math.round((booked / c.slotsTotal) * 100)
        : 0,
      dupes,
      c.offSlot,
      c.freeTimes.join(" "),
      c.calendarId
    ]);
  });

  sheet
    .getRange(1, 1, rows.length, header.length)
    .setValues(rows);

  sheet.getRange(1, 1).setFontSize(14).setFontWeight("bold");
  sheet.getRange(3, 1).setFontWeight("bold");

  sheet
    .getRange(5, 1, 1, header.length)
    .setFontWeight("bold")
    .setBackground("#dbeafe");

  sheet.setFrozenRows(5);

  // Red for full, green for classes with slots left.
  var body = sheet.getRange(6, 6, Math.max(data.length, 1), 1);
  body.setNumberFormat("0");

  sheet.autoResizeColumns(1, 9);
  sheet.setColumnWidth(10, 260);
  sheet.setColumnWidth(11, 220);
}


// ============================================================
// BOOKINGS SHEET
// ============================================================

function writeBookings_(data) {

  var ss = getOutputSpreadsheet_();
  var sheet = getOrCreateSheet_(ss, BOOKINGS_SHEET);

  sheet.clear();

  var header = [
    "DELETE?",
    "Class",
    "Time",
    "Student",
    "Parent",
    "Email",
    "Phone",
    "Flag",
    "Booked At",
    "Guests",
    "Calendar ID",
    "Event ID"
  ];

  var rows = [header];

  data.forEach(function(c) {

    c.bookings.forEach(function(b) {

        rows.push([
          false,
          b.className,
          b.time,
          b.student,
          b.parent,
          b.email,
          b.phone,
          b.flag,
          Utilities.formatDate(
            b.created, TZ, "d MMM HH:mm"
          ),
          b.guests,
          c.calendarId,
          b.eventId
      ]);
    });
  });

  sheet
    .getRange(1, 1, rows.length, header.length)
    .setValues(rows);

  sheet
    .getRange(1, 1, 1, header.length)
    .setFontWeight("bold")
    .setBackground("#dbeafe");

  sheet.setFrozenRows(1);

  if (rows.length > 1) {

    sheet
      .getRange(2, 1, rows.length - 1, 1)
      .insertCheckboxes();

    // Highlight duplicate rows, in one write.
    var colors = [];

    for (var i = 1; i < rows.length; i++) {

      var f = String(rows[i][7]);

      var color =
        f.indexOf("DUPLICATE") === 0
          ? "#fee2e2"
          : (f === "OFF-SLOT" ? "#fef3c7" : null);

      var line = [];

      for (var c = 0; c < header.length; c++) {
        line.push(color);
      }

      colors.push(line);
    }

    sheet
      .getRange(2, 1, colors.length, header.length)
      .setBackgrounds(colors);
  }

  sheet.autoResizeColumns(2, 9);
  sheet.setColumnWidth(11, 200);
  sheet.setColumnWidth(12, 200);
}


// ============================================================
// DELETING BOOKINGS
// ============================================================

/**
 * Ticks the DELETE? box on every row flagged as a duplicate.
 * Nothing is deleted - review the sheet, then run
 * deleteMarkedBookings().
 */
function markDuplicatesForDeletion() {

  var sheet = getOutputSpreadsheet_()
    .getSheetByName(BOOKINGS_SHEET);

  if (!sheet) {
    throw new Error(
      "Run refreshBookings() first."
    );
  }

  var last = sheet.getLastRow();

  if (last < 2) {
    return 0;
  }

  var flags = sheet.getRange(2, 8, last - 1, 1).getValues();
  var marks = sheet.getRange(2, 1, last - 1, 1).getValues();

  var count = 0;

  for (var i = 0; i < flags.length; i++) {

    if (String(flags[i][0]).indexOf("DUPLICATE") === 0) {
      marks[i][0] = true;
      count++;
    }
  }

  sheet.getRange(2, 1, last - 1, 1).setValues(marks);

  Logger.log("Ticked " + count + " duplicate booking(s).");

  return count;
}


/**
 * Deletes every booking whose DELETE? box is ticked.
 *
 * Each row is re-checked against the live event before deleting:
 * if the student or time no longer matches the sheet, the row is
 * skipped and marked SKIPPED (stale) instead.
 */
function deleteMarkedBookings() {

  var sheet = getOutputSpreadsheet_()
    .getSheetByName(BOOKINGS_SHEET);

  if (!sheet) {
    throw new Error(
      "Run refreshBookings() first."
    );
  }

  var last = sheet.getLastRow();

  if (last < 2) {
    return { deleted: 0, skipped: 0 };
  }

  var range = sheet.getRange(2, 1, last - 1, 12);
  var values = range.getValues();

  var deleted = 0;
  var skipped = 0;

  for (var i = 0; i < values.length; i++) {

    var row = values[i];

    if (row[0] !== true) {
      continue;
    }

    var calendarId = row[10];
    var eventId = row[11];
    var expectedTime = String(row[2]);
    var expectedStudent = String(row[3]);

    if (!calendarId || !eventId) {
      row[7] = "SKIPPED (no event id)";
      skipped++;
      continue;
    }

    var check = verifyEvent_(
      calendarId,
      eventId,
      expectedTime,
      expectedStudent
    );

    if (!check.ok) {
      row[0] = false;
      row[7] = "SKIPPED (" + check.reason + ")";
      skipped++;
      continue;
    }

    if (DELETE_DRY_RUN) {
      row[7] = "WOULD DELETE";
      continue;
    }

    try {

      removeEvent_(calendarId, eventId);

      row[0] = false;
      row[7] = "DELETED " +
        Utilities.formatDate(new Date(), TZ, "d MMM HH:mm");

      deleted++;

    } catch (e) {
      row[7] = "DELETE FAILED: " + e;
      skipped++;
    }
  }

  range.setValues(values);

  Logger.log(
    "Deleted " + deleted + ", skipped " + skipped +
    (DELETE_DRY_RUN ? " (DRY RUN)" : "")
  );

  return { deleted: deleted, skipped: skipped };
}


/**
 * Deletes one booking directly, without the sheet.
 * Handy from the editor: deleteBookingById("c_xxx@group...", "abc123@google.com")
 */
function deleteBookingById(calendarId, eventId) {

  removeEvent_(calendarId, eventId);

  Logger.log("Deleted " + eventId + " from " + calendarId);
}


/**
 * Confirms the live event still matches what the sheet shows,
 * so a stale sheet cannot delete somebody else's booking.
 */
function verifyEvent_(calendarId, eventId, expectedTime, expectedStudent) {

  var cal = CalendarApp.getCalendarById(calendarId);

  if (!cal) {
    return { ok: false, reason: "calendar not accessible" };
  }

  var ev;

  try {
    ev = cal.getEventById(eventId);
  } catch (e) {
    return { ok: false, reason: "lookup failed" };
  }

  if (!ev) {
    return { ok: false, reason: "already deleted" };
  }

  if (formatHHmm(ev.getStartTime()) !== expectedTime) {
    return { ok: false, reason: "time changed - refresh first" };
  }

  if (expectedStudent) {

    var title = String(ev.getTitle() || "").toLowerCase();
    var desc = String(ev.getDescription() || "").toLowerCase();
    var needle = expectedStudent.toLowerCase();

    if (
      title.indexOf(needle) === -1 &&
      desc.indexOf(needle) === -1
    ) {
      return { ok: false, reason: "student changed - refresh first" };
    }
  }

  return { ok: true };
}


/**
 * Removes an event, honouring NOTIFY_ON_DELETE.
 * Falls back to CalendarApp (which always notifies guests)
 * if the advanced Calendar service is not enabled.
 */
function removeEvent_(calendarId, eventId) {

  var bareId = String(eventId).split("@")[0];

  try {

    Calendar.Events.remove(
      calendarId,
      bareId,
      { sendUpdates: NOTIFY_ON_DELETE }
    );

    return;

  } catch (e) {

    var cal = CalendarApp.getCalendarById(calendarId);

    if (!cal) {
      throw e;
    }

    var ev = cal.getEventById(eventId);

    if (!ev) {
      throw e;
    }

    ev.deleteEvent();
  }
}


// ============================================================
// SUMMARY
// ============================================================

function summarize_(data) {

  var s = {
    classesTotal: data.length,
    classesOk: 0,
    slots: 0,
    booked: 0,
    free: 0,
    duplicates: 0,
    offSlot: 0,
    filled: 0
  };

  data.forEach(function(c) {

    if (c.status === "OK") {
      s.classesOk++;
    }

    s.slots += c.slotsTotal;
    s.booked += c.bookings.length;
    s.free += c.freeTimes.length;
    s.offSlot += c.offSlot;

    s.duplicates += c.bookings.filter(function(b) {
      return b.flag.indexOf("DUPLICATE") === 0;
    }).length;
  });

  s.filled = s.slots
    ? Math.round((s.booked / s.slots) * 100)
    : 0;

  Logger.log(
    s.classesOk + "/" + s.classesTotal + " calendars live | " +
    s.booked + "/" + s.slots + " slots taken (" + s.filled + "%) | " +
    s.free + " free | " +
    s.duplicates + " duplicates | " +
    s.offSlot + " off-slot events"
  );

  return s;
}
