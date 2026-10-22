const axios = require("axios");
const { Readable } = require("stream");

const API_URL = "https://azadx69x.is-a.dev/api/editor";

module.exports = {
config: {
name: "create",
aliases: ["edit"],
version: "11.0.0",
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
let progressTimer = null;
let finished = false;

const react = emoji => {
  try {
    api.setMessageReaction(
      emoji,
      messageID,
      () => {},
      true
    );
  } catch (_) {}
};

const send = body =>
  new Promise(resolve => {
    api.sendMessage(
      body,
      threadID,
      () => resolve(),
      messageID
    );
  });

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

// Exactly 5 stages; every bar contains 10 blocks.
const stages = [
  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n" +
  "⏳ 𝐋𝐎𝐀𝐃𝐈𝐍𝐆 20%\n" +
  "▰▰▱▱▱▱▱▱▱▱",

  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n" +
  "⏳ 𝐋𝐎𝐀𝐃𝐈𝐍𝐆 40%\n" +
  "▰▰▰▰▱▱▱▱▱▱",

  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n" +
  "⏳ 𝐋𝐎𝐀𝐃𝐈𝐍𝐆 60%\n" +
  "▰▰▰▰▰▰▱▱▱▱",

  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n" +
  "⏳ 𝐋𝐎𝐀𝐃𝐈𝐍𝐆 80%\n" +
  "▰▰▰▰▰▰▰▰▱▱",

  "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n\n" +
  "✅ 𝐋𝐎𝐀𝐃𝐈𝐍𝐆 100%\n" +
  "▰▰▰▰▰▰▰▰▰▰"
];

const editLoading = body =>
  new Promise(resolve => {
    if (
      !loadingID ||
      typeof api.editMessage !== "function"
    ) {
      return resolve(false);
    }

    api.editMessage(body, loadingID, err => {
      if (err) {
        console.log("EGO LOADING ERROR:", err.message);
      }
      resolve(!err);
    });
  });

const removeLoading = async () => {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

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
      "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "🖼️ ছবিতে Reply দিয়ে লিখো:\n\n" +
      "-create cinematic lighting\n" +
      "-create change background to night\n" +
      "-create make it realistic"
    );
  }

  const attachments =
    messageReply?.attachments || [];

  const image = attachments.find(item =>
    ["photo", "image"].includes(item.type) ||
    /\.(jpe?g|png|webp)(\?|$)/i.test(item.url || "")
  );

  if (!image?.url) {
    return send(
      "🖼️ প্রথমে একটি ছবিতে Reply দাও!\n" +
      "তারপর লিখো: -create your prompt"
    );
  }

  const enhancedPrompt =
    "Follow this image editing request accurately. " +
    "User request: " + prompt + ". " +
    "Preserve the original person's identity and facial " +
    "features. Change only requested elements. " +
    "Use realistic lighting, natural colors and professional details.";

  // Send the first loading stage immediately.
  loadingID = await new Promise(resolve => {
    api.sendMessage(
      stages[0],
      threadID,
      (err, info) => {
        if (err) {
          console.log("EGO LOADING SEND:", err.message);
          return resolve(null);
        }

        resolve(info?.messageID || null);
      },
      messageID
    );
  });

  react("⏳");

  // Start the API request immediately.
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

  // Exactly 4 edits after the initial stage = 5 stages total.
  // Fast animation; no unnecessary long waiting.
  for (let i = 1; i < stages.length; i++) {
    await sleep(250);
    await editLoading(stages[i]);
  }

  // Wait for the real API result.
  const response = await apiPromise;
  finished = true;

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  const buffer = Buffer.from(response.data || []);
  const contentType = String(
    response.headers?.["content-type"] || ""
  ).toLowerCase();

  // Verify actual image format.
  let ext = null;

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10
      ])
    )
  ) {
    ext = "png";
  } else if (
    buffer.length >= 3 &&
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF
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
      contentType,
      buffer.toString("utf8").slice(0, 200)
    );

    await removeLoading();
    react("❌");

    return send(
      "❌ 𝐄𝐆𝐎 𝐀𝐈 — 𝐀𝐏𝐈 𝐄𝐑𝐑𝐎𝐑\n\n" +
      "API থেকে valid image পাওয়া যায়নি।\n" +
      "কিছুক্ষণ পরে আবার চেষ্টা করো।"
    );
  }

  // Remove loading before sending the edited image.
  await removeLoading();

  const stream = Readable.from(buffer);
  stream.path = `EGO_NEON_EDIT.${ext}`;

  await new Promise((resolve, reject) => {
    api.sendMessage(
      {
        body:
          "⚡ 𝐄𝐆𝐎 𝐀𝐈 — 𝐍𝐄𝐎𝐍 𝐏𝐑𝐎\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "✅ 𝐄𝐃𝐈𝐓 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐄\n\n" +
          "🎨 𝐏𝐑𝐎𝐌𝐏𝐓: " + prompt + "\n" +
          "🔥 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐄𝐆𝐎",
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
  finished = true;

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  console.error("EGO CREATE ERROR:", error.message);

  await removeLoading();
  react("❌");

  await send(
    "❌ 𝐄𝐆𝐎 𝐀𝐈 — 𝐄𝐃𝐈𝐓 𝐅𝐀𝐈𝐋𝐄𝐃\n\n" +
    "API অথবা Messenger-এ সমস্যা হয়েছে।\n" +
    "আবার চেষ্টা করো।"
  );
}

}
};
