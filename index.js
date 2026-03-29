const login = require("fca-unofficial");
const fs = require("fs");
const http = require("http");

// 1. خادم ويب لإبقاء البوت حياً على Render
http.createServer(function (req, res) {
  res.write("Jin Sakai Bot is Online! Profile: 61575591201693");
  res.end();
}).listen(8080); 

// 2. قراءة الكوكيز (تأكد من تحديث appstate.json بالكوكيز الخاصة بالحساب الجديد)
const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

const loginOptions = {
    appState: appState,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
};

login(loginOptions, (err, api) => {
    if (err) {
        return console.error("❌ خطأ في دخول الحساب الجديد: ", err);
    }

    // 3. إعدادات الهوية والاستقرار
    const botID = "61575591201693"; // معرف حساب البوت الخاص بك
    
    api.setOptions({
        listenEvents: true,
        selfListen: false, // لكي لا يرد البوت على نفسه
        forceLogin: true,
        online: true,
        autoMarkDelivery: true,
        updatePresence: true
    });

    console.log(`⚔️ جين ساكاي (ID: ${botID}) متصل الآن عبر السيرفر!`);

    // 4. نظام الاستماع للرسائل
    api.listenMqtt((err, message) => {
        if (err) return;

        if (message.body) {
            const msg = message.body.trim().toLowerCase();
            
            // رد جين ساكاي
            if (msg === "جين") {
                api.sendMessage("نعم يا محارب؟ أنا 'جين ساكاي'، حامي القلعة الجديد. كيف يمكنني مساعدتك؟ ⚔️🏯", message.threadID);
            }

            // قائمة الأوامر
            if (msg === "اوامر") {
                api.sendMessage("📜 قائمة أوامر الساموراي:\n1. جين - للترحيب.\n2. اوامر - لعرض القائمة.\n3. ايدي - لمعرفة رقم حسابك.", message.threadID);
            }

            // أمر إضافي لمعرفة ID المستخدم
            if (msg === "ايدي") {
                api.sendMessage(`🆔 رقم حسابك هو: ${message.senderID}`, message.threadID);
            }
        }
    });
});
