const express = require("express");
const {
  allMessages,
  deleteMessage,
  markMessagesRead,
  sendMessage,
} = require("../controllers/messageControllers.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/:chatId/read").patch(protect, markMessagesRead);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/").post(protect, sendMessage);

module.exports = router;
