const fs = require("fs");
const login = require("fca-unofficial"); // استخدمنا المكتبة الأكثر استقراراً
const { OpenAI } = require("openai");
const http = require("http");

// 1. خادم ويب لإبقاء البوت حياً على Render 24/7
http.createServer((req, res) => {
    res.write("Jin Sakai Pro is Online and Guarding the Fortress!");
    res.end();
}).listen(8080);

// --- إعداد OpenAI ---
const openai = new OpenAI({
    apiKey: "YOUR_NEW_OPENAI_KEY", // استبدله بمفتاحك
});

const ADMIN_ID = "61585565456013"; 
const BOT_ID = "61582025177013";  

// قاعدة بيانات الرتب والخاملين
let userStats = {};
if (fs.existsSync("stats.json")) {
    try {
        userStats = JSON.parse(fs.readFileSync("stats.json", "utf8"));
    } catch (e) { userStats = {}; }
}

// تحميل الكوكيز
const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

login({appState: appState}, (err, api) => {
    if(err) return console.error("❌ خطأ في الكوكيز! قم بتجديد appstate.json");

    api.setOptions({
        listenEvents: true, 
        selfListen: false, 
        autoMarkDelivery: true,
        online: true,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    });

    console.log("⚔️ جين ساكاي المطور متصل الآن.. القلعة في أمان!");

    api.listenMqtt(async (err, event) => {
        if(err) return;

        // تحديث الكوكيز تلقائياً عند أي تغيير
        const updatedState = api.getAppState();
        fs.writeFileSync('appstate.json', JSON.stringify(updatedState, null, 2));

        const { threadID, senderID, body, messageID } = event;

        // 1. تسجيل نشاط الأعضاء
        if (body) {
            if (!userStats[senderID]) userStats[senderID] = { count: 0, name: "محارب" };
            userStats[senderID].count++;
            fs.writeFileSync("stats.json", JSON.stringify(userStats));
        }

        // 2. حماية الأدمن (أشرف) من الطرد
        if (event.type === "event" && event.logMessageType === "log:unsubscribe") {
            if (event.logMessageData.leftParticipantFbId === ADMIN_ID) {
                api.addUserToGroup(ADMIN_ID, threadID, (err) => {
                    if(!err) api.sendMessage("لا تستقيم القلعة بلا سيدها.. عاد أشرف لمكانه! 🏯⚔️", threadID);
                });
            }
        }

        // 3. الترحيب بالأعضاء الجدد
        if (event.type === "event" && event.logMessageType === "log:subscribe") {
            const name = event.logMessageData.addedParticipants[0].fullName;
            api.sendMessage(`اهلا بك يا ${name} 💀 راك دخلت معانا لقروب 🎭 نورتنا! 😶‍🌫️`, threadID);
        }

        if (!body) return;
        const msg = body.toLowerCase();

        // 4. الرد الذكي باستخدام OpenAI عند الرد على البوت
        if (event.messageReply && event.messageReply.senderID === BOT_ID) {
            try {
                const aiRes = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: "أنت جين ساكاي، ساموراي حكيم وشجاع صممه المطور أشرف. رد بلهجة قوية ومحترمة." },
                        { role: "user", content: body }
                    ],
                    model: "gpt-3.5-turbo",
                });
                api.sendMessage(aiRes.choices[0].message.content, threadID, messageID);
            } catch (e) { console.log("AI Error"); }
            return;
        }

        // 5. أوامر الأدمن أشرف
        if (senderID === ADMIN_ID) {
            if (body.startsWith("!تصفية ")) {
                const limit = parseInt(body.split(" ")[1]);
                api.getThreadInfo(threadID, (err, info) => {
                    if(err) return;
                    info.participantIDs.forEach((id) => {
                        if (id !== ADMIN_ID && id !== BOT_ID) {
                            const count = userStats[id] ? userStats[id].count : 0;
                            if (count < limit) api.removeUserFromGroup(id, threadID);
                        }
                    });
                    api.sendMessage(`🛡️ تم تطهير القلعة من الخاملين!`, threadID);
                });
            }
            if (body === "!طرد" && event.type === "message_reply") {
                api.removeUserFromGroup(event.messageReply.senderID, threadID);
            }
        }

        // 6. الردود التلقائية والأوامر العامة
        if (msg.includes("أشرف")) api.sendMessage("ذكر اسم السيد أشرف يتطلب الانحناء احتراماً 🙇‍♂️🗡️", threadID);
        if (msg === "جين") api.sendMessage("نعم يا محارب؟ أنا هنا أحمي القلعة. 🏯", threadID);
        
        if (body.startsWith("!1 ")) {
            try {
                const res = await openai.chat.completions.create({
                    messages: [{ role: "user", content: body.slice(3) }],
                    model: "gpt-3.5-turbo",
                });
                api.sendMessage(res.choices[0].message.content, threadID);
            } catch(e) { api.sendMessage("عذراً، فشلت في الاتصال بذكائي الاصطناعي.", threadID); }
        }

        if (body.startsWith("!تخيل ")) {
            api.sendMessage(`@Meta AI imagine ${body.slice(6)}`, threadID);
        }
    });
});
