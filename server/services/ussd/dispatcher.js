// server/services/ussd/dispatcher.js
const session = require("./session");
const states = require("./states");

async function run({ sessionId, phoneNumber, rawText }) {
  const parts = rawText.split("*");
  const latestInput = rawText === "" ? "" : parts[parts.length - 1];

  const current = await session.get(sessionId);
  const handlerName = current.state || "welcome";
  const handler = states[handlerName] || states.welcome;

  const result = await handler({
    input: latestInput,
    context: current.context,
    phoneNumber,
  });

  if (result.response.startsWith("END")) {
    await session.destroy(sessionId);
    if (result.postSessionTask) {
      // Fire and forget -- do not block the USSD reply.
      result.postSessionTask().catch((err) =>
        console.error("post-session task failed:", err)
      );
    }
  } else {
    await session.set(sessionId, {
      state: result.nextState,
      context: result.nextContext,
    });
  }

  return result.response;
}

module.exports = { run };