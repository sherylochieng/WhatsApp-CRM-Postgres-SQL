// //

// //UPDATED WELCOME.JS

// // server/services/ussd/states/welcome.js
// const { t } = require('../i18n');

// module.exports = async function welcome({ input, context, lang }) {
//   const currentLang = context.lang || lang || 'en';

//   if (input === '') {
//     return {
//       response: `CON ${t(currentLang, 'welcome_title')}\n${t(currentLang, 'welcome_menu')}`,
//       nextState: 'welcome',
//       nextContext: { ...context, lang: currentLang },
//     };
//   }

//   //   if (input === "") {
//   //   const draft = await session.getDraft(phoneNumber);
//   //   const menu = draft
//   //     ? `${t(currentLang, "welcome_menu")}\n5. Continue draft`
//   //     : t(currentLang, "welcome_menu");
//   //   return {
//   //     response: `CON ${t(currentLang, "welcome_title")}\n${menu}`,
//   //     nextState: "welcome",
//   //     nextContext: { ...context, lang: currentLang },
//   //   };
//   // }

//   if (input === '4') {
//     // Language toggle
//     const newLang = currentLang === 'en' ? 'sw' : 'en';
//     return {
//       response: `CON ${t(newLang, 'welcome_title')}\n${t(newLang, 'welcome_menu')}`,
//       nextState: 'welcome',
//       nextContext: { ...context, lang: newLang },
//     };
//   }

//   if (input === '1') {
//     return {
//       response: `CON ...`, // see my_tickets; pass-through
//       nextState: 'my_tickets',
//       nextContext: { ...context, lang: newLang },
//     };
//   }

//   if (input === '2') {
//     return {
//       response: `CON ${t(currentLang, 'prompt_category')}\n${t(currentLang, 'back')}`,
//       nextState: 'new_ticket_category',
//       nextContext: { ...context, lang: newLang },
//     };
//   }

//   if (input === '3') {
//     return {
//       response: `END ${t(currentLang, 'call_support')}`,
//       nextState: 'done',
//       nextContext: {},
//     };
//   }

//   return {
//     response: `CON ${t(currentLang, 'invalid')}\n${t(currentLang, 'welcome_title')}\n${t(currentLang, 'welcome_menu')}`,
//     nextState: 'welcome',
//     nextContext: context,
//   };

//   if (input === '') {
//     const draft = await session.getDraft(phoneNumber);
//     const menu = draft
//       ? `${t(currentLang, 'welcome_menu')}\n5. Continue draft`
//       : t(currentLang, 'welcome_menu');
//     return {
//       response: `CON ${t(currentLang, 'welcome_title')}\n${menu}`,
//       nextState: 'welcome',
//       nextContext: { ...context, lang: currentLang },
//     };
//   }
// };

// server/services/ussd/states/welcome.js
const { t } = require("../i18n");
const session = require("../session");

module.exports = async function welcome({ input, context, phoneNumber, lang }) {
  const currentLang = context.lang || lang || "en";

  if (input === "") {
    const draft = await session.getDraft(phoneNumber);
    
    const menu = draft
      ? `${t(currentLang, "welcome_menu")}\n5. ${t(currentLang, "back").replace("0.", "5.") === "5. Rudi" ? "Endelea na usajili" : "Continue draft"}`
      : t(currentLang, "welcome_menu");

    return {
      response: `CON ${t(currentLang, "welcome_title")}\n${menu}`,
      nextState: "welcome",
      nextContext: { ...context, lang: currentLang },
    };
  }

  if (input === "4") {
    const newLang = currentLang === "en" ? "sw" : "en";
    
    const draft = await session.getDraft(phoneNumber);
    const menu = draft
      ? `${t(newLang, "welcome_menu")}\n5. ${newLang === "sw" ? "Endelea na usajili" : "Continue draft"}`
      : t(newLang, "welcome_menu");

    return {
      response: `CON ${t(newLang, "welcome_title")}\n${menu}`,
      nextState: "welcome",
      nextContext: { ...context, lang: newLang },
    };
  }

  if (input === "1") {
    return {
      response: `CON ...`,
      nextState: "my_tickets",
      nextContext: { ...context, lang: currentLang },
    };
  }

  if (input === "2") {
    return {
      response: `CON ${t(currentLang, "prompt_category")}\n${t(currentLang, "back")}`,
      nextState: "new_ticket_category",
      nextContext: { ...context, lang: currentLang },
    };
  }

  if (input === "3") {
    return {
      response: `END ${t(currentLang, "call_support")}`,
      nextState: "done",
      nextContext: {},
    };
  }

  if (input === "5") {
    const draft = await session.getDraft(phoneNumber);
    if (draft) {
      const restoredContext = {
        ...context,
        lang: currentLang,
        category: draft.category,
        message: draft.message,
      };

      return {
        response: `CON ${t(currentLang, "confirm_prompt")(draft.message.slice(0, 15))}`,
        nextState: "new_ticket_confirm",
        nextContext: restoredContext,
      };
    }
  }

  return {
    response: `CON ${t(currentLang, "invalid")}\n${t(currentLang, "welcome_title")}\n${t(currentLang, "welcome_menu")}`,
    nextState: "welcome",
    nextContext: { ...context, lang: currentLang },
  };
};
