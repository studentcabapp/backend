// src/utils/notification.js
export const sendInAppNotification = (req, userId, payload) => {
  // tries to get socket.io instance from app and emit to user's socket room
  try {
    const io = req?.app?.get?.("io");
    if (io) {
      // assume you put users into rooms named by their user ID
      io.to(userId.toString()).emit("notification", payload);
    } else {
      console.log("No io instance found; skipping socket notification", payload);
    }
  } catch (err) {
    console.error("sendInAppNotification error:", err);
  }
};

export const notifyMultipleUsers = (req, userIds = [], payload = {}) => {
  userIds.forEach(uid => sendInAppNotification(req, uid, payload));
};

// placeholder for email/push; integrate with your provider
export const sendEmail = async (to, subject, html) => {
  // TODO: integrate with SendGrid / SES / nodemailer etc.
  console.log(`[EMAIL] to=${to} subject=${subject}`);
};
