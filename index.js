// تحديد المنفذ قبل تحميل أي مكتبة لتجنب تعارض المنافذ
process.env.PORT = '4000';

// ==========================================
// 🛡️ نظام السهر (Uptime) - لجعل القلعة مستيقظة 24/7
// ==========================================
const http = require('http');

http.createServer(function (req, res) {
  res.write("🏰 قلعة الدايميو أشرف مؤمنة.. جين ساكاي مستيقظ ويحمي الأسوار!");
  res.end();
}).listen(3000); 

console.log("⚔️ نظام السهر (Uptime) يعمل الآن على المنفذ 3000");

// ==========================================
// 📚 الجزء الأول: المكتبات والتعريفات الأساسية (كاملة 100%)
// ==========================================
const fs = require('fs');
const login = require("fca-project-orion"); // المكتبة الأساسية للفيس بوك
const axios = require("axios");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- [ ⚙️ إعدادات الشوغون ] ---
const config = {
    prefix: "!",              // الرمز الذي يبدأ به الأمر
    adminID: "61585565456013",
    botID: "61575591201693",
    groupName: "قلعة جين ساكاي", // اسم المجموعة الثابت
    lockName: true,             // منع تغيير اسم المجموعة لغير الإدارة
    aiActive: true,             // تفعيل الرد الذكي تلقائياً
    bannedWords: ["كلمة1", "كلمة2", "كلمة3"] // 🔴 غيّر الكلمات الممنوعة
};

// --- [ 💾 قاعدة بيانات القلعة ] ---
let db = {
    msgCount: {},    // عداد الرسائل للرتب
    nicknames: {},   // ألقاب المحاربين
    forcedUsers: [], // المسجونين (الذين لا يمكنهم الخروج)
    subAdmins: [],   // نواب الشوغون (الذين عينهم أشرف)
    warnings: {},    // ⚠️ عداد التحذيرات لكل مستخدم
    frozenUsers: []  // ❄️ المجمدون (لا يرد عليهم الذكاء الاصطناعي)
};

// تحميل البيانات من الملف لضمان عدم ضياع الرتب والنواب
if (fs.existsSync('./database.json')) {
    try {
        db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
        // ضمان وجود الحقول الجديدة في قاعدة بيانات قديمة
        if (!db.warnings) db.warnings = {};
        if (!db.frozenUsers) db.frozenUsers = [];
    } catch (e) {
        console.log("⚠️ قاعدة البيانات فارغة، سيتم البدء من جديد.");
    }
}

// دالة حفظ البيانات (تلقائية عند كل تغيير)
function saveDB() {
    fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

// --- [ 🎖️ نظام الرتب العسكرية المتطور ] ---
function getRank(count) {
    if (count > 10000) return "إمبراطور الحرب الخالد 🔱";
    if (count > 5000)  return "شوغون القلعة العظيم ⛩️";
    if (count > 2000)  return "جنرال الساموراي ⚔️";
    if (count > 1000)  return "قائد الكتيبة 🛡️";
    if (count > 500)   return "محارب مخضرم 🏹";
    if (count > 100)   return "جندي شجاع 🗡️";
    return "متدرب مستجد 🌱";
}

// --- [ 🧠 محرك الذكاء الاصطناعي (GPT) ] ---
async function askGPT(prompt) {
    try {
        // محرك بحث ذكي مدمج مع GPT للرد على الجميع
        const res = await axios.get(`https://api.kenliejugar.com/gptgo/?text=${encodeURIComponent(prompt)}`);
        return res.data.response || "اعتذر يا سيدي، ضباب المعركة حجب عني الرؤية.";
    } catch (e) {
        return "فشلت في الاتصال بالعقل الحكيم حالياً.";
    }
}

// --- [ 👁️ بصيرة الشبح (تحليل الصور بـ Gemini) ] ---
async function askGemini(prompt, imageUrl) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return "مفتاح GEMINI_API_KEY غير موجود في المتغيرات البيئية.";

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // جلب الصورة وتحويلها إلى base64
        const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBase64 = Buffer.from(imageRes.data).toString('base64');
        const mimeType = imageRes.headers['content-type'] || 'image/jpeg';

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType } }
        ]);
        return result.response.text() || "لم أستطع تحليل تفاصيل هذه الصورة.";
    } catch (e) {
        return "بصيرتي لا تستطيع تحليل هذه الصورة الآن.";
    }
}

// --- [ 🎤 محرك الرد الصوتي الملكي (TTS) ] ---
async function sendVoice(api, threadID, text) {
    try {
        const pathVoice = path.resolve(__dirname, 'voice.mp3');
        const res = await axios.get(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`, {
            responseType: 'arraybuffer'
        });
        fs.writeFileSync(pathVoice, Buffer.from(res.data));
        api.sendMessage({ 
            body: "🗣️ رسالة صوتية من جين ساكاي:",
            attachment: fs.createReadStream(pathVoice) 
        }, threadID, () => {
            if (fs.existsSync(pathVoice)) fs.unlinkSync(pathVoice);
        });
    } catch (e) {
        console.error("خطأ في نظام الصوت:", e);
    }
}

// --- [ 🔍 محرك البحث الشامل (Google Search) ] ---
async function googleSearch(query) {
    try {
        // محرك استطلاع الويب لجلب المعلومات للدايميو
        const res = await axios.get(`https://api.kenliejugar.com/google_search/?text=${encodeURIComponent(query)}`);
        if (res.data && res.data.response) {
            return `🔎 نتائج الاستطلاع للدايميو أشرف:\n\n${res.data.response}`;
        }
        return "لم أجد أي معلومات في المخطوطات الحالية.";
    } catch (e) {
        return "تعذر عليّ الوصول للمخطوطات العالمية حالياً.";
    }
}

// ==========================================
// 4. معالجة الفعاليات والأوامر (الإصدار الإمبراطوري المتكامل 2026)
// ==========================================

// ✅ إصلاح #3: التحقق من وجود appstate.json قبل التشغيل
if (!fs.existsSync('./appstate.json')) {
    console.error("❌ ملف appstate.json غير موجود! ضعه في نفس مجلد البوت ثم أعد التشغيل.");
    process.exit(1);
}

const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

// التأكد من وجود مصفوفة النواب في قاعدة البيانات لضمان عدم حدوث خطأ
if (!db.subAdmins) db.subAdmins = [];

// ✅ إصلاح #5: متغير لتتبع حالة تأكيد النشر
let pendingAnnounce = {};

login({appState}, (err, api) => {
    if(err) return console.error("❌ فشل الدخول: تأكد من صحة ملف appstate.json");
    
    api.setOptions({
        listenEvents: true,
        selfListen: false,
        forceLogin: true,
        online: true,
        autoMarkRead: true,
        autoMarkDelivery: true
    });

    console.log("✅ جين ساكاي في كامل عتاده لخدمة الدايميو أشرف ونوابه!");

    api.listenMqtt(async (err, event) => {
        if (err) return;
        const { threadID, senderID, body, type, messageID, logMessageType, logMessageData, attachments } = event;
        const isGroup = event.participantIDs && event.participantIDs.length > 0;
        const now = new Date();

        // تحديد الرتب السيادية (المالك والنائب)
        const isMainAdmin = (senderID === config.adminID);
        const isSubAdmin = db.subAdmins.includes(senderID);
        const hasPower = isMainAdmin || isSubAdmin;

        // [تحديث عداد الرسائل ونظام الخبرة]
        if (body) { 
            db.msgCount[senderID] = (db.msgCount[senderID] || 0) + 1; 
            saveDB(); 
        }

        // --- [ 📥 فعاليات المجموعات والترحيب ] ---
        if (isGroup && logMessageType === "log:subscribe") {
            const addedParticipants = logMessageData.addedParticipants;
            for (let participant of addedParticipants) {
                const newID = participant.userFbId;
                api.getUserInfo(newID, async (err, ret) => {
                    const name = err ? "محارب جديد" : ret[newID].name;
                    api.sendMessage(`[ 📥 دخول ]\n👤 الإسم: ${name}\n📌 انضم لقلعة الدايميو أشرف.`, threadID);
                    await sendVoice(api, threadID, `أهلاً بك يا ${name} في قلعة الدايميو أشرف.`);
                });
            }
        }

        // --- [ ⛓️ نظام السجن القسري والإعادة ] ---
        if (isGroup && logMessageType === "log:unsubscribe") {
            const leftID = logMessageData.leftParticipantFbId;
            if (db.forcedUsers.includes(leftID)) {
                api.addUserToGroup(leftID, threadID, (err) => {
                    if(!err) sendVoice(api, threadID, "لا هروب من العدالة! عُد للسجن فوراً بأمر الدايميو أشرف.");
                });
            }
        }

        // [حماية اسم المجموعة]
        if (type === "change_thread_name" && config.lockName && !hasPower) {
            api.setTitle(config.groupName, threadID);
        }

        // [بصيرة الساموراي - تحليل الصور بالذكاء الاصطناعي]
        if (attachments && attachments.length > 0 && attachments[0].type === "photo" && config.aiActive) {
            const imageDesc = await askGemini("بصفتك جين ساكاي، ماذا ترى في هذه الصورة؟", attachments[0].url);
            api.sendMessage(`📸 بصيرة الشبح: \n${imageDesc}`, threadID);
        }

        // --- [ 🛡️ فلتر الكلمات الممنوعة التلقائي ] ---
        if (body && isGroup && !hasPower) {
            const lowerBody = body.toLowerCase();
            const hasBannedWord = config.bannedWords.some(w => lowerBody.includes(w.toLowerCase()));
            if (hasBannedWord) {
                api.unsendMessage(messageID);
                db.warnings[senderID] = (db.warnings[senderID] || 0) + 1; saveDB();
                const warnCount = db.warnings[senderID];
                if (warnCount >= 3) {
                    api.removeUserFromGroup(senderID, threadID);
                    api.sendMessage(`⛔ تم طرد المخالف بعد 3 تحذيرات!`, threadID);
                    db.warnings[senderID] = 0; saveDB();
                } else {
                    api.sendMessage(`⚠️ تحذير ${warnCount}/3: رسالتك تحتوي على كلمات ممنوعة!`, threadID);
                }
                return;
            }
        }

        // --- [ 🛡️ قسم الأوامر التنفيذية - (الدايميو والنائب) ] ---
        if (body && body.startsWith(config.prefix) && hasPower) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            switch(command) {
                // 👑 أوامر حصرية للدايميو أشرف فقط
                case "نائب":
                    if (isMainAdmin && event.messageReply) {
                        const targetID = event.messageReply.senderID;
                        if (!db.subAdmins.includes(targetID)) {
                            db.subAdmins.push(targetID); saveDB();
                            api.sendMessage("🎖️ تم تعيينك نائباً للشوغون بصلاحيات القيادة.", threadID);
                        }
                    } else if (!isMainAdmin) api.sendMessage("🚫 هذا الأمر للدايميو أشرف فقط.", threadID);
                    break;

                case "عزل":
                    if (isMainAdmin && event.messageReply) {
                        db.subAdmins = db.subAdmins.filter(id => id !== event.messageReply.senderID);
                        saveDB(); api.sendMessage("🚫 تم تجريد النائب من رتبته وصلاحياته.", threadID);
                    }
                    break;

                case "اسم_البوت":
                    const newBotName = args.join(" ");
                    if (newBotName) { 
                        api.changeNickname(newBotName, threadID, config.botID); 
                        api.sendMessage(`🎭 تم تغيير هيئتي إلى: ${newBotName}`, threadID); 
                    }
                    break;

                case "اختفاء":
                    config.aiActive = false;
                    api.sendMessage("🌑 الشبح يذوب في الظلام.. سأصمت إلا لأوامر القيادة.", threadID);
                    break;

                // ⚔️ أوامر مشتركة (الدايميو + النائب)
                case "سجن":
                    if (event.messageReply) {
                        const tID = event.messageReply.senderID;
                        if (!db.forcedUsers.includes(tID)) {
                            db.forcedUsers.push(tID); saveDB();
                            api.sendMessage("⛓️ إلى الزنزانة! تم تصفيد المتمرد.", threadID);
                            await sendVoice(api, threadID, "أنت الآن ملك للقلعة، لا خروج إلا بإذن.");
                        }
                    }
                    break;

                case "افراج":
                    if (event.messageReply) {
                        db.forcedUsers = db.forcedUsers.filter(id => id !== event.messageReply.senderID);
                        saveDB(); api.sendMessage("🔓 صدر عفو، أنت حر طليق.", threadID);
                    }
                    break;

                case "قل":
                    let content = body.match(/\(([^)]+)\)/); 
                    if (content && content[1]) await sendVoice(api, threadID, content[1]);
                    else api.sendMessage("⚠️ استخدم: !قل (النص)", threadID);
                    break;

                case "نشر":
                    const announce = args.join(" ");
                    if (!announce) return api.sendMessage("⚠️ استخدم: !نشر [الرسالة]", threadID);
                    pendingAnnounce[senderID] = announce;
                    api.sendMessage(`📢 هل أنت متأكد من نشر هذه الرسالة لجميع المجموعات؟\n\n"${announce}"\n\nاكتب: !تأكيد_نشر للتأكيد، أو !إلغاء_نشر للإلغاء.`, threadID);
                    break;

                case "تأكيد_نشر":
                    if (pendingAnnounce[senderID]) {
                        const msg = pendingAnnounce[senderID];
                        delete pendingAnnounce[senderID];
                        api.getThreadList(100, null, ["INBOX"], (err, list) => {
                            if (list) list.forEach(t => { if (t.isGroup) api.sendMessage(`📢 بلاغ إمبراطوري:\n\n${msg}`, t.threadID); });
                        });
                        api.sendMessage("✅ تم النشر في جميع المجموعات.", threadID);
                    }
                    break;

                case "إلغاء_نشر":
                    if (pendingAnnounce[senderID]) {
                        delete pendingAnnounce[senderID];
                        api.sendMessage("❌ تم إلغاء عملية النشر.", threadID);
                    }
                    break;

                case "كشف":
                    if (event.messageReply) {
                        const tID = event.messageReply.senderID;
                        api.sendMessage(`👁️ تقرير:\n🆔 المعرف: ${tID}\n📈 الرسائل: ${db.msgCount[tID] || 0}\n🎖️ الرتبة: ${getRank(db.msgCount[tID] || 0)}\n⚠️ التحذيرات: ${db.warnings[tID] || 0}/3`, threadID);
                    }
                    break;

                case "حظي":
                    const luckPool = ["ساموراي محظوظ ✨", "رونين منحوس 🔪", "الدايميو راضٍ عنك 👑", "نصر قريب ⚔️", "احذر الغدر 👺"];
                    api.sendMessage(`🔮 النبوءة: ${luckPool[Math.floor(Math.random() * luckPool.length)]}`, threadID);
                    break;

                case "القوانين":
                    await sendVoice(api, threadID, "الولاء المطلق لأشرف، يمنع التمرد، والجزاء هو السجن المصفد.");
                    break;

                case "ابحث":
                    api.sendMessage("⏳ جاري استطلاع الويب...", threadID);
                    api.sendMessage(await googleSearch(args.join(" ")), threadID);
                    break;

                case "طرد":
                    if (event.messageReply) {
                        api.removeUserFromGroup(event.messageReply.senderID, threadID);
                        api.sendMessage("🚫 تم نفي المتمرد خارج أسوار القلعة.", threadID);
                    }
                    break;

                case "مسح":
                    for(let i=0; i<15; i++) api.sendMessage(".\n‎\n.", threadID);
                    break;

                case "تنبيه":
                    await sendVoice(api, threadID, "انتباه! القيادة تناديكم، اصمتوا واستمعوا!");
                    break;

                // 🆕 تجميد الذكاء الاصطناعي عن شخص معين
                case "تجميد":
                    if (event.messageReply) {
                        const tID = event.messageReply.senderID;
                        if (!db.frozenUsers.includes(tID)) {
                            db.frozenUsers.push(tID); saveDB();
                            api.sendMessage("❄️ تم تجميد هذا المحارب، الذكاء الاصطناعي لن يرد عليه.", threadID);
                        }
                    }
                    break;

                case "رفع_تجميد":
                    if (event.messageReply) {
                        db.frozenUsers = db.frozenUsers.filter(id => id !== event.messageReply.senderID);
                        saveDB(); api.sendMessage("🔥 تم رفع التجميد، المحارب حر في التحدث.", threadID);
                    }
                    break;

                // 🆕 عرض قائمة النواب بأسمائهم
                case "نواب":
                    if (db.subAdmins.length === 0) {
                        api.sendMessage("📋 لا يوجد نواب معينون حالياً.", threadID);
                    } else {
                        let subList = "📋 قائمة نواب الشوغون:\n";
                        let counter = 1;
                        const fetchNext = (index) => {
                            if (index >= db.subAdmins.length) return api.sendMessage(subList, threadID);
                            api.getUserInfo(db.subAdmins[index], (err, ret) => {
                                const name = err ? db.subAdmins[index] : ret[db.subAdmins[index]].name;
                                subList += `${counter++}. ${name}\n`;
                                fetchNext(index + 1);
                            });
                        };
                        fetchNext(0);
                    }
                    break;

                // 🆕 تحذير يدوي
                case "تحذير":
                    if (event.messageReply) {
                        const tID = event.messageReply.senderID;
                        db.warnings[tID] = (db.warnings[tID] || 0) + 1; saveDB();
                        const wCount = db.warnings[tID];
                        if (wCount >= 3) {
                            api.removeUserFromGroup(tID, threadID);
                            api.sendMessage("⛔ تم طرد المخالف بعد 3 تحذيرات!", threadID);
                            db.warnings[tID] = 0; saveDB();
                        } else {
                            api.sendMessage(`⚠️ تحذير ${wCount}/3 للمحارب. عند التجاوز الثالث سيُطرد.`, threadID);
                        }
                    }
                    break;

                // 🆕 عفو عن التحذيرات
                case "عفو":
                    if (event.messageReply) {
                        db.warnings[event.messageReply.senderID] = 0; saveDB();
                        api.sendMessage("✅ تم محو سجل التحذيرات لهذا المحارب.", threadID);
                    }
                    break;

                case "أوامر":
                    let menu = isMainAdmin ? "👑 أوامر الدايميو الحصرية: !نائب | !عزل | !اسم_البوت | !اختفاء\n" : "🎖️ رتبة: نائب الشوغون\n";
                    menu += "⚔️ سـلطة: !قل | !سجن | !افراج | !كشف | !مسح | !نشر | !ابحث | !حظي | !القوانين | !طرد | !تنبيه\n";
                    menu += "🆕 جديد: !تجميد | !رفع_تجميد | !نواب | !تحذير | !عفو | !هدوء | !تكلم\n";
                    menu += "📊 للجميع: !رتبتي | !لقب [اللقب] | !المتصدرين";
                    api.sendMessage(menu, threadID);
                    break;

                case "هدوء": config.aiActive = false; api.sendMessage("🚫 صمت.", threadID); break;
                case "تكلم": config.aiActive = true; api.sendMessage("🗣️ نطق.", threadID); break;
            }
            return;
        }

        // --- [ 📊 أوامر الجميع (متاحة لكل أعضاء المجموعة) ] ---
        if (body && body.startsWith(config.prefix)) {
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            switch(command) {
                // 🆕 عرض رتبة المستخدم لنفسه
                case "رتبتي":
                    const myCount = db.msgCount[senderID] || 0;
                    api.sendMessage(`🎖️ بطاقة المحارب:\n👤 اللقب: ${db.nicknames[senderID] || "لا لقب"}\n📈 الرسائل: ${myCount}\n🏅 الرتبة: ${getRank(myCount)}\n⚠️ التحذيرات: ${db.warnings[senderID] || 0}/3`, threadID);
                    break;

                // 🆕 تغيير اللقب الشخصي
                case "لقب":
                    const newNick = args.join(" ");
                    if (newNick) {
                        db.nicknames[senderID] = newNick; saveDB();
                        api.sendMessage(`✅ تم تعيين لقبك: ${newNick}`, threadID);
                    } else api.sendMessage("⚠️ استخدم: !لقب [اللقب]", threadID);
                    break;

                // 🆕 لوحة المتصدرين
                case "المتصدرين":
                    const sorted = Object.entries(db.msgCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    if (sorted.length === 0) {
                        api.sendMessage("📊 لا توجد بيانات بعد.", threadID);
                    } else {
                        let board = "🏆 أكثر 5 محاربين نشاطاً:\n";
                        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                        const fetchLeader = (i) => {
                            if (i >= sorted.length) return api.sendMessage(board, threadID);
                            api.getUserInfo(sorted[i][0], (err, ret) => {
                                const name = err ? sorted[i][0] : ret[sorted[i][0]].name;
                                board += `${medals[i]} ${name}: ${sorted[i][1]} رسالة - ${getRank(sorted[i][1])}\n`;
                                fetchLeader(i + 1);
                            });
                        };
                        fetchLeader(0);
                    }
                    break;
            }
            return;
        }

        // --- [ 🤖 محرك الرد الذكي والتفاعل ] ---
        if (config.aiActive && body && !body.startsWith(config.prefix) && senderID !== config.botID) {
            
            // لا يرد على المجمدين
            if (db.frozenUsers.includes(senderID)) return;

            // 1. التفاعل مع الدايميو أشرف في المجموعات بالإيموجي فقط
            if (isGroup && isMainAdmin) {
                const reacts = ["👑", "🔥", "🫡", "⚔️", "🏯", "👻"];
                api.setMessageReaction(reacts[Math.floor(Math.random() * reacts.length)], messageID);
                return;
            }

            // 2. الرد النصي الذكي للجميع (في الخاص وفي المجموعات)
            const userRank = getRank(db.msgCount[senderID] || 0);
            const userNick = db.nicknames[senderID] || "المحارب";
            const context = isGroup ? `في المجموعة` : `في محادثة خاصة`;
            const prompt = `بصفتك جين ساكاي، رد ${context} بحكمة ووقار على [${userRank}] الملقب بـ [${userNick}] الذي قال: "${body}"`;
            
            const response = await askGPT(prompt);
            api.sendMessage(response, threadID);
        }
    }); // نهاية listenMqtt
});
