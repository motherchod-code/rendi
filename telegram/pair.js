import { startSession } from "../lib/client.js";
import { logger } from "../lib/logger.js";

const pairCooldown = new Map();
const PAIR_COOLDOWN_MS = 60000;

export async function handlePair(bot, msg, args) {
  const chatId = msg.chat.id;
  const replyId = msg.message_id;

  try {
    if (!args) {
      return bot.sendMessage(
        chatId,
        `<b>Usage:</b>\n<code>/pair 919876543210</code>`,
        { parse_mode: "HTML", reply_to_message_id: replyId }
      );
    }

    const digits = args.replace(/\D/g, "");

    if (!digits || digits.length < 6) {
      return bot.sendMessage(
        chatId,
        `❌ Invalid number\nExample: <code>/pair 919876543210</code>`,
        { parse_mode: "HTML", reply_to_message_id: replyId }
      );
    }

    const userId = msg.from?.id || msg.sender_chat?.id;
    const last = pairCooldown.get(userId) || 0;

    if (Date.now() - last < PAIR_COOLDOWN_MS) {
      return bot.sendMessage(chatId, "⏳ Wait 1 min before retry", {
        reply_to_message_id: replyId,
      });
    }

    pairCooldown.set(userId, Date.now());

    logger.info(`📲 Pair request: ${userId} → ${digits}`);

    const sock = await startSession(digits);

    const rawCode = await sock.requestPairingCode(digits);
    const code = rawCode.match(/.{1,4}/g)?.join("-") || rawCode;

    const sent = await bot.sendMessage(
      chatId,
      `✅ <b>Pairing Code</b>\n\n<code>${code}</code>\n\n📲 Link Device now`,
      { parse_mode: "HTML", reply_to_message_id: replyId }
    );

    setTimeout(() => {
      bot.deleteMessage(chatId, sent.message_id).catch(() => {});
    }, 60000);

  } catch (e) {
    logger.error(`❌ Pair error: ${e.message}`);

    bot.sendMessage(chatId, `❌ Error: ${e.message}`, {
      reply_to_message_id: replyId,
    });
  }
}
