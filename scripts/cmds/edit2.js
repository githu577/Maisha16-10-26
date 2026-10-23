const axios = require("axios");
const { Readable } = require("stream");

module.exports = {
config: {
name: "edit2",
aliases: ["e"],
version: "2.0.0",
author: "EGO",
countDown: 5,
role: 0,
shortDescription: "EGO Editing",
longDescription: "EGO AI Image Editing",
category: "image",
guide: "{pn} [prompt]"
},

onStart: async function ({ api, event, args, usersData }) {
const { senderID, threadID, messageID, messageReply } = event;
let loadingID = null;
let stopped = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const react = emoji => {
  try {
    api.setMessageReaction(emoji, messageID, () => {}, true);
  } catch (_) {}
};

const send = body =>
  api.sendMessage(body, threadID, () => {}, messageID);

const removeLoading = async () => {
  if (!loadingID) return;
  const id = loadingID;
  loadingID = null;

  try {
    await new Promise(resolve =>
      api.unsendMessage(id, () => resolve())
    );
  } catch (_) {}
};

const editLoading = body =>
  new Promise(resolve => {
    if (!loadingID || typeof api.editMessage !== "function") {
      return resolve(false);
    }

    api.editMessage(body, loadingID, err => resolve(!err));
  });

try {
  // VIP CHECK
  const admins = global.GoatBot?.config?.adminBot || [];
  const isAdmin = admins.some(
    id => String(id) === String(senderID)
  );

  if (!isAdmin) {
    const userData = await usersData.get(senderID);
    const vip = userData?.data?.vip;

    if (!vip?.expires || vip.expires < Date.now()) {
      return send(
        "❌ VIP ONLY COMMAND\n" +
        "Only VIP users can use EGO Editing.\n" +
        "Type: vip buy"
      );
    }
  }

  const prompt = args.join(" ").trim();

  if (!prompt) {
    react("⚠️");
    return send(
      "⚠️ Please provide an editing prompt.\n" +
      "Example: -e cinematic effect add koro"
    );
  }

  const image = messageReply?.attachments?.find(item =>
    ["photo", "image"].includes(item.type) ||
    /\.(jpe?g|png|webp)(\?|$)/i.test(item.url || "")
  );

  if (!image?.url) {
    react("🖼️");
    return send(
      "🖼️ Please reply to an image first.\n" +
      "Then use: -e your prompt"
    );
  }

  const stages = [
    "⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂 ▰▰▰▰▰▰▰▰▰▰ 𝟮𝟬%",
    "⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂 ▰▰▰▰▰▰▰▰▰▰ 𝟰𝟬%",
    "⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂 ▰▰▰▰▰▰▰▰▰▰ 𝟲𝟬%",
    "⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂 ▰▰▰▰▰▰▰▰▰▰ 𝟴𝟬%",
    "⚡ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂 ▰▰▰▰▰▰▰▰▰▰ 𝟭𝟬𝟬%"
  ];

  const enhancedPrompt =
    "You are EGO AI, a professional image editor. " +
    "Understand the user's request in Bangla, Banglish, or English, " +
    "including spelling mistakes. User request: " + prompt + ". " +
    "Preserve the original person's identity and facial features. " +
    "Apply the requested changes cleanly and professionally, " +
    "with clear details, natural lighting, and high-quality output. " +
    "Do not add unrelated changes.";

  react("⏳");

  loadingID = await new Promise(resolve => {
    api.sendMessage(
      stages[0],
      threadID,
      (err, info) => resolve(err ? null : info?.messageID || null),
      messageID
    );
  });

  // Start image editing request
  const editPromise = axios.get(
    "https://azadx69x.is-a.dev/api/editor",
    {
      params: {
        url: image.url,
        prompt: enhancedPrompt
      },
      responseType: "arraybuffer",
      timeout: 180000,
      maxContentLength: 30 * 1024 * 1024,
      validateStatus: () => true,
      headers: {
        Accept: "image/*, application/json"
      }
    }
  );

  // Fast animation: 100ms between stages
  const animationPromise = (async () => {
    for (let i = 1; i < stages.length; i++) {
      await sleep(100);

      if (stopped) break;

      await editLoading(stages[i]);
    }
  })();

  let response;

  try {
    response = await editPromise;
  } finally {
    stopped = true;
  }

  await animationPromise;

  const contentType = String(
    response.headers?.["content-type"] || ""
  ).toLowerCase();

  const buffer = Buffer.from(response.data || "");

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !contentType.startsWith("image/") ||
    buffer.length < 1000
  ) {
    let errorMessage = `API returned HTTP ${response.status}`;

    try {
      const json = JSON.parse(buffer.toString("utf8"));
      errorMessage = json.message || json.error || errorMessage;
    } catch (_) {}

    throw new Error(String(errorMessage).slice(0, 300));
  }

  await removeLoading();

  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";

  const stream = Readable.from(buffer);
  stream.path = `ego_edit.${extension}`;

  await new Promise((resolve, reject) => {
    api.sendMessage(
      {
        body:
          "✨ 𝙀𝙂𝙊 𝙀𝘿𝙄𝙏𝙄𝙉𝙂\n" +
          "📝 Prompt: " + prompt +
          "\n⚡ Powered by EGO",
        attachment: stream
      },
      threadID,
      err => err ? reject(err) : resolve(),
      messageID
    );
  });

  react("✅");

} catch (error) {
  stopped = true;
  console.error("EGO EDIT2 ERROR:", error);

  await removeLoading();
  react("❌");

  send(
    "❌ EGO EDITING FAILED\n" +
    String(error.message || "Image editing failed").slice(0, 350)
  );
}

}
};
