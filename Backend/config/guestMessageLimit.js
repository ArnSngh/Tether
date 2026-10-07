const User = require("../models/userModel.js");

const GUEST_USER_EMAIL = "guest@example.com";
const GUEST_MESSAGE_LIMIT = 3;

const isGuestUser = (user) =>
  user?.email?.toLowerCase() === GUEST_USER_EMAIL;

const getGuestMessagesSent = async (userId) => {
  let user = await User.findById(userId)
    .select("+guestMessagesSent")
    .lean();
  if (!user) return 0;

  if (!Number.isInteger(user.guestMessagesSent)) {
    await User.updateOne(
      { _id: userId, guestMessagesSent: { $exists: false } },
      { $set: { guestMessagesSent: 0 } }
    );
    user = await User.findById(userId)
      .select("+guestMessagesSent")
      .lean();
  }

  return Number.isInteger(user?.guestMessagesSent)
    ? user.guestMessagesSent
    : 0;
};

const reserveGuestMessage = async (userId) => {
  await getGuestMessagesSent(userId);
  return User.findOneAndUpdate(
    { _id: userId, guestMessagesSent: { $lt: GUEST_MESSAGE_LIMIT } },
    { $inc: { guestMessagesSent: 1 } },
    { new: true }
  )
    .select("+guestMessagesSent")
    .lean();
};

const releaseGuestMessage = (userId) =>
  User.updateOne({ _id: userId }, { $inc: { guestMessagesSent: -1 } });

module.exports = {
  GUEST_MESSAGE_LIMIT,
  getGuestMessagesSent,
  isGuestUser,
  releaseGuestMessage,
  reserveGuestMessage,
};