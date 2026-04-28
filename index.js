const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const { Boom } = require("@hapi/boom");
const moment = require("moment-timezone");
const qrcode = require('qrcode-terminal');

// --- الإعدادات ---
const ADMIN_NUMBER = "201226599219"; 
const PASSWORD = "SEIF"; 
const DATA_FILE = "./bot_data.json";

let data = {
    users: {},
    total_messages_sent: 0,
    is_active: true
};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        } else {
            saveData();
        }
    } catch (e) {
        console.log("Error loading data, using defaults.");
    }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
    } catch (e) {
        console.log("Error saving data.");
    }
}

const DESTRUCTION_MESSAGES = [
    "خد يبن أل شرمؤطة", "ؤلأ يأ هلفؤت رد", "أنت يألأ أشتمني", "مش عندك أيد يألأ",
    "ؤلأ أيدك في طيزك", "أه صح نسيت أني قطعتلك ايدك", "اه يالا انا قطعت ايدك",
    "انا حاسس بيك انت مكسسور", "انا دوستك يالا", "مش كان قصدي ادوسك", "خلاص متعيطش يالا",
    "انت هتعيط ولا ايه", "حد يجيب لي ال عرص دة منديل", "انشف يا خول فين ايه",
    "امك صعبانه عليا اوي", "عماله تعيط ياض", "لا بجد صعبت عليا", "امك ، نفسو مكسوره بقالو يومين",
    "يعيني 😍 مش كان قصدي اكسرك", "انت هتعيط من زبي ولا ايه", "وديني انت صعبان عليا",
    "اتلاقيق بتشتمني في سايبر", "والراجل يقولك خلصت يحبيبي", "تقولو ثواني يا عمو هختم الواد دة",
    "اه وديني يالا", "احنا لازم نعملك جمعيه", "عششان تشتري ويب يبني", "ونقبضهالك الاول",
    "اه وللههي", "مش هتفهم حاجة خالص", "انت ال عبيط يالا", "صبي ال مجال اهو",
    "انت يبتاع الواتساب", "ولا يا واتساب يا معرص", "تعالا امسك حنكش", "حنكش عيزك يات",
    "تعاله امسكو", "زوبري واقف عليك", "زوبري عاوز خورمك ياض", "بوس زب بابا يخول",
    "مش هتبوس زوبر ال بابا يالا", "انت ميت فاشخ", "مسخره", "مش موجود اصلا",
    "بوس رجلي يالا", "ي الا ي كسمك", "انا هخليك تلحسها هههههههههههههههههه",
    "انزل علي رجلك ي خول", "وابلع ريقكك الاول", "ي ابن الفاجرة", "ي حبيب زبي انت",
    "نفسي ترد شرفك يالا", "شرفك دة شرف مايا خليفة", "منا نكتك اوي", "كسك عايز يتغيرلو",
    "انا المجال دا = انا", "ارمي اختك تحت بضاني", "امك صدرها كلو في بوقي يلا",
    "يا ديوث ي ابن المعرصة ي كلب البنات", "انا هنا آلفلســطــيني آلكآرف وبــس",
    "انت مكروف ي ابن اللبوة", "انت عيل ابن متناكة امك شرموطة ي حمار", "بوس رجلي يخول",
    "ي عرص ي كلوت", "ي كلوت ي جربوع", "رد عليا ي زاني", "ي ابن الزواني", "هفضل انيك فيك"
];

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["SEIF V2", "Chrome", "1.0.0"],
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("👹 [SCAN ME] - SCAN TO ACTIVATE:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "close") {
            const shouldReconnect = (new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === "open") {
            console.log("✅ [الجحيم مفتوح] - البوت متصل!");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const sender = msg.key.remoteJid;
            const senderNumber = sender.split("@")[0];
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            
            const isAdmin = senderNumber === ADMIN_NUMBER;

            if (isAdmin) {
                if (text.toLowerCase() === "start" || text === "SEIF" || text === "مدير") {
                    const menu = "أهلاً ي زعيم 🫡\n\n1️⃣ - الإحصائيات\n2️⃣ - تدمير [الرقم]\n3️⃣ - حظر بلاغات [الرقم]\n4️⃣ - قصف سريع [الرقم] [العدد] [النص]";
                    await sock.sendMessage(sender, { text: menu });
                    return;
                }

                if (text === "1") {
                    await sock.sendMessage(sender, { text: `📊 القذائف المرسلة: ${data.total_messages_sent}` });
                } else if (text.startsWith("2 ") || text.startsWith("تدمير ")) {
                    const targetNum = text.split(" ")[1];
                    const target = targetNum + "@s.whatsapp.net";
                    await sock.sendMessage(sender, { text: "😈 جاري التدمير الشامل..." });
                    for (const m of DESTRUCTION_MESSAGES) {
                        await sock.sendMessage(target, { text: `🔥 ${m} 🔥` });
                        data.total_messages_sent++;
                        await new Promise(r => setTimeout(r, 100));
                    }
                    saveData();
                    await sock.sendMessage(sender, { text: "✅ تم السحق بنجاح!" });
                } else if (text.startsWith("3 ") || text.startsWith("حظر ")) {
                    const targetNum = text.split(" ")[1];
                    const target = targetNum + "@s.whatsapp.net";
                    await sock.sendMessage(sender, { text: "⚔️ جاري شن هجوم البلاغات..." });
                    for (let i = 1; i <= 100; i++) {
                        await sock.sendMessage(target, { text: `🔥 بلاغ تدميري رقم ${i} من جحيم SEIF 🔥` });
                        data.total_messages_sent++;
                        if (i % 20 === 0) await sock.sendMessage(sender, { text: `✅ تم إرسال ${i} بلاغ...` });
                        await new Promise(r => setTimeout(r, 50));
                    }
                    saveData();
                    await sock.sendMessage(sender, { text: "✅ تم الانتهاء!" });
                } else if (text.startsWith("4 ")) {
                    const parts = text.split(" ");
                    const target = parts[1] + "@s.whatsapp.net";
                    const count = parseInt(parts[2]);
                    const content = parts.slice(3).join(" ");
                    await sock.sendMessage(sender, { text: `🚀 جاري القصف السريع (${count}) مرات...` });
                    for (let i = 0; i < count; i++) {
                        await sock.sendMessage(target, { text: content });
                        data.total_messages_sent++;
                        await new Promise(r => setTimeout(r, 50));
                    }
                    saveData();
                    await sock.sendMessage(sender, { text: "✅ تم القصف!" });
                }
                return;
            }

            if (text.toLowerCase() === "start") {
                await sock.sendMessage(sender, { text: "⚠️ أدخل كلمة المرور للإكمال:" });
                return;
            }

            if (text === PASSWORD) {
                if (!data.users[senderNumber]) data.users[senderNumber] = {};
                data.users[senderNumber].authenticated = true;
                saveData();
                await sock.sendMessage(sender, { text: "🔓 تم التحقق!\n\n1️⃣ - تدمير [الرقم]\n2️⃣ - حظر بلاغات [الرقم]" });
                return;
            }

            if (data.users[senderNumber]?.authenticated) {
                if (text.startsWith("1 ")) {
                    const targetNum = text.split(" ")[1];
                    const target = targetNum + "@s.whatsapp.net";
                    await sock.sendMessage(sender, { text: "😈 جاري التدمير..." });
                    for (const m of DESTRUCTION_MESSAGES) {
                        await sock.sendMessage(target, { text: `🔥 ${m} 🔥` });
                        data.total_messages_sent++;
                        await new Promise(r => setTimeout(r, 200));
                    }
                    saveData();
                } else if (text.startsWith("2 ")) {
                    const targetNum = text.split(" ")[1];
                    const target = targetNum + "@s.whatsapp.net";
                    await sock.sendMessage(sender, { text: "⚔️ جاري إرسال البلاغات..." });
                    for (let i = 1; i <= 50; i++) {
                        await sock.sendMessage(target, { text: `🔥 بلاغ رقم ${i} 🔥` });
                        data.total_messages_sent++;
                        await new Promise(r => setTimeout(r, 100));
                    }
                    saveData();
                }
            }
        } catch (err) {
            console.log("Error handling message: ", err);
        }
    });
}

loadData();
connectToWhatsApp().catch(err => console.log("Connection Error: ", err));
