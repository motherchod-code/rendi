import TelegramBot from "node-telegram-bot-api";
import { BOT_TOKEN } from "./config.js";
import { handlePair } from "./telegram/pair.js";
import { logger } from "./lib/logger.js";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

logger.info("🤖 Bot Started");

// /pair command
bot.onText(/\/pair(?:\s+(.+))?/, (msg, match) => {
  handlePair(bot, msg, match[1]);
});

// Global errors
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT:", err);
});

process.on("unhandledRejection", (err) => {
  logger.error("PROMISE ERROR:", err);
});
