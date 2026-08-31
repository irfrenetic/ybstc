/**
 * PTC ADMIN WEB APP - server side.
 *
 * Serves Admin.html and answers the page's calls. Needs Config.gs and
 * Manager.gs in the same project.
 *
 * DEPLOY
 *   Deploy > New deployment > Web app
 *     Execute as:     Me
 *     Who has access: Only myself   (see the note below)
 *
 * ACCESS: the page can delete bookings, so keep it on "Only myself",
 * or "Anyone with Google account" ONLY together with ADMIN_EMAILS below.
 */

// ============================================================
// ACCESS CONTROL
// ============================================================

/**
 * Leave empty to allow whoever the deployment already allows.
 * Otherwise only these addresses may open the page or delete anything.
 * Example: ["you@tzuchi.sch.id", "admin@tzuchi.sch.id"]
 */
var ADMIN_EMAILS = [];


function doGet() {

  if (!isAdmin_()) {
    return HtmlService.createHtmlOutput(
      "<p style='font:15px system-ui;padding:24px'>" +
      "Not authorised for the PTC admin page.</p>"
    );
  }

  return HtmlService
    .createTemplateFromFile("Admin")
    .evaluate()
    .setTitle("PTC Admin")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1"
    );
}


function isAdmin_() {

  if (!ADMIN_EMAILS.length) {
    return true;
  }

  var me = normalizeEmail_(Session.getActiveUser().getEmail());

  return ADMIN_EMAILS.some(function(e) {
    return normalizeEmail_(e) === me;
  });
}


function requireAdmin_() {
  if (!isAdmin_()) {
    throw new Error("Not authorised.");
  }
}


// ============================================================
// DATA FOR THE PAGE
// ============================================================

/**
 * The class list and conference settings, returned immediately so the
 * page can render its shell before any calendar is read.
 */
function webGetClasses() {

  requireAdmin_();

  return {
    date: PTC_DATE,
    dateHuman: Utilities.formatDate(
      makeLocalDate(PTC_DATE, 12, 0),
      TZ,
      "EEEE, d MMMM yyyy"
    ),
    slotMinutes: SLOT_MINUTES,
    slotsPerClass: generateSlots(PTC_DATE).length,
    classes: selectedClasses().map(function(row) {
      return {
        className: row.className,
        calendarId: row.calendarId
      };
    })
  };
}


/**
 * Reads one class calendar. The page calls this once per class, a few at
 * a time, so the dashboard fills in progressively and no single request
 * has to carry all 60 calendars.
 */
function webGetClass(className) {

  requireAdmin_();

  var row = findClassRow_(className);
  var entry = readClass_(row, buildScanContext_());

  return serializeClass_(entry);
}


/**
 * Deletes one booking after re-checking it against the live event.
 * Returns the class's refreshed state so the page stays accurate.
 */
function webDeleteBooking(req) {

  requireAdmin_();

  var row = findClassRow_(req.className);

  if (row.calendarId !== req.calendarId) {
    throw new Error("Calendar mismatch for " + req.className + ".");
  }

  var check = verifyEvent_(
    req.calendarId,
    req.eventId,
    req.time,
    req.student
  );

  if (!check.ok) {
    return {
      ok: false,
      message: "Not deleted: " + check.reason + ".",
      klass: serializeClass_(
        readClass_(row, buildScanContext_())
      )
    };
  }

  var previous = NOTIFY_ON_DELETE;

  try {

    NOTIFY_ON_DELETE = req.notify ? "all" : "none";

    removeEvent_(req.calendarId, req.eventId);

  } finally {
    NOTIFY_ON_DELETE = previous;
  }

  return {
    ok: true,
    message:
      (req.student || "Booking") + " at " + req.time +
      " deleted" +
      (req.notify ? " and the parent was notified." : "."),
    klass: serializeClass_(
      readClass_(row, buildScanContext_())
    )
  };
}


/**
 * Writes the current state to the dashboard and bookings sheets,
 * and returns the spreadsheet URL.
 */
function webExportToSheet() {

  requireAdmin_();

  var data = readAllClasses_();

  writeDashboard_(data);
  writeBookings_(data);

  return {
    url: getOutputSpreadsheet_().getUrl(),
    summary: summarize_(data)
  };
}


// ============================================================
// HELPERS
// ============================================================

function findClassRow_(className) {

  var match = CLASS_CALENDARS.filter(function(row) {
    return row.className === className;
  })[0];

  if (!match) {
    throw new Error("Unknown class: " + className);
  }

  return match;
}


/**
 * Dates cannot cross to the page reliably, so everything is
 * pre-formatted here.
 */
function serializeClass_(entry) {

  var duplicates = 0;

  var bookings = entry.bookings.map(function(b) {

    if (b.flag.indexOf("DUPLICATE") === 0) {
      duplicates++;
    }

    return {
      time: b.time,
      student: b.student,
      parent: b.parent,
      email: b.email,
      phone: b.phone,
      flag: b.flag,
      created: Utilities.formatDate(
        b.created, TZ, "d MMM, HH:mm"
      ),
      eventId: b.eventId
    };
  });

  return {
    className: entry.className,
    calendarId: entry.calendarId,
    calendarName: entry.calendarName,
    status: entry.status,
    slotsTotal: entry.slotsTotal,
    booked: bookings.length,
    free: entry.freeTimes.length,
    duplicates: duplicates,
    offSlot: entry.offSlot,
    freeTimes: entry.freeTimes,
    bookings: bookings
  };
}
