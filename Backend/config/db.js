const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chat-app";

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;