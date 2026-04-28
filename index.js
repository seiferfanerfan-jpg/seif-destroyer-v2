const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const { Boom } = require("@hapi/boom");
const qrcode = require('qrcode-terminal');

// --- الإعدادات ---
const ADMIN_NUMBER = "201226599219"; 
const PASSWORD = "SEIF"; 

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
            console.log("✅ [الجحيم مفتوح] - البوت متصل وجاهز لاستلام الأوامر!");
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
            
            console.log(`📩 رسالة جديدة من [${senderNumber}]: ${text}`);

            // التحقق من المدير (بطريقة مرنة)
            const isAdmin = senderNumber.includes(ADMIN_NUMBER);

            if (isAdmin) {
                console.log("👑 المدير يتحدث...");
                if (text.toLowerCase() === "start" || text === "SEIF" || text === "مدير" || text === "قائمة") {
                    const menu = "أهلاً ي زعيم 🫡\n\n1️⃣ - الإحصائيات\n2️⃣ - تدمير [الرقم]\n3️⃣ - حظر بلاغات [الرقم]\n4️⃣ - قصف سريع [الرقم] [العدد] [النص]";
                    await sock.sendMessage(sender, { text: menu });
                    return;
                }

                if (text === "1") {
                    await sock.sendMessage(sender, { text: "📊 البوت يعمل بكفاءة وجاهز للقصف!" });
                } else if (text.startsWith("2 ") || text.startsWith("تدمير ")) {
                    const targetNum = text.split(" ")[1];
                    const target = targetNum + "@s.whatsapp.net";
                    await sock.sendMessage(sender, { text: `😈 جاري تدمير ${targetNum}...` });
                    for (const m of DESTRUCTION_MESSAGES) {
                        await sock.sendMessage(target, { text: `🔥 ${m} 🔥` });
                        await new Promise(r => setTimeout(r, 150));
                    }
                    await sock.sendMessage(sender, { text: `✅ تم سحق ${targetNum} بنجاح!` });
                } else if (text.startsWith("3 ") || text.startsWith("حظر ")) {
                    const targetNum = text.split(" ")[1];
                    const target = targetNum + "@s.whatsapp.net";
                    await sock.sendMessage(sender, { text: `⚔️ جاري رجم ${targetNum} بالبلاغات...` });
                    for (let i = 1; i <= 50; i++) {
                        await sock.sendMessage(target, { text: `🔥 بلاغ تدميري رقم ${i} من جحيم SEIF 🔥` });
                        if (i % 10 === 0) console.log(`Sent ${i} reports to ${targetNum}`);
                        await new Promise(r => setTimeout(r, 100));
                    }
                    await sock.sendMessage(sender, { text: `✅ تم الانتهاء من قصف ${targetNum}!` });
                } else if (text.startsWith("4 ")) {
                    const parts = text.split(" ");
                    const target = parts[1] + "@s.whatsapp.net";
                    const count = parseInt(parts[2]);
                    const content = parts.slice(3).join(" ");
                    await sock.sendMessage(sender, { text: `🚀 قصف سريع (${count}) مرات على ${parts[1]}...` });
                    for (let i = 0; i < count; i++) {
                        await sock.sendMessage(target, { text: content });
                        await new Promise(r => setTimeout(r, 50));
                    }
                    await sock.sendMessage(sender, { text: "✅ تم القصف السريع!" });
                }
                return;
            }

            // أوامر المستخدمين
            if (text.toLowerCase() === "start" || text === "SEIF" || text === "قائمة") {
                await sock.sendMessage(sender, { text: "⚠️ أدخل كلمة المرور للإكمال:" });
                return;
            }

            if (text === PASSWORD) {
                await sock.sendMessage(sender, { text: "🔓 تم التحقق!\n\n1️⃣ - تدمير [الرقم]\n2️⃣ - حظر بلاغات [الرقم]\n\n(مثال: 1 20123456789)" });
                return;
            }

            if (text.startsWith("1 ")) {
                const targetNum = text.split(" ")[1];
                const target = targetNum + "@s.whatsapp.net";
                await sock.sendMessage(sender, { text: "😈 جاري التدمير..." });
                for (const m of DESTRUCTION_MESSAGES) {
                    await sock.sendMessage(target, { text: `🔥 ${m} 🔥` });
                    await new Promise(r => setTimeout(r, 300));
                }
                await sock.sendMessage(sender, { text: "✅ تم التدمير." });
            } else if (text.startsWith("2 ")) {
                const targetNum = text.split(" ")[1];
                const target = targetNum + "@s.whatsapp.net";
                await sock.sendMessage(sender, { text: "⚔️ جاري إرسال البلاغات..." });
                for (let i = 1; i <= 30; i++) {
                    await sock.sendMessage(target, { text: `🔥 بلاغ رقم ${i} 🔥` });
                    await new Promise(r => setTimeout(r, 200));
                }
                await sock.sendMessage(sender, { text: "✅ تم الإرسال." });
            }
        } catch (err) {
            console.log("❌ خطأ في معالجة الرسالة: ", err);
        }
    });
}

connectToWhatsApp().catch(err => console.log("❌ خطأ في الاتصال: ", err));
