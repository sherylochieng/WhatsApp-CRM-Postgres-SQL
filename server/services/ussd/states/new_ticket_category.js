// server/services/ussd/states/new_ticket_category.js

// const CATEGORIES = {
//   "1": "billing",
//   "2": "rider_complaint",
//   "3": "lost_item",
//   "4": "other",
// };

// module.exports = async function newTicketCategory({ input, context }) {
//   if (input === "0") {
//     return {
//       response:
//         "CON Jetlink Support\n1. My open tickets\n2. File a new ticket\n3. Call support",
//       nextState: "welcome",
//       nextContext: {},
//     };
//   }

//   const category = CATEGORIES[input];
//   if (!category) {
//     return {
//       response:
//         "CON Invalid. What is the issue about?\n1. Billing\n2. Rider complaint\n3. Lost item\n4. Other\n0. Back",
//       nextState: "new_ticket_category",
//       nextContext: context,
//     };
//   }

//   return {
//     response: "CON Type a short message (max 160 chars):",
//     nextState: "new_ticket_message",
//     nextContext: { ...context, category },
//   };
// };

// UPDATED: server/services/ussd/states/new_ticket_category.js

// server/services/ussd/states/new_ticket_category.js
// ADDED: import t() -- this file previously never touched i18n at all,
// which is the root cause of the language drift bug.
const { t } = require("../i18n");

const CATEGORIES = {
  "1": "billing",
  "2": "rider_complaint",
  "3": "lost_item",
  "4": "other",
};

// ADDED: accept `lang` as a param (dispatcher already passes it in) so this
// state can fall back to it if context.lang somehow isn't set yet.
module.exports = async function newTicketCategory({ input, context, lang }) {
  // ADDED: resolve the active language the same way welcome.js does.
  // Without this line, currentLang didn't exist here at all -- the file
  // just hardcoded English strings no matter what language the user picked.
  const currentLang = context.lang || lang || "en";

  if (input === "0") {
    return {
      // CHANGED: was a hardcoded English "CON Jetlink Support\n1. My open..." string.
      // Now pulls from i18n so it matches whatever language the user is in.
      response: `CON ${t(currentLang, "welcome_title")}\n${t(currentLang, "welcome_menu")}`,
      nextState: "welcome",
      // FIXED BUG: this used to be nextContext: {} -- wiping out context entirely,
      // including the user's language choice. Now we preserve lang explicitly.
      nextContext: { lang: currentLang },
    };
  }

  const category = CATEGORIES[input];
  if (!category) {
    return {
      // CHANGED: was hardcoded English. Now uses t() with currentLang.
      response: `CON ${t(currentLang, "invalid")}\n${t(currentLang, "prompt_category")}`,
      nextState: "new_ticket_category",
      // CHANGED: was nextContext: context (didn't guarantee lang was present
      // if it came in only via the `lang` param and not context yet).
      nextContext: { ...context, lang: currentLang },
    };
  }

  return {
    // CHANGED: was hardcoded "CON Type a short message (max 160 chars):".
    response: `CON ${t(currentLang, "prompt_message")}`,
    nextState: "new_ticket_message",
    // ADDED: lang: currentLang -- must be threaded forward or the next
    // state (new_ticket_message) loses it and falls back to English.
    nextContext: { ...context, lang: currentLang, category },
  };
};