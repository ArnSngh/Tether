const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel.js");
const User = require("../models/userModel.js");
const Chat = require("../models/chatModel.js");
const {
  GUEST_MESSAGE_LIMIT,
  isGuestUser,
  releaseGuestMessage,
  reserveGuestMessage,
} = require("../config/guestMessageLimit.js");

const markMessagesRead = asyncHandler(async (req, res) => {
  const membership = await Chat.exists({
    _id: req.params.chatId,
    users: req.user._id,
  });
  if (!membership) return res.sendStatus(403);

  await Message.updateMany(
    {
      chat: req.params.chatId,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    },
    { $addToSet: { readBy: req.user._id } }
  );
  res.sendStatus(204);
});

//@description     Delete a message for every chat member
//@route           DELETE /api/message/:messageId
//@access          Protected (message sender only)
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.sendStatus(404);

  const chat = await Chat.findOne({
    _id: message.chat,
    users: req.user._id,
  }).select("users latestMessage");
  if (!chat) return res.sendStatus(403);
  if (String(message.sender) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only delete your own messages." });
  }

  await Message.deleteOne({ _id: message._id });

  if (String(chat.latestMessage) === String(message._id)) {
    const latestMessage = await Message.findOne({
      chat: message.chat,
      _id: { $ne: message._id },
    })
      .sort({ createdAt: -1 })
      .select("_id");

    await Chat.updateOne(
      { _id: chat._id, latestMessage: message._id },
      { $set: { latestMessage: latestMessage?._id || null } }
    );
  }

  const io = req.app.get("io");
  if (io) {
    chat.users.forEach((userId) => {
      io.to(String(userId)).emit("message deleted", {
        chatId: String(chat._id),
        messageId: String(message._id),
        deletedBy: String(req.user._id),
      });
    });
  }

  res.sendStatus(204);
});

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const membership = await Chat.exists({
      _id: req.params.chatId,
      users: req.user._id,
    });
    if (!membership) return res.sendStatus(403);

    await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("readBy", "name pic")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  const membership = await Chat.exists({ _id: chatId, users: req.user._id });
  if (!membership) return res.sendStatus(403);

  const isGuest = isGuestUser(req.user);
  const guestReservation = isGuest
    ? await reserveGuestMessage(req.user._id)
    : null;
  if (isGuest && !guestReservation) {
    return res.status(429).json({
      message: "Guest accounts can send up to 3 messages.",
      guestMessageLimit: GUEST_MESSAGE_LIMIT,
      guestMessagesRemaining: 0,
    });
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    readBy: [req.user._id],
  };

  let messageCreated = false;
  try {
    var message = await Message.create(newMessage);
    messageCreated = true;

    message = await message.populate("sender", "name pic").execPopulate();
    message = await message.populate("chat").execPopulate();
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    const responseMessage = message.toObject();
    if (guestReservation) {
      responseMessage.guestMessageLimit = GUEST_MESSAGE_LIMIT;
      responseMessage.guestMessagesRemaining =
        GUEST_MESSAGE_LIMIT - guestReservation.guestMessagesSent;
    }
    res.json(responseMessage);
  } catch (error) {
    if (guestReservation && !messageCreated) {
      try {
        await releaseGuestMessage(req.user._id);
      } catch (releaseError) {
        console.error("Failed to release guest message reservation", releaseError);
      }
    }
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, deleteMessage, markMessagesRead, sendMessage };
