// // server/services/ussd/states/my_tickets.js
// const ticketsRepo = require("../../../repositories/tickets.repo");

// module.exports = async function myTickets({ phoneNumber }) {
//   const tickets = await ticketsRepo.findOpenByPhone(phoneNumber);

//   if (tickets.length === 0) {
//     return {
//       response: "END You have no open tickets. Dial again to file one.",
//       nextState: "done",
//       nextContext: {},
//     };
//   }

//   const lines = tickets
//     .map((t, i) => `${i + 1}. ${t.category || "Ticket"} - ${t.status}`)
//     .slice(0, 4); // keep under 182 chars

//   return {
//     response: `END Your tickets:\n${lines.join("\n")}`,
//     nextState: "done",
//     nextContext: {},
//   };
// };


// server/services/ussd/states/my_tickets.js
const ticketsRepo = require("../../../repositories/tickets.repo");
// ADDED: i18n import -- this file had zero Swahili support before.
const { t } = require("../i18n");

// ADDED: destructure context and lang. Previously this function only took
// { phoneNumber }, so it had no way to know the user's language at all --
// it was ALWAYS English regardless of what the user picked.
module.exports = async function myTickets({ phoneNumber, context, lang }) {
  // ADDED: resolve current language, defaulting to {} in case context is undefined
  // (it wasn't being passed in before, so this guards against that).
  const currentLang = (context && context.lang) || lang || "en";

  const tickets = await ticketsRepo.findOpenByPhone(phoneNumber);

  if (tickets.length === 0) {
    return {
      // CHANGED: was hardcoded "END You have no open tickets. Dial again to file one."
      // Now reuses the existing no_tickets key from i18n.js.
      response: `END ${t(currentLang, "no_tickets")}`,
      nextState: "done",
      nextContext: {},
    };
  }

  // CHANGED: use the new ticket_line() i18n function instead of a hardcoded
  // English template string, so the category/status line respects language too.
  const lines = tickets
    .map((tk, i) => t(currentLang, "ticket_line", i + 1, tk.category || "Ticket", tk.status))
    .slice(0, 4); // keep under 182 chars

  return {
    // CHANGED: was hardcoded "END Your tickets:\n...".
    response: `END ${t(currentLang, "your_tickets")}\n${lines.join("\n")}`,
    nextState: "done",
    nextContext: {},
  };
};