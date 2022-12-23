const { check } = require("express-validator");
const { UserForNative } = require("../../models");
const bcrypt = require("bcryptjs");
const validation = {
  create: [
    check("name")
      .isLength({ min: 4 })
      .withMessage("Длина имени минимум 4 символа")
      .trim(),
    check("phone")
      .isLength({ min: 13 })
      .withMessage("Длина номера телефона 13 символов")
      .trim(),
    check("email")
      .isEmail()
      .withMessage("Введите корректный email")
      .custom(async (value, { req }) => {
        try {
          const user = await UserForNative.findOne({ email: value });
          if (user) {
            return Promise.reject("Такой email уже занят");
          } else {
            const saltRound = 10;
            bcrypt.hash("password", saltRound).then((hashedPassword) => {
              const newUser = new UserForNative({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                password: hashedPassword,
              });

              newUser.save((err) => {
                if (err) return console.log(err);
              });
            });
          }
        } catch (e) {
          console.log(e);
        }
      })
      .normalizeEmail({
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false,
      }),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Длина пароля должна быть не меньше  6 символов")
      .trim(),
  ],
  login: [
    check("name")
      .isLength({ min: 4 })
      .withMessage("Длина имени минимум 4 символа")
      .trim(),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Длина пароля должна быть не меньше  6 символов")
      .trim(),
  ],
};

module.exports = validation;
