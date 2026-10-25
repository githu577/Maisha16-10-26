// EGO EDIT2 - FIXED RESPONSE HANDLING
const axios = require("axios");
const { Readable } = require("stream");

module.exports = {
  config: {
    name: "edit2",
    aliases: ["e"],
    version: "2.0.0",
    author: "EGO",
    countDown: 25,
    role: 0,
    shortDescription: "EGO AI Image Editing",
    longDescription: "Reply to an image and edit it",
    category: "image",
    guide: "{pn} [prompt]"
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { senderID, threadID, messageID, messageReply } = event;

    const react = emoji =>
      api.setMessageReaction(emoji, messageID, () => {}, true);

    let loadingID;

    const sendLoading = text =>
      new Promise((resolve, reject) => {
        api.sendMessage(text, threadID, (err, info) => {
          if (err) return reject(err);
          loadingID = info.messageID;
          resolve();
        });
      });

    const editLoading = text =>
      new Promise(resolve => {
        api.editMessage(text, loadingID, () => resolve());
      });

    const removeLoading = () =>
      new Promise(resolve => {
        if (!loadingID) return resolve();
        api.unsendMessage(loadingID, () => resolve());
      });

    try {
      // VIP permission
      const admins = global.GoatBot?.config?.adminBot || [];

      if (!admins.includes(senderID)) {
        const user = await usersData.get(senderID);
        const vip = user?.data?.vip;

        if (!vip?.expires || vip.expires < Date.now()) {
          return api.sendMessage(
            "❌ VIP ONLY COMMAND\nType: vip buy",
            threadID,
            messageID
          );
        }
      }

      const prompt = args.join(" ").trim();

      if (!prompt) {
        return api.sendMessage(
          "⚠️ Please provide an editing prompt.",
          threadID,
          messageID
        );
      }

      const imageUrl = messageReply?.attachments?.find(
        a => a.type === "photo" || a.type === "image"
      )?.url || messageReply?.attachments?.[0]?.url;

      if (!imageUrl) {
        return api.sendMessage(
          "🖼️ Reply directly to an image first.",
          threadID,
          messageID
        );
      }

      react("⏳");

      await sendLoading("⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂\n▰▱▱▱▱ 20%");

      const apiUrl = "https://azadx69x.is-a.dev/api/editor";

      const editPromise = axios.get(apiUrl, {
        params: { url: imageUrl, prompt },
        responseType: "arraybuffer",
        timeout: 120000,
        validateStatus: () => true
      });

      const frames = [
        "▰▰▱▱▱ 40%",
        "▰▰▰▱▱ 60%",
        "▰▰▰▰▱ 80%",
        "▰▰▰▰▰ 100%"
      ];

      for (const frame of frames) {
        await new Promise(resolve => setTimeout(resolve, 350));
        await editLoading(`⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂\n${frame}`);
      }

      const response = await editPromise;
      const contentType = response.headers["content-type"] || "";
      const data = Buffer.from(response.data);

      // Detect API errors and JSON responses
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`API HTTP ${response.status}: ${data.toString("utf8").slice(0, 400)}`);
      }

      if (
        contentType.includes("json") ||
        contentType.includes("text/")
      ) {
        const body = data.toString("utf8");
        throw new Error(`API did not return an image: ${body.slice(0, 500)}`);
      }

      if (!data.length || contentType.includes("text/html")) {
        throw new Error("API returned no image. The editing endpoint may be unavailable.");
      }

      await removeLoading();
      loadingID = null;
      react("✅");

      return api.sendMessage(
        {
          body: `🖌️ 𝐄𝐆𝐎 𝐈𝐌𝐀𝐆𝐄 𝐄𝐃𝐈𝐓𝐄𝐃\n✏️ Prompt: ${prompt}`,
          attachment: Readable.from(data)
        },
        threadID,
        messageID
      );

    } catch (err) {
      console.error("EGO EDIT2 ERROR:", err);

      await removeLoading();

      react("❌");

      return api.sendMessage(
        `❌ EGO EDIT FAILED\n\n${String(err.message || err).slice(0, 1000)}`,
        threadID,
        messageID
      );
    }
  }
};
