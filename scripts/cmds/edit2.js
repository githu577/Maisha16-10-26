const axios = require("axios");
const { Readable } = require("stream");

const API_URL = "https://azadx69x.is-a.dev/api/editor";

module.exports = {
config: {
name: "create",
aliases: ["edit"],
version: "12.0.0",
author: "EGO",
countDown: 5,
role: 0,
shortDescription: "EGO Neon AI Editor",
longDescription: "Premium AI photo editing",
category: "image",
guide: "{pn} [prompt]"
},

onStart: async function ({ api, event, args }) {
const { threadID, messageID, messageReply } = event;
let loadingID = null;

const react = emoji => {
  try {
    api.setMessageReaction(emoji, messageID, () => {}, true);
  } catch (_) {}
};

const send = body =>
  new Promise(resolve => {
    api.sendMessage(body, threadID, () => resolve(), messageID);
  });

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const stages = [
  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n▰▰▱▱▱▱▱▱▱▱ 20%",
  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n▰▰▰▰▱▱▱▱▱▱ 40%",
  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n▰▰▰▰▰▰▱▱▱▱ 60%",
  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n▰▰▰▰▰▰▰▰▱▱ 80%",
  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n▰▰▰▰▰▰▰▰▰▰ 100%"
];

const editLoading = body =>
  new Promise(resolve => {
    if (!loadingID || typeof api.editMessage !== "function") {
      return resolve(false);
    }

    api.editMessage(body, loadingID, err => {
      if (err) console.log("EGO LOADING:", err.message);
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

try {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return send(
      "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n" +
      "ছবিতে Reply দিয়ে লিখো:\n" +
      "-create cinematic lighting"
    );
  }

  const attachments = messageReply?.attachments || [];
  const image = attachments.find(item =>
    ["photo", "image"].includes(item.type) ||
    /\.(jpe?g|png|webp)(\?|$)/i.test(item.url || "")
  );

  if (!image?.url) {
    return send("🖼️ ছবিতে Reply দিয়ে -create prompt লিখো।");
  }

  const enhancedPrompt =
    "Follow this image editing request accurately. " +
    "User request: " + prompt + ". " +
    "Preserve the original person's identity and facial features. " +
    "Change only requested elements. Use realistic lighting, " +
    "natural colors and professional details.";

  loadingID = await new Promise(resolve => {
    api.sendMessage(stages[0], threadID, (err, info) => {
      resolve(err ? null : info?.messageID || null);
    }, messageID);
  });

  react("⏳");

  // Exact API from your edit2.js
  const apiPromise = axios.get(API_URL, {
    params: {
      url: image.url,
      prompt: enhancedPrompt
    },
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: 25 * 1024 * 1024,
    validateStatus: () => true,
    headers: {
      Accept: "image/png, image/jpeg, image/webp"
    }
  });

  // Five loading stages, fast updates.
  for (let i = 1; i < stages.length; i++) {
    await sleep(250);
    await editLoading(stages[i]);
  }

  const response = await apiPromise;
  const buffer = Buffer.from(response.data || []);

  let ext = null;

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    ext = "png";
  } else if (
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  ) {
    ext = "jpg";
  } else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    ext = "webp";
  }

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !ext ||
    buffer.length < 1000
  ) {
    console.error(
      "EGO API ERROR:",
      response.status,
      buffer.toString("utf8").slice(0, 200)
    );

    await removeLoading();
    react("❌");
    return send("❌ API থেকে ছবি পাওয়া যায়নি। পরে আবার চেষ্টা করো।");
  }

  await removeLoading();

  const stream = Readable.from(buffer);
  stream.path = `EGO_NEON_EDIT.${ext}`;

  await new Promise((resolve, reject) => {
    api.sendMessage(
      {
        body:
          "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "✅ 𝐈𝐌𝐀𝐆𝐄 𝐄𝐃𝐈𝐓𝐄𝐃\n\n" +
          "🎨 Prompt: " + prompt + "\n" +
          "🔥 Powered by EGO",
        attachment: stream
      },
      threadID,
      err => err ? reject(err) : resolve(),
      messageID
    );
  });

  react("✅");

} catch (error) {
  console.error("EGO CREATE ERROR:", error.message);
  await removeLoading();
  react("❌");

  return send("❌ Editing failed. আবার চেষ্টা করো।");
}

}
};
