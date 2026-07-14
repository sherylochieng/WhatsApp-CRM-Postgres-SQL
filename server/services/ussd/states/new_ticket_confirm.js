// // server/services/ussd/states/new_ticket_confirm.js
// const ticketsRepo = require("../../../repositories/tickets.repo");
// const smsService = require("../../sms.service");

// module.exports = async function newTicketConfirm({ input, context, phoneNumber }) {
//   if (input === "2") {
//     return {
//       response: "CON Type a short message (max 160 chars):",
//       nextState: "new_ticket_message",
//       nextContext: { ...context, message: undefined },
//     };
//   }

//   if (input !== "1") {
//     return {
//       response: `CON Invalid. Confirm?\n1. Yes, submit\n2. Re-type`,
//       nextState: "new_ticket_confirm",
//       nextContext: context,
//     };
//   }

//   // Write the ticket synchronously -- it is fast.
//   const ticket = await ticketsRepo.create({
//     phone: phoneNumber,
//     category: context.category,
//     message: context.message,
//   });

//   const shortId = ticket.id.slice(0, 8);

//   return {
//     response: `END Ticket #${shortId} filed. You will get an SMS shortly.`,
//     nextState: "done",
//     nextContext: {},
//     postSessionTask: async () => {
//       await smsService.sendSMS(
//         phoneNumber,
//         `Jetlink: ticket #${shortId} received. Category: ${context.category}. An agent will contact you.`
//       );
//     },
//   };
 
//   //added part
//   await session.clearDraft(phoneNumber);
// };

//UPDATED: server/services/ussd/states/new_ticket_confirm.js

// server/services/ussd/states/new_ticket_confirm.js
const ticketsRepo = require("../../../repositories/tickets.repo");
const smsService = require("../../sms.service");
// ADDED: i18n and session imports.
const { t } = require("../i18n");
const session = require("../session");

// ADDED: destructure lang.
module.exports = async function newTicketConfirm({ input, context, phoneNumber, lang }) {
  // ADDED: resolve current language.
  const currentLang = context.lang || lang || "en";

  if (input === "2") {
    return {
      // CHANGED: was hardcoded English.
      response: `CON ${t(currentLang, "prompt_message")}`,
      nextState: "new_ticket_message",
      // CHANGED: keep lang, still clear the message so user retypes.
      nextContext: { ...context, lang: currentLang, message: undefined },
    };
  }

  // if (input !== "1") {
  //   return {
  //     // CHANGED: was hardcoded `CON Invalid. Confirm?\n1. Yes, submit\n2. Re-type`
  //     response: `CON ${t(currentLang, "invalid")}\n${t(currentLang, "confirm_prompt")((context.message || "").slice(0, 60))}`,
  //     nextState: "new_ticket_confirm",
  //     nextContext: { ...context, lang: currentLang },
  //   };
  // }

  if (input !== "1") {
    return {
      // FIXED: same t() misuse as above.
      response: `CON ${t(currentLang, "invalid")}\n${t(currentLang, "confirm_prompt", (context.message || "").slice(0, 60))}`,
      nextState: "new_ticket_confirm",
      nextContext: { ...context, lang: currentLang },
    };
  }

  const ticket = await ticketsRepo.create({
    phone: phoneNumber,
    category: context.category,
    message: context.message,
  });

  const shortId = ticket.id.slice(0, 8);

  // MOVED UP + FIXED: clearDraft() was previously written after the `return`
  // statement, making it dead code -- it never ran, so drafts never got
  // cleared after a successful submit. Now it runs before we return.
  await session.clearDraft(phoneNumber);

  // return {
  //   // CHANGED: was hardcoded English "END Ticket #... filed...".
  //   // ticket_filed is a function in i18n.js taking the id.
  //   response: `END ${t(currentLang, "ticket_filed")(shortId)}`,
  //   nextState: "done",
  //   nextContext: {},
  //   postSessionTask: async () => {
  //     // NOTE: left in English deliberately -- this is an SMS to the user,
  //     // not a USSD screen. If you want this localized too, wrap it with
  //     // t(currentLang, ...) and add sms_ticket_received keys to i18n.js.
  //     await smsService.sendSMS(
  //       phoneNumber,
  //       `Jetlink: ticket #${shortId} received. Category: ${context.category}. An agent will contact you.`
  //     );
  //   },
  // };

  return {
    // FIXED: was t(currentLang, "ticket_filed")(shortId) -- same bug.
    response: `END ${t(currentLang, "ticket_filed", shortId)}`,
    nextState: "done",
    nextContext: {},
    postSessionTask: async () => { /* unchanged */ },
  };
};