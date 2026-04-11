// ==========================================
// 🏯 بوت جين ساكاي - الإصدار الإمبراطوري المتكامل
// المطور: أشرف | آيدي الدايميو: 61585565456013
// ==========================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const login = require('fca-project-orion');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// ==========================================
// ⚙️ إعدادات الشوغون
// ==========================================
const config = {
  prefix: '!',
  adminID: '61585565456013',
  botID: '61575591201693',
  botName: 'جين ساكاي',
  developerName: 'أشرف',
  aiActive: true,
  triggerWords: ['جين', 'بوت', 'jin', 'bot'],
  replyDelay: 1000,
  GEMINI_API_KEY: 'AIzaSyD-X1_J6Q4wV9z2L8k0M3n7P5r4S6t1U',
  OPENAI_API_KEY: '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'
};

// ==========================================
// 💾 قاعدة البيانات
// ==========================================
let db = {
  msgCount: {},
  subAdmins: [],
  warnings: {},
  activeGroups: [],
  groupNames: {},
  groupPhotos: {}
};

if (fs.existsSync('./database.json')) {
  try {
    db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
    if (!db.msgCount) db.msgCount = {};
    if (!db.subAdmins) db.subAdmins = {};
    if (!db.warnings) db.warnings = {};
    if (!db.activeGroups) db.activeGroups = [];
    if (!db.groupNames) db.groupNames = {};
    if (!db.groupPhotos) db.groupPhotos = {};
  } catch (e) {
    console.log('⚠️ قاعدة البيانات فارغة، سيتم البدء من جديد.');
  }
}

function saveDB() {
  fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

// ==========================================
// 🎖️ نظام الرتب
// ==========================================
function getRank(count) {
  if (count > 10000) return 'إمبراطور الحرب 🔱';
  if (count > 5000) return 'شوغون القلعة ⛩️';
  if (count > 2000) return 'جنرال الساموراي ⚔️';
  if (count > 1000) return 'قائد الكتيبة 🛡️';
  if (count > 500) return 'محارب مخضرم 🏹';
  if (count > 100) return 'جندي شجاع 🗡️';
  return 'متدرب مستجد 🌱';
}

function getRankNickname(count, name) {
  if (count > 10000) return `الإمبراطور ${name}`;
  if (count > 5000) return `الشوغون ${name}`;
  if (count > 2000) return `الجنرال ${name}`;
  if (count > 1000) return `القائد ${name}`;
  if (count > 500) return `المحارب ${name}`;
  if (count > 100) return `الجندي ${name}`;
  return `المتدرب ${name}`;
}

// ==========================================
// 🕐 دوال الوقت
// ==========================================
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'صباح النور';
  if (hour >= 12 && hour < 17) return 'نهارك سعيد';
  if (hour >= 17 && hour < 21) return 'مساء النور';
  return 'تصبح على خير';
}

function getFormattedTime() {
  const now = new Date();
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const day = days[now.getDay()];
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const period = now.getHours() >= 12 ? 'مساءً' : 'صباحاً';
  return { day, time: `${hours}:${minutes} ${period}` };
}

// ==========================================
// 🧠 محركات الذكاء الاصطناعي
// ==========================================
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

let usingGemini = false;

async function askAI(prompt, isAdmin = false) {
  const systemPrompt = `أنت جين ساكاي، بوت ذكي يعمل في مجموعات فيسبوك ماسنجر.
شخصيتك: ساموراي حكيم يتكيف مع أسلوب المحادثة - جدي مع الجدية، مرح مع المرح.
تتحدث العربية والإنجليزية وتستخدم كلمات يابانية أحياناً (هاي، سنسي، دايميو، ساموراي، نان، اريغاتو...).
${isAdmin ? 'هذا الشخص هو الدايميو أشرف، مطورك وسيدك، عامله باحترام خاص وناده بـ "دايميو أشرف".' : ''}
ردودك مختصرة وذكية وتناسب السياق.`;

  // محاولة ChatGPT أولاً
  if (!usingGemini) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300
      });
      return { text: res.choices[0].message.content, engine: 'gpt' };
    } catch (e) {
      usingGemini = true;
      return { text: await askGeminiText(prompt, systemPrompt), engine: 'gemini', switched: true };
    }
  } else {
    return { text: await askGeminiText(prompt, systemPrompt), engine: 'gemini' };
  }
}

async function askGeminiText(prompt, systemPrompt = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\nالمستخدم: ${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (e) {
    return 'اعتذر يا سيدي، ضباب المعركة حجب عني الرؤية مؤقتاً.';
  }
}

async function analyzeImage(prompt, imageUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageRes.data).toString('base64');
    const mimeType = imageRes.headers['content-type'] || 'image/jpeg';
    const result = await model.generateContent([
      `أنت جين ساكاي، ساموراي حكيم. ${prompt}`,
      { inlineData: { data: imageBase64, mimeType } }
    ]);
    return result.response.text();
  } catch (e) {
    return 'بصيرتي لا تستطيع تحليل هذه الصورة الآن.';
  }
}

async function generateImage(description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' });
    const result = await model.generateContent([
      { text: `Generate an image of: ${description}` }
    ]);
    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData) {
        return { success: true, data: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
    return { success: false };
  } catch (e) {
    return { success: false };
  }
}

async function searchWeb(query) {
  try {
    const res = await axios.get(`https://api.kenliejugar.com/gptgo/?text=${encodeURIComponent(query + ' اعطني ملخصاً مختصراً')}`);
    return res.data.response || 'لم أجد نتائج.';
  } catch (e) {
    return 'تعذر البحث حالياً.';
  }
}

// ==========================================
// 🎤 نظام الصوت
// ==========================================
async function sendVoice(api, threadID, text, replyMsgID = null) {
  try {
    const voicePath = path.resolve(__dirname, 'voice.mp3');
    const lang = /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
    const res = await axios.get(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`,
      { responseType: 'arraybuffer' }
    );
    fs.writeFileSync(voicePath, Buffer.from(res.data));
    const msgObj = {
      body: '🗣️ رسالة صوتية من جين ساكاي:',
      attachment: fs.createReadStream(voicePath)
    };
    if (replyMsgID) msgObj.replyToMessage = replyMsgID;
    api.sendMessage(msgObj, threadID, () => {
      if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
    });
  } catch (e) {
    console.error('خطأ في نظام الصوت:', e.message);
  }
}

// ==========================================
// 📨 رسائل الدخول والخروج
// ==========================================
function buildWelcomeMessage(memberName, addedByName) {
  const { day, time } = getFormattedTime();
  const greeting = getGreeting();
  return `╔══════════════════════╗
⛩️ ~ دخول محارب جديد ~ ⛩️
╚══════════════════════╝

🌸 ${greeting} يا ${memberName} 🌸

لقد فتحت أبواب القلعة بأمر من
⚔️ ${addedByName}

📅 اليوم: ${day}
🕐 الساعة: ${time}

«كل ساموراي عظيم بدأ بخطوة أولى»
~ جين ساكاي ~`;
}

function buildLeaveMessage(memberName, kicked = false) {
  const { day, time } = getFormattedTime();
  return `╔══════════════════════╗
⛩️ ~ مغادرة محارب ~ ⛩️
╚══════════════════════╝

🍂 ${memberName} غادر القلعة 🍂
${kicked ? '\n⚔️ تم نفيه بأمر القيادة\n' : ''}
📅 اليوم: ${day}
🕐 الساعة: ${time}

«كل رحيل بداية طريق جديد»
~ جين ساكاي ~`;
}

// ==========================================
// 🛡️ نظام Uptime
// ==========================================
http.createServer((req, res) => {
  res.write('🏯 قلعة جين ساكاي مؤمنة.. الشبح مستيقظ!');
  res.end();
}).listen(3000);
console.log('⚔️ نظام السهر يعمل على المنفذ 3000');

// ==========================================
// ✅ التحقق من appstate.json
// ==========================================
if (!fs.existsSync('./appstate.json')) {
  console.error('❌ ملف appstate.json غير موجود!');
  process.exit(1);
}

const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

// ==========================================
// 🚀 تشغيل البوت
// ==========================================
login({ appState }, (err, api) => {
  if (err) return console.error('❌ فشل الدخول:', err);

  api.setOptions({
    listenEvents: true,
    selfListen: false,
    forceLogin: true,
    online: true,
    autoMarkRead: true,
    autoMarkDelivery: true
  });

  console.log('✅ جين ساكاي جاهز لخدمة الدايميو أشرف!');

  // متغير لتتبع الطرد
  const recentlyKicked = new Set();

  api.listenMqtt(async (err, event) => {
    if (err) return;

    const {
      threadID, senderID, body, type,
      messageID, logMessageType, logMessageData, attachments
    } = event;

    const isGroup = event.participantIDs && event.participantIDs.length > 0;
    const isMainAdmin = senderID === config.adminID;
    const isSubAdmin = db.subAdmins[threadID] && db.subAdmins[threadID].includes(senderID);
    const hasPower = isMainAdmin || isSubAdmin;
    const botActive = !isGroup || db.activeGroups.includes(threadID);

    // عداد الرسائل
    if (body && senderID !== config.botID) {
      db.msgCount[senderID] = (db.msgCount[senderID] || 0) + 1;
      saveDB();
    }

    // ==========================================
    // 📥 فعالية الدخول
    // ==========================================
    if (isGroup && logMessageType === 'log:subscribe' && botActive) {
      const added = logMessageData.addedParticipants;
      for (const participant of added) {
        const newID = participant.userFbId;

        // إعادة أشرف إذا أُضيف مجدداً (كان خرج)
        if (newID === config.adminID) continue;

        api.getUserInfo(newID, async (err, ret) => {
          const newName = err ? 'محارب جديد' : ret[newID].name;

          // جلب اسم من أضافه
          let adderName = 'القيادة';
          if (logMessageData.author) {
            await new Promise(resolve => {
              api.getUserInfo(logMessageData.author, (e, r) => {
                if (!e && r[logMessageData.author]) adderName = r[logMessageData.author].name;
                resolve();
              });
            });
          }

          api.sendMessage(buildWelcomeMessage(newName, adderName), threadID);
        });
      }
    }

    // ==========================================
    // 📤 فعالية الخروج
    // ==========================================
    if (isGroup && logMessageType === 'log:unsubscribe' && botActive) {
      const leftID = logMessageData.leftParticipantFbId;

      // إعادة أشرف تلقائياً
      if (leftID === config.adminID) {
        setTimeout(() => {
          api.addUserToGroup(config.adminID, threadID);
        }, 2000);
        return;
      }

      api.getUserInfo(leftID, (err, ret) => {
        const leftName = err ? 'محارب' : ret[leftID].name;
        const wasKicked = recentlyKicked.has(leftID);
        if (wasKicked) recentlyKicked.delete(leftID);
        api.sendMessage(buildLeaveMessage(leftName, wasKicked), threadID);
      });
    }

    // ==========================================
    // 🔒 حماية اسم وصورة القروب
    // ==========================================
    if (type === 'change_thread_name' && !hasPower && db.groupNames[threadID]) {
      setTimeout(() => {
        api.setTitle(db.groupNames[threadID], threadID);
      }, 3000);
    }

    // ==========================================
    // 📸 تحليل الصور عند النداء
    // ==========================================
    if (
      attachments && attachments.length > 0 &&
      attachments[0].type === 'photo' &&
      config.aiActive && botActive &&
      body && config.triggerWords.some(w => body.toLowerCase().includes(w.toLowerCase()))
    ) {
      setTimeout(async () => {
        const analysis = await analyzeImage(
          'حلل هذه الصورة وعلق عليها بأسلوبك المتكيف مع محتواها.',
          attachments[0].url
        );
        api.sendMessage(
          { body: `📸 بصيرة الشبح:\n${analysis}`, replyToMessage: messageID },
          threadID
        );
      }, config.replyDelay);
      return;
    }

    // ==========================================
    // 🛡️ معالجة الأوامر
    // ==========================================
    if (body && body.startsWith(config.prefix)) {
      const args = body.slice(config.prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      // ========== أوامر الدايميو الحصرية ==========
      if (isMainAdmin) {
        switch (command) {

          case 'نائب':
          case 'deputy':
            if (event.messageReply) {
              const tID = event.messageReply.senderID;
              if (!db.subAdmins[threadID]) db.subAdmins[threadID] = [];
              if (!db.subAdmins[threadID].includes(tID)) {
                db.subAdmins[threadID].push(tID);
                saveDB();
                api.sendMessage('🎖️ تم تعيينك نائباً للشوغون. صلاحياتك: الطرد، التحذير، الكشف.', threadID);
              } else {
                api.sendMessage('⚠️ هذا المحارب نائب بالفعل.', threadID);
              }
            }
            return;

          case 'عزل':
          case 'remove_deputy':
            if (event.messageReply) {
              const tID = event.messageReply.senderID;
              if (db.subAdmins[threadID]) {
                db.subAdmins[threadID] = db.subAdmins[threadID].filter(id => id !== tID);
                saveDB();
                api.sendMessage('🚫 تم تجريد النائب من صلاحياته.', threadID);
              }
            }
            return;

          case 'هدوء':
          case 'silence':
            config.aiActive = false;
            api.sendMessage('🌑 الشبح يصمت.. سأرد فقط على الأوامر.', threadID);
            return;

          case 'تكلم':
          case 'speak':
            config.aiActive = true;
            api.sendMessage('🗣️ جين ساكاي يتكلم مجدداً.', threadID);
            return;

          case 'تشغيل':
          case 'enable':
            if (!db.activeGroups.includes(threadID)) {
              db.activeGroups.push(threadID);
              saveDB();
            }
            api.sendMessage('✅ جين ساكاي مفعّل في هذه المجموعة.', threadID);
            return;

          case 'إيقاف':
          case 'disable':
            db.activeGroups = db.activeGroups.filter(id => id !== threadID);
            saveDB();
            api.sendMessage('🔴 جين ساكاي موقوف في هذه المجموعة.', threadID);
            return;

          case 'نشر':
          case 'broadcast': {
            const countIndex = args.length - 1;
            const count = parseInt(args[countIndex]);
            if (isNaN(count) || count < 1) {
              api.sendMessage('⚠️ استخدم: !نشر [الرسالة] [عدد المرات]', threadID);
              return;
            }
            const msg = args.slice(0, countIndex).join(' ');
            if (!msg) {
              api.sendMessage('⚠️ استخدم: !نشر [الرسالة] [عدد المرات]', threadID);
              return;
            }
            api.sendMessage(`📢 سيتم إرسال الرسالة ${count} مرة...`, threadID);
            for (let i = 0; i < Math.min(count, 10); i++) {
              setTimeout(() => api.sendMessage(`📢 ${msg}`, threadID), i * 1500);
            }
            return;
          }

          case 'نواب':
          case 'deputies': {
            const subs = db.subAdmins[threadID] || [];
            if (subs.length === 0) {
              api.sendMessage('📋 لا يوجد نواب في هذه المجموعة.', threadID);
              return;
            }
            let list = '📋 قائمة نواب الشوغون:\n';
            let i = 0;
            const fetchNext = () => {
              if (i >= subs.length) return api.sendMessage(list, threadID);
              api.getUserInfo(subs[i], (e, r) => {
                const name = e ? subs[i] : r[subs[i]].name;
                list += `${i + 1}. ${name}\n`;
                i++;
                fetchNext();
              });
            };
            fetchNext();
            return;
          }

          case 'اسم_القروب':
          case 'group_name': {
            api.sendMessage('⏳ جين ساكاي يفكر في أسماء مناسبة...', threadID);
            const suggestions = await askGeminiText(
              'اقترح 5 أسماء إبداعية لمجموعة فيسبوك ذات طابع ساموراي/ياباني باللغة العربية. أرقمها من 1 إلى 5 فقط بدون شرح.'
            );
            api.sendMessage(
              `🎌 اقتراحات أسماء القروب:\n\n${suggestions}\n\nأرسل رقم الاسم المختار وسأطبقه فوراً.`,
              threadID
            );
            // حفظ الاقتراحات مؤقتاً
            db[`pending_name_${threadID}`] = suggestions.split('\n').filter(l => l.trim());
            saveDB();
            return;
          }

          case 'صورة_القروب':
          case 'group_photo':
            if (attachments && attachments.length > 0 && attachments[0].url) {
              try {
                const imgRes = await axios.get(attachments[0].url, { responseType: 'stream' });
                const tmpPath = path.resolve(__dirname, 'group_photo.jpg');
                const writer = fs.createWriteStream(tmpPath);
                imgRes.data.pipe(writer);
                writer.on('finish', () => {
                  api.changeGroupImage(fs.createReadStream(tmpPath), threadID, (e) => {
                    if (!e) {
                      db.groupPhotos[threadID] = attachments[0].url;
                      saveDB();
                      api.sendMessage('🖼️ تم تغيير صورة المجموعة وحمايتها.', threadID);
                    }
                  });
                });
              } catch (e) {
                api.sendMessage('⚠️ تعذر تغيير الصورة.', threadID);
              }
            } else {
              api.sendMessage('⚠️ أرسل صورة مع الأمر.', threadID);
            }
            return;

          case 'كنية':
          case 'nickname': {
            const customText = body.match(/\(([^)]+)\)/);
            if (customText && customText[1]) {
              // كنية موحدة لجميع الأعضاء
              api.getThreadInfo(threadID, (e, info) => {
                if (e || !info) return;
                const members = info.participantIDs;
                let done = 0;
                members.forEach(id => {
                  if (id === config.botID) return;
                  api.changeNickname(customText[1], threadID, id, () => {
                    done++;
                    if (done >= members.length - 1) {
                      api.sendMessage(`✅ تم تعيين الكنية "${customText[1]}" لجميع الأعضاء.`, threadID);
                    }
                  });
                });
              });
            } else {
              // كنية حسب الرتبة
              api.getThreadInfo(threadID, (e, info) => {
                if (e || !info) return;
                const members = info.participantIDs;
                let done = 0;
                members.forEach(id => {
                  if (id === config.botID) return;
                  api.getUserInfo(id, (e2, r) => {
                    if (e2 || !r[id]) return;
                    const name = r[id].name.split(' ')[0];
                    const count = db.msgCount[id] || 0;
                    const nick = getRankNickname(count, name);
                    api.changeNickname(nick, threadID, id, () => {
                      done++;
                      if (done >= members.length - 1) {
                        api.sendMessage('✅ تم تحديث كنيات جميع الأعضاء حسب رتبهم.', threadID);
                      }
                    });
                  });
                });
              });
            }
            return;
          }

          case 'تثبيت':
          case 'pin': {
            if (event.messageReply) {
              // تثبيت رسالة موجودة
              api.sendMessage(`📌 تم تثبيت الرسالة:\n\n"${event.messageReply.body}"`, threadID);
            } else {
              const pinText = args.join(' ');
              if (pinText) {
                api.sendMessage(`📌 رسالة مثبتة:\n\n${pinText}`, threadID);
              } else {
                api.sendMessage('⚠️ استخدم: !تثبيت [النص] أو رد على رسالة', threadID);
              }
            }
            return;
          }
        }
      }

      // ========== أوامر النائب والدايميو ==========
      if (hasPower && botActive) {
        switch (command) {

          case 'طرد':
          case 'kick':
            if (event.messageReply) {
              const tID = event.messageReply.senderID;
              recentlyKicked.add(tID);
              api.removeUserFromGroup(tID, threadID);
            }
            return;

          case 'تحذير':
          case 'warn':
            if (event.messageReply) {
              const tID = event.messageReply.senderID;
              db.warnings[tID] = (db.warnings[tID] || 0) + 1;
              saveDB();
              const w = db.warnings[tID];
              if (w >= 3) {
                recentlyKicked.add(tID);
                api.removeUserFromGroup(tID, threadID);
                api.sendMessage('⛔ تم طرد المحارب بعد 3 تحذيرات!', threadID);
                db.warnings[tID] = 0;
                saveDB();
              } else {
                api.sendMessage(`⚠️ تحذير ${w}/3 للمحارب. عند الثالث سيُطرد.`, threadID);
              }
            }
            return;

          case 'كشف':
          case 'reveal':
            if (event.messageReply) {
              const tID = event.messageReply.senderID;
              api.getUserInfo(tID, (e, r) => {
                const name = e ? 'مجهول' : r[tID].name;
                const count = db.msgCount[tID] || 0;
                api.sendMessage(
                  `👁️ تقرير المحارب:\n👤 الاسم: ${name}\n🆔 الآيدي: ${tID}\n📈 الرسائل: ${count}\n🎖️ الرتبة: ${getRank(count)}`,
                  threadID
                );
              });
            }
            return;

          case 'ابحث':
          case 'search': {
            const query = args.join(' ');
            if (!query) return api.sendMessage('⚠️ استخدم: !ابحث [الموضوع]', threadID);
            api.sendMessage('🔎 جاري الاستطلاع...', threadID);
            const result = await searchWeb(query);
            api.sendMessage(`🔎 نتائج البحث:\n\n${result}`, threadID);
            return;
          }

          case 'قل':
          case 'say': {
            const content = body.match(/\(([^)]+)\)/);
            if (content && content[1]) {
              await sendVoice(api, threadID, content[1]);
            } else {
              api.sendMessage('⚠️ استخدم: !قل (النص)', threadID);
            }
            return;
          }
        }
      }

      // ========== أوامر الجميع ==========
      if (botActive) {
        switch (command) {

          case 'رتبتي':
          case 'rank': {
            const count = db.msgCount[senderID] || 0;
            api.sendMessage(
              `🎖️ بطاقة المحارب:\n📈 الرسائل: ${count}\n🏅 الرتبة: ${getRank(count)}`,
              threadID
            );
            return;
          }

          case 'مزاج':
          case 'mood': {
            const text = args.join(' ');
            if (!text) return api.sendMessage('⚠️ استخدم: !مزاج [النص]', threadID);
            setTimeout(async () => {
              const analysis = await askGeminiText(
                `حلل مزاج هذه الجملة وحدد المشاعر فيها ثم رد عليها بأسلوب جين ساكاي المتكيف مع المزاج: "${text}"`
              );
              api.sendMessage({ body: `🎭 تحليل المزاج:\n${analysis}`, replyToMessage: messageID }, threadID);
            }, config.replyDelay);
            return;
          }

          case 'صورة':
          case 'image': {
            const desc = args.join(' ');
            if (!desc) return api.sendMessage('⚠️ استخدم: !صورة [الوصف]', threadID);
            api.sendMessage('🎨 جين ساكاي يرسم...', threadID);
            const generated = await generateImage(desc);
            if (generated.success) {
              const imgPath = path.resolve(__dirname, 'generated.jpg');
              fs.writeFileSync(imgPath, Buffer.from(generated.data, 'base64'));
              api.sendMessage(
                { body: '🖼️ صورة من بصيرة جين ساكاي:', attachment: fs.createReadStream(imgPath) },
                threadID,
                () => { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }
              );
            } else {
              // البحث في Google كاحتياطي
              try {
                const searchRes = await axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(desc)}&searchType=image&key=AIzaSyD-X1_J6Q4wV9z2L8k0M3n7P5r4S6t1U&cx=017576662512468239146:omuauf10dwe&num=1`);
                const imgUrl = searchRes.data.items?.[0]?.link;
                if (imgUrl) {
                  api.sendMessage(`🖼️ أفضل ما وجدته:\n${imgUrl}`, threadID);
                } else {
                  api.sendMessage('⚠️ لم أستطع توليد أو إيجاد صورة مناسبة.', threadID);
                }
              } catch {
                api.sendMessage('⚠️ تعذر توليد الصورة حالياً.', threadID);
              }
            }
            return;
          }
        }
      }
    }

    // ==========================================
    // 🤖 الرد الذكي (عند النداء فقط)
    // ==========================================
    if (
      config.aiActive && botActive &&
      body && !body.startsWith(config.prefix) &&
      senderID !== config.botID &&
      config.triggerWords.some(w => body.toLowerCase().includes(w.toLowerCase()))
    ) {
      setTimeout(async () => {
        const result = await askAI(body, isMainAdmin);

        // إعلام التبديل لـ Gemini
        if (result.switched) {
          api.sendMessage('⚠️ ChatGPT توقف مؤقتاً، تم التبديل لـ Gemini تلقائياً.', threadID);
        }

        api.sendMessage(
          { body: result.text, replyToMessage: messageID },
          threadID
        );
      }, config.replyDelay);
    }

  }); // نهاية listenMqtt
}); // نهاية login
