const { UserForNative } = require("../models");
const hashData = require("../utils/hashData");
const createNewUser = async (data) => {
  try {
    let { email, phone, password, confirmPassword } = data;
    const existingUser = await UserForNative.find({ email });
    if (existingUser.length) {
      throw Error("Такой пользователь уже существует");
    } else {
      const hashedPassword = await hashData(password);
      const newUser = new UserForNative({
        email: email,
        phone: phone,
        password: hashedPassword,
        confirmPassword: hashedPassword,
        verified: false,
      });
      const createdUser = await newUser.save();
      return createdUser;
    }
  } catch (err) {
    // )
    console.log(err);
    throw err;
  }
};

module.exports = { createNewUser };
