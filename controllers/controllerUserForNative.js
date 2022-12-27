const { UserForNative } = require("../models");
const hashData = require("../utils/hashData");
const createNewUser = async (data) => {
  try {
    let { name, email, phone, password, confirmPassword } = data;
    const existingUser = await UserForNative.find({ email });
    if (existingUser.length) {
      throw Error("Такой пользователь уже существует");
    } else {
      const hashedPassword = await hashData(password);
      const newUser = new UserForNative({
        name: name,
        email: email,
        phone: phone,
        password: hashedPassword,
        confirmPassword: hashedPassword,
        verified: false,
      });
      const createdUser = await newUser.save();
      return createdUser;
      //   bcrypt.hash(password, saltRound).then((hashedPassword) => {
      //     const newUser = new UserForNative({
      //       name: name,
      //       email: email,
      //       phone: phone,
      //       password: hashedPassword,
      //       confirmPassword: hashedPassword,
      //       verified: false,
      //     });
      //
      //     newUser
      //       .save()
      //       .then((result) => {
      //         // sendVerificationEmail(result, res);
      //         sendUserOTPVerification(result, res);
      //         console.log(`res`, result);
      //         // res.json({
      //         //   status: "SUCCESS",
      //         //   message: "SUCCESS",
      //         //   data: result,
      //         // });
      //       })
      //       .catch((err) => {
      //         res.json({
      //           status: "FAILED",
      //           message:
      //             "произошла ошибка при сохранении учетной записи пользователя",
      //         });
      //       });
      //   });
    }
  } catch (err) {
    // )
    console.log(err);
    throw err;
  }
};

module.exports = { createNewUser };
