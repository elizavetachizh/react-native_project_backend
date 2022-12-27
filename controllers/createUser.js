const { createNewUser } = require("./controllerUserForNative");
const {
  sendUserOTPVerification,
} = require("./sendUserOTPVerification/controller");
const create = async function (req, res) {
  try {
    let { name, email, phone, password, confirmPassword } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();
    confirmPassword = confirmPassword.trim();
    phone = phone.trim();

    if (
      (name === "",
      phone === "",
      email === "",
      password === "",
      confirmPassword === "")
    ) {
      throw Error("Заполните, пожалуйста, все поля");
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      throw Error("Введите корректный email");
    } else if (phone.length < 13) {
      throw Error("Введите корректный телефон");
    } else if (password.length < 8) {
      throw Error("Длина пароля должна быть не меньше 8 символов");
    } else if (password !== confirmPassword) {
      throw Error("Пароли не совпадают");
    } else {
      const newUser = await createNewUser({
        name,
        phone,
        email,
        password,
        confirmPassword,
      });

      const emailData = await sendUserOTPVerification(newUser);
      res.json({
        status: "PENDING",
        message: "ерификация почты отправлена",
        data: emailData,
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "FAILED",
      message: error.message,
    });
  }
};

module.exports = create;
