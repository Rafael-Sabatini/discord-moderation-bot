const { logAction } = require("../utils/logging");

module.exports = {
  name: "messageUpdate",
  async execute(client, oldMessage, newMessage) {
    // Basic guards
    if (!oldMessage || !newMessage) return;

    // If either message is partial, try to fetch full versions so we can compare
    try {
      if (oldMessage.partial) {
        try {
          oldMessage = await oldMessage.fetch();
        } catch (err) {
          // Can't fetch old message; skip logging because we can't confirm an edit
          return;
        }
      }
      if (newMessage.partial) {
        try {
          newMessage = await newMessage.fetch();
        } catch (err) {
          // Can't fetch new message; skip
          return;
        }
      }
    } catch (err) {
      // If any unexpected error during fetch, bail out safely
      console.error("[EVENT] Error fetching partial messages in messageUpdate:", err);
      return;
    }

    // Ignore bot messages and non-guild messages
    if (oldMessage.author?.bot || !oldMessage.guild) return;

    const oldContent = typeof oldMessage.content === "string" ? oldMessage.content : "";
    const newContent = typeof newMessage.content === "string" ? newMessage.content : "";

    // Check if textual content changed or if attachments changed
    const oldAttachmentCount = oldMessage.attachments ? oldMessage.attachments.size : 0;
    const newAttachmentCount = newMessage.attachments ? newMessage.attachments.size : 0;

    // Skip if only embeds were added/changed (Discord auto-embeds links, we don't want to log those)
    if (oldContent === newContent && oldAttachmentCount === newAttachmentCount) {
      return; // No real edits, just embed changes from links
    }

    // Check if textual content or attachments actually changed
    if (oldContent === newContent && oldAttachmentCount === newAttachmentCount) {
      return;
    }

    try {
      await logAction(newMessage.guild, "messages", {
        author: newMessage.author,
        channel: newMessage.channel ? newMessage.channel.name : "unknown",
        content: oldContent || "(no previous text)",
        newContent: newContent || "(no new text)",
        attachments: newMessage.attachments,
        embeds: newMessage.embeds,
        action: "updated",
        targetId: newMessage.id,
      });
    } catch (error) {
      console.error("[EVENT] Error in messageUpdate while logging:", error);
    }
  },
};
