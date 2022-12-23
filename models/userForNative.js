const mongoose = require("mongoose");

const UserForNativeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  confirmPassword: {
    type: String,
    required: true,
  },
  verified: Boolean,
});

const UserForNative = mongoose.model("UserForNative", UserForNativeSchema);

module.exports = UserForNative;
