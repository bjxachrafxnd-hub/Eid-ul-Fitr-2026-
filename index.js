const login = require("fca-unofficial");
const fs = require("fs");
const http = require("http");

// 1. خادم ويب صغير لإبقاء البوت متصلاً 24/7 على السيرفرات السحابية
http.createServer(function (req, res) {
  res.write("Jin Sakai Bot is Online and Guarding the Fortress!");
  res.end();
}).listen(8080); 

// 2. قراءة بيانات الجلسة (AppState)
const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

const loginOptions = {
    appState: appState,
    // أفضل User Agent تم اختباره لتجاوز قيود فيسبوك الحالية
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
};

login(loginOptions, (err, api) => {
    if (err) {
        // محاولة التعامل مع قفل الأمان إذا لزم الأمر
        if (err.error === 'login-approval') {
            console.log("🔐 يرجى تأكيد الدخول من هاتفك (إشعارات فيسبوك)...");
            return;
        }
        return console.error("❌ فشل تسجيل الدخول: ", err);
    }

    // 3. تحسين خيارات الاتصال لضمان عدم السقوط (الدمج الاحترافي)
    api.setOptions({
        listenEvents: true,
        selfListen: false,
        forceLogin: true,
        online: true,
        autoMarkDelivery: true,
        autoMarkRead: false,
        updatePresence: true,
        listenTyping: false
    });

    console.log("⚔️ جين ساكاي متصل الآن عبر السيرفر.. القلعة تحت الحماية الكاملة!");

    // 4. نظام الاستماع والرد (MQTT)
    api.listenMqtt((err, message) => {
        if (err) {
            if (err.error === 'Not logged in' || err.error === 'NotLoggedIn') {
                console.error("⚠️ الجلسة انتهت! يرجى تحديث appstate.json بكوكيز جديدة.");
            }
            return;
        }

        // التعامل مع الرسائل النصية
        if (message.body) {
            const msg = message.body.trim().toLowerCase();
            
            // أمر الاستجابة الأساسي
            if (msg === "جين") {
                api.sendMessage("نعم يا محارب؟ أنا هنا أحمي القلعة من فوق السحاب. 🏯☁️", message.threadID);
            }

            // أمر المساعدة
            if (msg === "اوامر" || msg === "help") {
                api.sendMessage("⚔️ أوامر الساموراي الحالية:\n1. جين - للرد السريع.\n2. اوامر - لعرض هذه القائمة.", message.threadID);
            }
        }
    });
});
