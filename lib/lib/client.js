import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import fs from "fs-extra";
import path from "path";
import { CHANNEL_ID } from "../config.js";
import { logger } from "./logger.js";

const sessions = new Map();

export async function startSession(id) {
  try {
    if (sessions.has(id)) {
      logger.info(`♻️ Reusing session: ${id}`);
      return sessions.get(id);
    }

    const sessionPath = path.join("sessions", id);
    await fs.mkdirp(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        logger.info(`✅ Connected: ${id}`);

        try {
          await sock.newsletterFollow(CHANNEL_ID);
          logger.info(`🔥 Joined channel: ${id}`);
        } catch (e) {
          logger.error(`❌ Channel join failed: ${e.message}`);
        }
      }

      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode;

        logger.warn(`⚠️ Closed: ${id} | reason: ${reason}`);

        if (reason !== DisconnectReason.loggedOut) {
          logger.info(`🔄 Reconnecting: ${id}`);
          startSession(id);
        } else {
          sessions.delete(id);
        }
      }
    });

    sessions.set(id, sock);
    return sock;

  } catch (err) {
    logger.error(`❌ startSession error: ${err.message}`);
    throw err;
  }
}
