const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  updateUserProfile,
} = require("../controllers/userControllers.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/").post(registerUser);
router.put("/profile", protect, updateUserProfile);
router.post("/login", authUser);

module.exports = router;
