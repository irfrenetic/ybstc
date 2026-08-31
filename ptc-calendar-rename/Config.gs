/**
 * SHARED CONFIG for the PTC calendar tools.
 *
 * Paste this file into the Apps Script project together with
 * RenameCalendars.gs and Manager.gs. All three share this one map,
 * so a calendar ID is only ever written down once.
 *
 * SETUP (once):
 *   Services (+) -> Google Calendar API -> Add (identifier stays "Calendar").
 */

// ============================================================
// CONFERENCE SETTINGS
// These must match the per-class booking scripts.
// ============================================================

var PTC_DATE = "2026-09-25";
var TZ = "Asia/Jakarta";

var DAY_START   = { h: 7,  m: 30 };
var LUNCH_START = { h: 12, m: 0  };
var LUNCH_END   = { h: 13, m: 0  };
var DAY_END     = { h: 15, m: 0  };

var SLOT_MINUTES = 15;

// Title prefix the booking web app writes:
// "PTC Appointment | <Class> | <Student>"
var BOOKING_TITLE_PREFIX = "PTC Appointment";


// ============================================================
// OUTPUT SPREADSHEET
// Leave "" to auto-use the bound spreadsheet, or auto-create one
// named below and remember it in Script Properties.
// ============================================================

var OUTPUT_SPREADSHEET_ID = "";
var OUTPUT_SPREADSHEET_NAME = "PTC Control Panel";

var DASHBOARD_SHEET = "PTC Dashboard";
var BOOKINGS_SHEET  = "PTC Bookings";


// ============================================================
// CLASS FILTER
// "" = all 60 classes. Set e.g. "P1" to work on one grade only,
// which keeps each run well under the 6-minute limit.
// ============================================================

var CLASS_FILTER = "";


// ============================================================
// CLASS -> CALENDAR ID  (from "PTC 2026 Merger", WebApp sheet)
// ============================================================

var CLASS_CALENDARS = [
  { className: "P1 Grateful",     calendarId: "c_5395cd5244f113e85353ce157d69afa1b7378beaa6c72cc8b6b6b608da166f0d@group.calendar.google.com" },
  { className: "P1 Respect",      calendarId: "c_a53a1100e82cd29257a18136dc93dfef3362b1f5458076b60074ea407b6abb26@group.calendar.google.com" },
  { className: "P1 Love",         calendarId: "c_19a658d4af550578d4f7188c1e19190acb30d82933ee284be8c4f98361a74aa0@group.calendar.google.com" },
  { className: "P1 Joy",          calendarId: "c_1113abd9b6a54e4692f174a3fcb36794144ff69a71dbf3f480f42634d1f47b8f@group.calendar.google.com" },
  { className: "P1 Compassion",   calendarId: "c_8f3c03ba7c17c323c6ca7f6c68c920927440896464360cc8f1da05942b87bb58@group.calendar.google.com" },
  { className: "P1 Harmony",      calendarId: "c_71395742cc7c2d768ca38ca82c110b1138436b27a58273a651210c3fce3de136@group.calendar.google.com" },
  { className: "P1 Kindness",     calendarId: "c_3d3be5bb910dfd465aa1b4effceb0f3dc329e89f19306cea9aa8044fdda87b53@group.calendar.google.com" },
  { className: "P1 Honesty",      calendarId: "c_8052ff2dc9f3740e2f2f14603329c061dbdcac3f6ae646172bc12be0ce6cf1b3@group.calendar.google.com" },
  { className: "P1 Integrity",    calendarId: "c_36f6ce6d017dcf1665a716bf1ab896df26651e71e93ef2f0910507e6101ede22@group.calendar.google.com" },
  { className: "P1 Wisdom",       calendarId: "c_f089c57e3fae2167a5268c3013f11525f1cd9d0b177647257f69c6416c85f408@group.calendar.google.com" },
  { className: "P2 Grateful",     calendarId: "c_c8f9a0a4795cec61ac042b1b6c3f1197fb9a36c437abf04904dc1ad866f24532@group.calendar.google.com" },
  { className: "P2 Respect",      calendarId: "c_4b1ca26c01d5438dbf8e7c2874e185b1a4dd909a67c54578e72718da99c8a313@group.calendar.google.com" },
  { className: "P2 Love",         calendarId: "c_92bcaef4df361021355372a568d9e8a9b0beff13b4e2c148a7260207db6eddbd@group.calendar.google.com" },
  { className: "P2 Joy",          calendarId: "c_48b16c7acd5f5062d0d01dcc37676113ca88d86207478bcbbbfe06bccd2a1f23@group.calendar.google.com" },
  { className: "P2 Compassion",   calendarId: "c_ce73594d1253ce8fdb0c8eeaae90f43aaca73930ebe7babd812fa8bef7594749@group.calendar.google.com" },
  { className: "P2 Harmony",      calendarId: "c_96e619bb7345a06360c42bc0633673af1fe7828bb5f4646d62ca1af5c417b812@group.calendar.google.com" },
  { className: "P2 Kindness",     calendarId: "c_1f7a189318cb679ffafdfe052892c62aed0af03530a86480896da42222d31565@group.calendar.google.com" },
  { className: "P2 Honesty",      calendarId: "c_f15af39cf06567c1703f2af04f0b846fb6b73e174fd1f78dbbf90c4b23a43207@group.calendar.google.com" },
  { className: "P2 Integrity",    calendarId: "c_ff86067428139630327457ad8930db89573472b0f7f79e87e3fb81c2e260afbe@group.calendar.google.com" },
  { className: "P2 Wisdom",       calendarId: "c_bd0b28c7dfacde7d41deb40da97e2b73ce7d182bcbb998ccfa64575bb3147698@group.calendar.google.com" },
  { className: "P3 Grateful",     calendarId: "c_cc0ca2e67be0917a306e9acddeee7f1ad5add8788dadc9697f1b6e6700f6ea22@group.calendar.google.com" },
  { className: "P3 Respect",      calendarId: "c_cd3b03263133e9e65ae055ffcb129c4692950a1f13e66822bc4c85f8caee6391@group.calendar.google.com" },
  { className: "P3 Love",         calendarId: "c_0452bf89e289524a55804d9af3996f0ec9190965482284cfec5e90c75ab11b76@group.calendar.google.com" },
  { className: "P3 Joy",          calendarId: "c_2d79c5d8871ca82d29d0d9d68fda69a737fc5e4e2f019dd8054a31f88b3a03e9@group.calendar.google.com" },
  { className: "P3 Compassion",   calendarId: "c_99cd2ea4a880ac47d1f27cc3cc221c230c16e83f04a7be7f37723c0e4a6f08a1@group.calendar.google.com" },
  { className: "P3 Harmony",      calendarId: "c_6756e156a82f0386bcace01748e3354a5b610fd54a2895c4c698ca69540ca148@group.calendar.google.com" },
  { className: "P3 Kindness",     calendarId: "c_75c6282e855bb1ca832938d4448eeaecb17de7c595dbfb831fd49e6406662b1f@group.calendar.google.com" },
  { className: "P3 Honesty",      calendarId: "c_4824f92366555697f3b548fb8c30bf2a10450f165db287a116632a90b0ecdb4e@group.calendar.google.com" },
  { className: "P3 Integrity",    calendarId: "c_6a225aa9a5dcf9752d2167db13b10a15969d6aa4672c76caaf260177d2d9826a@group.calendar.google.com" },
  { className: "P3 Wisdom",       calendarId: "c_7fc4f1ab0b28146ee51cb2d1a2b75f5330e5296d31def7cf8c5f94f7a748d6de@group.calendar.google.com" },
  { className: "P4 Grateful",     calendarId: "c_0dfd48bcb89260a56ec8f4b389a0506a30deb3d25e70c20b364c60a0419910a2@group.calendar.google.com" },
  { className: "P4 Respect",      calendarId: "c_845e53868f1c690a5278bbcf94e1888c751ce5f368c8c356711ae68015318cd9@group.calendar.google.com" },
  { className: "P4 Love",         calendarId: "c_34ca947f0e36621c9085b217bf9dad2dcd8f04e09df5e549df85cb4b0145a35b@group.calendar.google.com" },
  { className: "P4 Joy",          calendarId: "c_974b56ec90b64e9658b4f3f596c3a0ae316877025b7d35578ccf4be420f69b77@group.calendar.google.com" },
  { className: "P4 Compassion",   calendarId: "c_401512b623a535c6de43bbdbc41dc7cfad47786a127519e14cd11e2b227cfe9b@group.calendar.google.com" },
  { className: "P4 Harmony",      calendarId: "c_4e0d364a37cd56b00705e9e7520087cb4179d76a307d108551914fe403055bb9@group.calendar.google.com" },
  { className: "P4 Kindness",     calendarId: "c_4c6ab0ce3ecfc932fad468b8206b9d710394e359c21414c55bd0a012afa625a6@group.calendar.google.com" },
  { className: "P4 Honesty",      calendarId: "c_262df9bd4b98ee327fb0d27c56d4496ecf659cd52134d325492cd155b550d8f0@group.calendar.google.com" },
  { className: "P4 Integrity",    calendarId: "c_2abdbe9c555bcbe464787a66a4b6e209cbcc619ab2fdc2ab064d299d4810d444@group.calendar.google.com" },
  { className: "P4 Wisdom",       calendarId: "c_03707845d2a1ed76b5a2040f98a6d4f3416a27d1f981e8de720cc61867046bc0@group.calendar.google.com" },
  { className: "P5 Grateful",     calendarId: "c_1f6b5389a44aa22525906cecbf0d827e8ff545bf7d069509ba561ef89235aab5@group.calendar.google.com" },
  { className: "P5 Respect",      calendarId: "c_9d73fc4a3d283832a3adf3d36f3ff0b949a571d7865707950ad0f9334cd777a5@group.calendar.google.com" },
  { className: "P5 Love",         calendarId: "c_089da34dc902c64cd1170dbb72bde161d525e706a5a726b57989a0121b922ba9@group.calendar.google.com" },
  { className: "P5 Joy",          calendarId: "c_c15d932a3d026c6735585b46c0051965c08ed9e3785e6a6acf8cd84da100e2b4@group.calendar.google.com" },
  { className: "P5 Compassion",   calendarId: "c_1971a6031f33b41c690f8eb659201ab2bbad3d29704726ce6d9e45de61a3f5e9@group.calendar.google.com" },
  { className: "P5 Harmony",      calendarId: "c_aaec24a737a83d9b3d8c85290dccddb4e884b47fa32fc5c81076fc193a15976d@group.calendar.google.com" },
  { className: "P5 Kindness",     calendarId: "c_848c8c05090c5dbf3136f3918f112dd5d35224c6bc0f243aba184b80d86a62aa@group.calendar.google.com" },
  { className: "P5 Honesty",      calendarId: "c_c5dae6b5a8290a0422438b66a643848f425acc44d42a23849ebb26331780caf4@group.calendar.google.com" },
  { className: "P5 Integrity",    calendarId: "c_f0f8bcf456a10078a7903abb2b3e9888dfc328d8f5587d8c98f08d04a545f8c5@group.calendar.google.com" },
  { className: "P5 Wisdom",       calendarId: "c_5615c09dffcd03654c09484cbde6acd32f97fba9743c5865c3e15e440b984494@group.calendar.google.com" },
  { className: "P6 Grateful",     calendarId: "c_ba1b4512853577e7425975ba987b2b7577c45a76dbd3b8bb76df24af202ffe42@group.calendar.google.com" },
  { className: "P6 Respect",      calendarId: "c_3e6d0b4d2c88d389d2130b61f938d0414017a4e5edfc718b0e6084beb4788944@group.calendar.google.com" },
  { className: "P6 Love",         calendarId: "c_f9a4f9fb12d29af89441b4a3b6333c00a45c7511bceab7350ba7fd67bd0cf8f3@group.calendar.google.com" },
  { className: "P6 Joy",          calendarId: "c_7b8342efca8b08759b2825f59eb4b9bbbffee520d78908c9f4f29ea6d385c2d7@group.calendar.google.com" },
  { className: "P6 Compassion",   calendarId: "c_c35a5969f908077b470b8148184b741ee8da5435ce8dcffdcd9649212d6ed2e2@group.calendar.google.com" },
  { className: "P6 Harmony",      calendarId: "c_e99de155781b41cf0671215d93437262ab2ff3b37fd7438cbe4a425f40cb392c@group.calendar.google.com" },
  { className: "P6 Kindness",     calendarId: "c_66510f6c4417c29f6565b0de75439f25d9fd1f5261742c624ece4e882f8de3c2@group.calendar.google.com" },
  { className: "P6 Honesty",      calendarId: "c_52187a01242a924a7b0e4065d36526dfd2fad3c1e134d25f8c61e136470f5994@group.calendar.google.com" },
  { className: "P6 Integrity",    calendarId: "c_20c5ab39b4e337b585f730b56c0593d4dbf13e186475bd5b0d95ef494ae61ddb@group.calendar.google.com" },
  { className: "P6 Wisdom",       calendarId: "c_20d241818a17f03f19e9e084e96f56240087d5d5e7cddaa13aa90563d4bd60c1@group.calendar.google.com" }
];


// ============================================================
// SHARED HELPERS
// ============================================================

/**
 * The classes this run should touch, after CLASS_FILTER.
 */
function selectedClasses() {

  if (!CLASS_FILTER) {
    return CLASS_CALENDARS;
  }

  return CLASS_CALENDARS.filter(function(row) {
    return row.className.indexOf(CLASS_FILTER) === 0;
  });
}


function makeLocalDate(dateStr, h, m) {

  var p = dateStr.split("-");

  return new Date(
    Number(p[0]),
    Number(p[1]) - 1,
    Number(p[2]),
    h,
    m,
    0,
    0
  );
}


function formatHHmm(d) {
  return Utilities.formatDate(d, TZ, "HH:mm");
}


function getDayBounds(dateStr) {

  return {
    start: makeLocalDate(dateStr, 0, 0),
    end:   makeLocalDate(dateStr, 23, 59)
  };
}


/**
 * The exact slot start times the booking page offers.
 * Same morning/afternoon windows as the per-class scripts.
 */
function generateSlots(dateStr) {

  var out = [];

  function fill(from, to) {

    var cur = makeLocalDate(dateStr, from.h, from.m);
    var stop = makeLocalDate(dateStr, to.h, to.m);

    while (cur < stop) {
      out.push(new Date(cur));
      cur = new Date(cur.getTime() + SLOT_MINUTES * 60000);
    }
  }

  fill(DAY_START, LUNCH_START);
  fill(LUNCH_END, DAY_END);

  return out;
}


function normalizeEmail_(s) {
  return String(s || "").trim().toLowerCase();
}


/**
 * Resolves the spreadsheet used for the dashboard and booking list.
 * Order: OUTPUT_SPREADSHEET_ID -> bound spreadsheet -> remembered one
 * -> newly created one (its URL is logged).
 */
function getOutputSpreadsheet_() {

  if (OUTPUT_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(OUTPUT_SPREADSHEET_ID);
  }

  var bound = SpreadsheetApp.getActiveSpreadsheet();
  if (bound) {
    return bound;
  }

  var props = PropertiesService.getScriptProperties();
  var saved = props.getProperty("PTC_OUTPUT_SS_ID");

  if (saved) {
    try {
      return SpreadsheetApp.openById(saved);
    } catch (e) {
      // remembered file is gone - fall through and make a new one
    }
  }

  var ss = SpreadsheetApp.create(OUTPUT_SPREADSHEET_NAME);

  props.setProperty("PTC_OUTPUT_SS_ID", ss.getId());

  Logger.log("Created control panel: " + ss.getUrl());

  return ss;
}


function getOrCreateSheet_(ss, name) {

  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}
