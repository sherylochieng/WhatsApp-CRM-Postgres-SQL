// // server/services/bot.js
// const { v4: uuidv4 } = require('uuid');
// const db = require('../config/db');
// const { sendText, sendInquiryList } = require('../services/whatsapp.service');

// // --- Persistence helpers --------------------------------------------------

// function findOrCreateLead(waPhone, profileName) {
//   let lead = db.prepare('SELECT * FROM leads WHERE wa_phone = ?').get(waPhone);

//   if (lead) return lead;

//   const id = uuidv4();
//   db.prepare(
//     `INSERT INTO leads (id, wa_phone, name, status)
//      VALUES (?, ?, ?, 'new')`,
//   ).run(id, waPhone, profileName || null);

//   db.prepare(
//     `INSERT INTO conversations (id, lead_id, state)
//      VALUES (?, ?, 'awaiting_name')`,
//   ).run(uuidv4(), id);

//   return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
// }

// function getConversation(leadId) {
//   return db
//     .prepare('SELECT * FROM conversations WHERE lead_id = ?')
//     .get(leadId);
// }

// function setState(leadId, state) {
//   db.prepare(
//     `UPDATE conversations
//      SET state = ?, last_message_at = datetime('now')
//      WHERE lead_id = ?`,
//   ).run(state, leadId);
// }

// function updateLead(leadId, patch) {
//   const fields = Object.keys(patch);
//   if (fields.length === 0) return;
//   const sets = fields.map((f) => `${f} = ?`).join(', ');
//   const values = fields.map((f) => patch[f]);
//   db.prepare(
//     `UPDATE leads SET ${sets}, updated_at = datetime('now') WHERE id = ?`,
//   ).run(...values, leadId);
// }

// function logMessage(leadId, direction, body, rawPayload) {
//   db.prepare(
//     `INSERT INTO messages (lead_id, direction, body, raw_payload)
//      VALUES (?, ?, ?, ?)`,
//   ).run(leadId, direction, body, JSON.stringify(rawPayload || null));
// }
// // server/services/bot.js  (add above module.exports)

// // --- Validation -----------------------------------------------------------

// function looksLikeEmail(str) {
//   return typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
// }

// function looksLikeName(str) {
//   return typeof str === 'string' && str.trim().length >= 2;
// }
// // server/services/bot.js  (continuing)

// // --- Conversation handler -------------------------------------------------

// async function handleIncoming(message, contact) {
//   const waPhone = message.from;
//   const profileName = contact?.profile?.name;

//   const lead = findOrCreateLead(waPhone, profileName);

//   // Pull user-visible text out of whatever message type Meta sent
//   let userText = null;
//   let listChoiceId = null;

//   if (message.type === 'text') {
//     userText = message.text?.body?.trim();
//   } else if (message.type === 'interactive') {
//     const i = message.interactive;
//     if (i?.type === 'list_reply') {
//       listChoiceId = i.list_reply.id;
//       userText = i.list_reply.title;
//     } else if (i?.type === 'button_reply') {
//       userText = i.button_reply.title;
//     }
//   } else {
//     // voice note, image, sticker, location...
//     await sendText(
//       waPhone,
//       'I can only read text messages right now. Could you type your answer?',
//     );
//     logMessage(lead.id, 'inbound', `[${message.type}]`, message);
//     return;
//   }

//   logMessage(lead.id, 'inbound', userText, message);

//   // Escape hatch: restart
//   if (userText && /^(restart|start over|reset)$/i.test(userText)) {
//     setState(lead.id, 'awaiting_name');
//     updateLead(lead.id, { name: null, email: null, inquiry_type: null });
//     const reply = "No problem, let's start over. What's your full name?";
//     await sendText(waPhone, reply);
//     logMessage(lead.id, 'outbound', reply);
//     return;
//   }

//   const convo = getConversation(lead.id);

//   switch (convo.state) {
//     case 'awaiting_name': {
//       if (!userText || !looksLikeName(userText)) {
//         const reply =
//           "Hi! Welcome to Mctaba CRM. What's your full name? (at least 2 characters)";
//         await sendText(waPhone, reply);
//         logMessage(lead.id, 'outbound', reply);
//         return;
//       }
//       updateLead(lead.id, { name: userText });
//       setState(lead.id, 'awaiting_email');
//       const reply = `Thanks ${userText.split(' ')[0]}! What's your email address?`;
//       await sendText(waPhone, reply);
//       logMessage(lead.id, 'outbound', reply);
//       return;
//     }

//     case 'awaiting_email': {
//       if (!looksLikeEmail(userText)) {
//         const reply =
//           "Hmm, that doesn't look like an email. Could you send it again? Example: yourname@gmail.com";
//         await sendText(waPhone, reply);
//         logMessage(lead.id, 'outbound', reply);
//         return;
//       }
//       updateLead(lead.id, { email: userText });
//       setState(lead.id, 'awaiting_inquiry_type');
//       await sendInquiryList(waPhone);
//       logMessage(lead.id, 'outbound', '[interactive list: inquiry type]');
//       return;
//     }

//     case 'awaiting_inquiry_type': {
//       if (!listChoiceId && !userText) {
//         await sendInquiryList(waPhone);
//         return;
//       }
//       const inquiry = listChoiceId || userText;
//       updateLead(lead.id, { inquiry_type: inquiry });
//       setState(lead.id, 'confirming');

//       const fresh = db
//         .prepare('SELECT name, email, inquiry_type FROM leads WHERE id = ?')
//         .get(lead.id);
//       const reply =
//         `Please confirm your details:\n\n` +
//         `Name: ${fresh.name}\n` +
//         `Email: ${fresh.email}\n` +
//         `Inquiry: ${fresh.inquiry_type}\n\n` +
//         `Reply "yes" to confirm or "restart" to start over.`;
//       await sendText(waPhone, reply);
//       logMessage(lead.id, 'outbound', reply);
//       return;
//     }

//     case 'confirming': {
//       if (/^y(es)?$/i.test(userText || '')) {
//         setState(lead.id, 'complete');
//         const reply =
//           "Thanks! Your details are saved. Someone from our team will be in touch shortly. To start a new inquiry, type 'restart'.";
//         await sendText(waPhone, reply);
//         logMessage(lead.id, 'outbound', reply);
//         return;
//       }
//       const reply =
//         "Reply 'yes' to confirm the details above, or 'restart' to start over.";
//       await sendText(waPhone, reply);
//       logMessage(lead.id, 'outbound', reply);
//       return;
//     }

//     case 'complete':
//     default: {
//       const reply =
//         "Thanks! We already have your details. A team member will be in touch. To start a new inquiry, type 'restart'.";
//       await sendText(waPhone, reply);
//       logMessage(lead.id, 'outbound', reply);
//       return;
//     }
//   }
// }

// module.exports = {
//   findOrCreateLead,
//   getConversation,
//   setState,
//   updateLead,
//   logMessage,
//   handleIncoming,
// };


// server/services/bot.service.js
// RENAMED from bot.js to bot.service.js to match webhook.routes.js's
// require('../services/bot.service') -- the old filename would have
// caused "Cannot find module" the moment a webhook request came in.

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db'); // CHANGED: was `const db = require('../config/db')`
const { sendText, sendInquiryList } = require('../services/whatsapp.service');

// --- Persistence helpers --------------------------------------------------
// CHANGED: every function below is now `async` because Postgres queries via
// `query()` return a Promise (unlike better-sqlite3's synchronous .get()/.run()).
// Every `?` placeholder became a numbered $1, $2... placeholder, which is how
// pg expects parameters -- this matches the pattern already used in leads.repo.js.

async function findOrCreateLead(waPhone, profileName) {
  const existing = await query('SELECT * FROM leads WHERE wa_phone = $1', [waPhone]);
  if (existing.rows[0]) return existing.rows[0];

  const id = uuidv4();
  await query(
    `INSERT INTO leads (id, wa_phone, name, status)
     VALUES ($1, $2, $3, 'new')`,
    [id, waPhone, profileName || null],
  );

  await query(
    `INSERT INTO conversations (id, lead_id, state)
     VALUES ($1, $2, 'awaiting_name')`,
    [uuidv4(), id],
  );

  const created = await query('SELECT * FROM leads WHERE id = $1', [id]);
  return created.rows[0];
}

async function getConversation(leadId) {
  const { rows } = await query('SELECT * FROM conversations WHERE lead_id = $1', [leadId]);
  return rows[0];
}

async function setState(leadId, state) {
  // CHANGED: datetime('now') is SQLite syntax -- Postgres equivalent is NOW().
  await query(
    `UPDATE conversations
     SET state = $1, last_message_at = NOW()
     WHERE lead_id = $2`,
    [state, leadId],
  );
}

async function updateLead(leadId, patch) {
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  // CHANGED: build numbered placeholders ($1, $2...) instead of repeated `?`,
  // and the leadId param now goes in its own correctly-numbered slot at the end.
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => patch[f]);
  await query(
    `UPDATE leads SET ${sets}, updated_at = NOW() WHERE id = $${fields.length + 1}`,
    [...values, leadId],
  );
}

async function logMessage(leadId, direction, body, rawPayload) {
  // FIXED: schema's CHECK constraint only allows direction IN ('in', 'out').
  // This used to receive 'inbound'/'outbound' from callers below, which would
  // have failed every insert with a check-violation error. Normalizing here
  // so callers can keep passing whatever they already do, without having to
  // change every call site individually.
  const normalized = direction === 'inbound' ? 'in' : direction === 'outbound' ? 'out' : direction;
  await query(
    `INSERT INTO messages (lead_id, direction, body, raw_payload)
     VALUES ($1, $2, $3, $4)`,
    [leadId, normalized, body, JSON.stringify(rawPayload || null)],
  );
}

// --- Validation -----------------------------------------------------------
// Unchanged -- pure JS, no database involved.

function looksLikeEmail(str) {
  return typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function looksLikeName(str) {
  return typeof str === 'string' && str.trim().length >= 2;
}

// --- Conversation handler -------------------------------------------------

async function handleIncoming(message, contact) {
  const waPhone = message.from;
  const profileName = contact?.profile?.name;

  // CHANGED: added await -- findOrCreateLead is now async.
  const lead = await findOrCreateLead(waPhone, profileName);

  let userText = null;
  let listChoiceId = null;

  if (message.type === 'text') {
    userText = message.text?.body?.trim();
  } else if (message.type === 'interactive') {
    const i = message.interactive;
    if (i?.type === 'list_reply') {
      listChoiceId = i.list_reply.id;
      userText = i.list_reply.title;
    } else if (i?.type === 'button_reply') {
      userText = i.button_reply.title;
    }
  } else {
    await sendText(
      waPhone,
      'I can only read text messages right now. Could you type your answer?',
    );
    await logMessage(lead.id, 'inbound', `[${message.type}]`, message); // CHANGED: added await
    return;
  }

  await logMessage(lead.id, 'inbound', userText, message); // CHANGED: added await

  // Escape hatch: restart
  if (userText && /^(restart|start over|reset)$/i.test(userText)) {
    await setState(lead.id, 'awaiting_name'); // CHANGED: added await
    await updateLead(lead.id, { name: null, email: null, inquiry_type: null }); // CHANGED: added await
    const reply = "No problem, let's start over. What's your full name?";
    await sendText(waPhone, reply);
    await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
    return;
  }

  const convo = await getConversation(lead.id); // CHANGED: added await

  switch (convo.state) {
    case 'awaiting_name': {
      if (!userText || !looksLikeName(userText)) {
        const reply =
          "Hi! Welcome to Mctaba CRM. What's your full name? (at least 2 characters)";
        await sendText(waPhone, reply);
        await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
        return;
      }
      await updateLead(lead.id, { name: userText }); // CHANGED: added await
      await setState(lead.id, 'awaiting_email'); // CHANGED: added await
      const reply = `Thanks ${userText.split(' ')[0]}! What's your email address?`;
      await sendText(waPhone, reply);
      await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
      return;
    }

    case 'awaiting_email': {
      if (!looksLikeEmail(userText)) {
        const reply =
          "Hmm, that doesn't look like an email. Could you send it again? Example: yourname@gmail.com";
        await sendText(waPhone, reply);
        await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
        return;
      }
      await updateLead(lead.id, { email: userText }); // CHANGED: added await
      await setState(lead.id, 'awaiting_inquiry_type'); // CHANGED: added await
      await sendInquiryList(waPhone);
      await logMessage(lead.id, 'outbound', '[interactive list: inquiry type]'); // CHANGED: added await
      return;
    }

    case 'awaiting_inquiry_type': {
      if (!listChoiceId && !userText) {
        await sendInquiryList(waPhone);
        return;
      }
      const inquiry = listChoiceId || userText;
      await updateLead(lead.id, { inquiry_type: inquiry }); // CHANGED: added await
      await setState(lead.id, 'confirming'); // CHANGED: added await

      // CHANGED: converted to query() + $1 placeholder, destructure rows[0]
      const { rows } = await query(
        'SELECT name, email, inquiry_type FROM leads WHERE id = $1',
        [lead.id],
      );
      const fresh = rows[0];
      const reply =
        `Please confirm your details:\n\n` +
        `Name: ${fresh.name}\n` +
        `Email: ${fresh.email}\n` +
        `Inquiry: ${fresh.inquiry_type}\n\n` +
        `Reply "yes" to confirm or "restart" to start over.`;
      await sendText(waPhone, reply);
      await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
      return;
    }

    case 'confirming': {
      if (/^y(es)?$/i.test(userText || '')) {
        await setState(lead.id, 'complete'); // CHANGED: added await
        const reply =
          "Thanks! Your details are saved. Someone from our team will be in touch shortly. To start a new inquiry, type 'restart'.";
        await sendText(waPhone, reply);
        await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
        return;
      }
      const reply =
        "Reply 'yes' to confirm the details above, or 'restart' to start over.";
      await sendText(waPhone, reply);
      await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
      return;
    }

    case 'complete':
    default: {
      const reply =
        "Thanks! We already have your details. A team member will be in touch. To start a new inquiry, type 'restart'.";
      await sendText(waPhone, reply);
      await logMessage(lead.id, 'outbound', reply); // CHANGED: added await
      return;
    }
  }
}

module.exports = {
  findOrCreateLead,
  getConversation,
  setState,
  updateLead,
  logMessage,
  handleIncoming,
};