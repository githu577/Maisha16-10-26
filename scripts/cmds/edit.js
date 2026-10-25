// code from goatstore
// API: https://store.agi.bd
const axios = require("axios");

module.exports = {
  config: {
    name: "edit2",
    aliases: ["e"],
    version: "1.0.0",
    author: "EGO",
    countDown: 25,
    role: 0,
    shortDescription: "Edit image",
    longDescription: "Reply to any image",
    category: "image",
    guide: "{pn} [text]"
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const { senderID, messageReply, threadID, messageID } = event;

    const react = (emoji) =>
      api.setMessageReaction(emoji, messageID, () => {}, true);

    /* VIP CHECK */
    try {
      const ADMINS = global.GoatBot?.config?.adminBot || [];
      const isBotAdmin = ADMINS.includes(senderID);

      if (!isBotAdmin) {
        const userData = await usersData.get(senderID);
        const vip = userData?.data?.vip;

        if (!vip || !vip.expires || vip.expires < Date.now()) {
          return api.sendMessage(
            "❌ 𝐕𝐈𝐏 𝐎𝐍𝐋𝐘 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n• Only VIP users can use edit\n• Type: vip buy",
            threadID,
            messageID
          );
        }
      }

      const prompt = args.join(" ").trim();

      if (!prompt) {
        react("⚠️");
        return api.sendMessage(
          "⚠️ | Please provide an editing prompt.",
          threadID,
          messageID
        );
      }

      const imageUrl = messageReply?.attachments?.find(
        item => item.type === "photo" || item.type === "image"
      )?.url || messageReply?.attachments?.[0]?.url;

      if (!imageUrl) {
        react("🖼️");
        return api.sendMessage(
          "🖼️ | Please reply to an image.",
          threadID,
          messageID
        );
      }

      react("⏳");

      const loadingFrames = [
        "▰▱▱▱▱ 20%",
        "▰▰▱▱▱ 40%",
        "▰▰▰▱▱ 60%",
        "▰▰▰▰▱ 80%",
        "▰▰▰▰▰ 100%"
      ];

      let loadingMessageID;

      await new Promise((resolve, reject) => {
        api.sendMessage(
          `⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂\n${loadingFrames[0]}`,
          threadID,
          (err, info) => {
            if (err) return reject(err);
            loadingMessageID = info.messageID;
            resolve();
          },
          messageID
        );
      });

      // Start API request while animation runs
      const apiUrl =
        `https://azadx69x.is-a.dev/api/editor?url=${encodeURIComponent(imageUrl)}` +
        `&prompt=${encodeURIComponent(prompt)}`;

      const editPromise = axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 120000
      });

      for (let i = 1; i < loadingFrames.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 350));

        await new Promise(resolve => {
          api.editMessage(
            `⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂\n${loadingFrames[i]}`,
            loadingMessageID,
            () => resolve()
          );
        });
      }

      const response = await editPromise;

      if (!response.data || !response.data.length) {
        throw new Error("API returned an empty image.");
      }

      await new Promise(resolve => {
        api.unsendMessage(loadingMessageID, () => resolve());
      });

      react("✅");

      return api.sendMessage(
        {
          body: `🖌️ 𝐄𝐆𝐎 𝐈𝐌𝐀𝐆𝐄 𝐄𝐃𝐈𝐓𝐄𝐃\n\n✏️ 𝐏𝐫𝐨𝐦𝐩𝐭: ${prompt}`,
          attachment: Buffer.from(response.data)
        },
        threadID,
        messageID
      );

    } catch (error) {
      console.error("EGO EDIT2 ERROR:", error?.message || error);

      react("❌");

      return api.sendMessage(
        `❌ | Image editing failed.\nReason: ${error?.message || "Unknown error"}`,
        threadID,
        messageID
      );
    }
  }
};
