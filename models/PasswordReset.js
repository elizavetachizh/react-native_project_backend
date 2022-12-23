const mongoose = require("mongoose");

const PasswordResetSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  resetString: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
  expiredAt: {
    type: Date,
  },
});

const PasswordReset = mongoose.model("PasswordReset", PasswordResetSchema);

module.exports = PasswordReset;
