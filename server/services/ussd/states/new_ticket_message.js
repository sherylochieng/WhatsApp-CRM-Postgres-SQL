// // server/services/ussd/states/new_ticket_message.js
// module.exports = async function newTicketMessage({ input, context }) {
//   if (!input || input.length < 3) {
//     return {
//       response: "CON Message too short. Type a short message (3-160 chars):",
//       nextState: "new_ticket_message",
//       nextContext: context,
//     };
//   }

//   const truncated = input.slice(0, 160);
//   return {
//     response: `CON Confirm? "${truncated.slice(0, 60)}..."\n1. Yes, submit\n2. Re-type`,
//     nextState: "new_ticket_confirm",
//     nextContext: { ...context, message: truncated },
//   };

//   //added part

//   await session.saveDraft(phoneNumber, {
//   stage: "message_entered",
//   category: context.category,
//   message: truncated,
// });
// };


// server/services/ussd/states/new_ticket_message.js
// ADDED: i18n import, plus session import (needed for the draft-save call
// that was dead code below the return statement).
const { t } = require("../i18n");
const session = require("../session");

// ADDED: destructure phoneNumber and lang -- both are passed by the
// dispatcher but this file wasn't using them before.
module.exports = async function newTicketMessage({ input, context, phoneNumber, lang }) {
  // ADDED: same lang resolution pattern as every other state file.
  const currentLang = context.lang || lang || "en";

  if (!input || input.length < 3) {
    return {
      // CHANGED: was hardcoded "CON Message too short. Type a short message (3-160 chars):"
      response: `CON ${t(currentLang, "message_too_short")}\n${t(currentLang, "prompt_message")}`,
      nextState: "new_ticket_message",
      // ADDED: lang: currentLang so it survives a retry loop.
      nextContext: { ...context, lang: currentLang },
    };
  }

  const truncated = input.slice(0, 160);

  // MOVED UP + FIXED: this was previously written AFTER the `return` statement
  // below, which meant it was unreachable dead code -- JS exits the function
  // at `return`, so drafts were never actually being saved. Moved it here,
  // before we return, so it actually executes.
  await session.saveDraft(phoneNumber, {
    stage: "message_entered",
    category: context.category,
    message: truncated,
  });

  // return {
  //   // CHANGED: was hardcoded English template literal with raw quotes.
  //   // confirm_prompt is a function in i18n.js, so we call it with the excerpt.
  //   response: `CON ${t(currentLang, "confirm_prompt")(truncated.slice(0, 60))}`,
  //   nextState: "new_ticket_confirm",
  //   // ADDED: lang: currentLang -- must carry forward to new_ticket_confirm.
  //   nextContext: { ...context, lang: currentLang, message: truncated },
  // };

  return {
    // FIXED: t() already invokes the function internally when you pass extra
    // args -- don't chain a second (...) call after t(), that treats the
    // returned string as if it were still a function.
    response: `CON ${t(currentLang, "confirm_prompt", truncated.slice(0, 60))}`,
    nextState: "new_ticket_confirm",
    nextContext: { ...context, lang: currentLang, message: truncated },
  };
};