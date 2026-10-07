const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js");
const generateToken = require("../config/generateToken.js");
const {
  GUEST_MESSAGE_LIMIT,
  getGuestMessagesSent,
  isGuestUser,
} = require("../config/guestMessageLimit.js");

const guestMessageQuota = async (user) => {
  if (!isGuestUser(user)) return {};

  const sent = await getGuestMessagesSent(user._id);
  return {
    guestMessageLimit: GUEST_MESSAGE_LIMIT,
    guestMessagesRemaining: Math.max(0, GUEST_MESSAGE_LIMIT - sent),
  };
};

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Public
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select("-password -guestMessagesSent");
  res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Feilds");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      about: user.about,
      ...(await guestMessageQuota(user)),
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      about: user.about,
      ...(await guestMessageQuota(user)),
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { pic, about } = req.body;

  if (typeof about !== "string" || about.trim().length > 180) {
    res.status(400);
    throw new Error("About must be 180 characters or fewer");
  }

  if (typeof pic !== "string" || !/^https?:\/\//i.test(pic)) {
    res.status(400);
    throw new Error("Please provide a valid profile picture URL");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { pic, about: about.trim() } },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json(updatedUser);
});

module.exports = { allUsers, registerUser, authUser, updateUserProfile };
