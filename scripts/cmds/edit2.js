Install create.js const axios = require("axios");
const { Readable } = require("stream");

module.exports = {
  config: {
    name: "create",
    aliases: ["edit", "imgedit", "aiedit"],
    version: "12.0.0",
    author: "EGO",
    countDown: 5,
    role: 0,
    shortDescription: "EGO Premium AI Editor",
    longDescription: "Ultimate EGO AI Image Editor with smart auto-correct and high-end clear resolution",
    category: "image",
    guide: "{pn} [prompt]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;
    let loadingID = null;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const react = emoji => {
      try {
        api.setMessageReaction(emoji, messageID, () => {}, true);
      } catch (_) {}
    };

    const send = body => api.sendMessage(body, threadID, undefined, messageID);

    const sendLoading = body =>
      new Promise((resolve) => {
        api.sendMessage(body, threadID, (err, info) => {
          if (err) return resolve(null);
          resolve(info?.messageID || null);
        }, messageID);
      });

    const editLoading = body =>
      new Promise(resolve => {
        if (!loadingID || typeof api.editMessage !== "function") {
          return resolve(false);
        }
        api.editMessage(body, loadingID, err => {
          resolve(!err);
        });
      });

    const removeLoading = async () => {
      if (!loadingID) return;
      const id = loadingID;
      loadingID = null;
      try {
        await new Promise(resolve => {
          api.unsendMessage(id, () => resolve());
        });
      } catch (_) {}
    };

    const findImageUrl = (obj, depth = 0) => {
      if (!obj || depth > 6) return null;
      if (typeof obj === "string") {
        const value = obj.trim();
        if (/^https?:\/\/\S+$/i.test(value) && /\.(png\vert{}jpe?g\vert{}webp\vert{}gif)(\?\vert{}#\vert{}$)/i.test(value)) {
          return value;
        }
        if (/^https?:\/\//i.test(value) && /(image|photo|result|output|upload|cdn|media)/i.test(value)) {
          return value;
        }
        return null;
      }
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findImageUrl(item, depth + 1);
          if (found) return found;
        }
        return null;
      }
      if (typeof obj === "object") {
        const keys = [
          "imageUrl", "image_url", "image", "url", "resultUrl", 
          "result_url", "outputUrl", "output_url", "output", 
          "downloadUrl", "download_url", "photo", "result", "data"
        ];
        for (const key of keys) {
          if (obj[key] !== undefined) {
            const found = findImageUrl(obj[key], depth + 1);
            if (found) return found;
          }
        }
        for (const value of Object.values(obj)) {
          const found = findImageUrl(value, depth + 1);
          if (found) return found;
        }
      }
      return null;
    };

    const getEditedImage = async (imageUrl, prompt) => {
      const response = await axios.get(
        "https://azadx69x.is-a.dev/api/editor",
        {
          params: { url: imageUrl, prompt },
          responseType: "arraybuffer",
          timeout: 180000,
          maxContentLength: 30 * 1024 * 1024,
          validateStatus: () => true,
          headers: { Accept: "image/*, application/json, text/plain" }
        }
      );

      const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
      const buffer = Buffer.from(response.data || "");

      if (response.status >= 200 && response.status < 300 && contentType.startsWith("image/") && buffer.length > 1000) {
        return { buffer, contentType };
      }

      const raw = buffer.toString("utf8");
      let json = null;
      try {
        json = JSON.parse(raw);
      } catch (_) {}

      if (json) {
        const data = json.data || json;
        const base64 = data.base64 || data.imageBase64 || data.image_base64;
        if (typeof base64 === "string" && base64.length > 1000) {
          const clean = base64.replace(/^data:image\/[^;]+;base64,/i, "");
          const decoded = Buffer.from(clean, "base64");
          if (decoded.length > 1000) {
            return { buffer: decoded, contentType: "image/png" };
          }
        }

        const outputUrl = findImageUrl(json);
        if (outputUrl) {
          const imageResponse = await axios.get(outputUrl, {
            responseType: "arraybuffer",
            timeout: 90000,
            maxContentLength: 30 * 1024 * 1024,
            validateStatus: () => true,
            headers: { Accept: "image/*" }
          });

          const imageType = String(imageResponse.headers?.["content-type"] || "").toLowerCase();
          const imageBuffer = Buffer.from(imageResponse.data || "");

          if (imageResponse.status >= 200 && imageResponse.status < 300 && imageType.startsWith("image/") && imageBuffer.length > 1000) {
            return { buffer: imageBuffer, contentType: imageType };
          }
        }

        const errorText = data.error || data.message || json.error || json.message || "API did not return an image";
        throw new Error(`HTTP ${response.status}: ${String(errorText).slice(0, 350)}`);
      }

      throw new Error(`HTTP ${response.status}; type=${contentType}; response=${raw.slice(0, 250)}`);
    };

    try {
      const userPrompt = args.join(" ").trim();

      const attachments = messageReply?.attachments || [];
      const image = attachments.find(item =>
        ["photo", "image"].includes(item.type) ||
        /\.(jpe?g|png|webp)(\?|$)/i.test(item.url || "")
      ) || (event.attachments && event.attachments.find(item => ["photo", "image"].includes(item.type)));

      if (!image?.url) {
        return send(
          "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 𝐄𝐃𝐈𝐓𝐎𝐑\n\n" +
          "🖼️ Prothom e kono chobite Reply diye tarpor command din!\n\n" +
          "Udahoron:\ncreate chobita cinematic kore dao"
        );
      }

      if (!userPrompt) {
        return send("❌ Onugraho kore ki edit korben ta prompt a likhe din!\nUdahoron: create holud shari add koro");
      }

      // EGO Smart AI Assistant: Vul banan thik kora ebong full Bangla, Banglish & English intelligent support
      const enhancedPrompt =
        `You are EGO AI, an advanced professional premium image editor. ` +
        `Intelligently understand user's prompt even if there are spelling mistakes, typos, or mixed Bengali/Banglish/English. ` +
        `User Request: "${userPrompt}". ` +
        `Strictly preserve the original person's face, identity, and facial features. ` +
        `Produce crystal clear high-definition quality (2K/4K resolution), perfect lighting, and premium finish. ` +
        `Apply only the requested changes cleanly and professionally.`;

      const stages = [
        "⚡ 𝐄𝐆𝐎 𝐀𝐈 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 — ▰▰▱▱▱▱▱▱▱▱ 20%",
        "⚡ 𝐄𝐆𝐎 𝐀𝐈 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 — ▰▰▰▰▱▱▱▱▱▱ 40%",
        "⚡ 𝐄𝐆𝐎 𝐀𝐈 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 — ▰▰▰▰▰▰▱▱▱▱ 60%",
        "⚡ 𝐄𝐆𝐎 𝐀𝐈 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 — ▰▰▰▰▰▰▰▰▱▱ 80%",
        "⚡ 𝐄𝐆𝐎 𝐀𝐈 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 — ▰▰▰▰▰▰▰▰▰▰ 100%"
      ];

      loadingID = await sendLoading(stages[0]);
      react("⏳");

      const editPromise = getEditedImage(image.url, enhancedPrompt);

      for (let i = 1; i < stages.length; i++) {
        await sleep(1200);
        await editLoading(stages[i]);
      }

      const result = await editPromise;
      const buffer = result.buffer;
      const type = result.contentType;

      const ext = type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";

      const stream = Readable.from(buffer);
      stream.path = `ego_premium_edit.${ext}`;

      await removeLoading();

      await new Promise((resolve, reject) => {
        api.sendMessage(
          {
            body: `✨ 𝐄𝐆𝐎 𝐀𝐈 — 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 𝐄𝐃𝐈𝐓\n📝 Prompt: ${userPrompt}\n👑 Powered by EGO AI System`,
            attachment: stream
          },
          threadID,
          err => {
            if (err) return reject(err);
            resolve();
          },
          messageID
        );
      });

      react("✅");

    } catch (error) {
      console.error("EGO CREATE ERROR:", error.message);
      await removeLoading();
      react("❌");

      return send(
        "❌ 𝐄𝐆𝐎 𝐀𝐈 𝐄𝐑𝐑𝐎𝐑\n" +
        String(error.message || "Editing failed").slice(0, 450)
      );
    }
  }
};
