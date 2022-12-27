const {
  UserForNative,
  UserForNativeVerification,
  PasswordReset,
  UserOTPVerification,
} = require("../models");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const {
  sendUserOTPVerification,
} = require("./sendUserOTPVerification/controller");
const sendMail = require("../utils/sendEmail");
const saltRound = 10;
function UserController() {}

const sendVerificationEmail = ({ _id, email }, res) => {
  const currentUrl = "http://localhost:5500/";
  const uniqString = uuidv4() + _id;
  const mailOptions = {
    from: "elizavetka.chizh@gmail.com",
    to: email,
    subject: "Подтверждение почты", // Subject line
    html: `
        <div style="padding:10px;border-style: ridge">
        <p>Подтвердите свою почту для продолжения регистрации и входа в систему</p>
        <p>Эта ссылка будет действовать 6 часов</p>
            <p>Перейдите по этой <a href=${
              currentUrl + "user/verify/" + _id + "/" + uniqString
            }>ссылке</a></p>
        `,
  };

  bcrypt
    .hash(uniqString, saltRound)
    .then((hashedUniqueString) => {
      const newVerification = new UserForNativeVerification({
        userId: _id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiredAt: Date.now() + 216000000,
      });
      newVerification
        .save()
        .then(() => {
          sendMail(mailOptions)
            .then(() => {
              res.json({
                status: "PENDING",
                message: "Отправляется подтверждение почты",
                data: {
                  userId: _id,
                  email,
                },
              });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "произошла ошибка валидации почты",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: "FAILED",
            message: "произошла ошибка при хешировании почты",
          });
        });
    })
    .catch(() => {
      res.json({
        status: "FAILED",
        message: "произошла ошибка при хешировании почты",
      });
    });
};

const verificationEmail = (req, res) => {
  let { userId, uniqString } = req.params;
  UserForNativeVerification.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        const { expiredAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;
        if (expiredAt < Date.now()) {
          UserForNativeVerification.deleteOne({ userId })
            .then((result) => {
              UserForNative.deleteOne({ _id: userId })
                .then(() => {
                  let message =
                    "срок действия ссылки истек. Пожалуйста, арегиструйтесь заново";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                })
                .catch((error) => {
                  let message =
                    "не удалось очистить пользователя с просроченной уникальной строкой";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "Ошибка правильности проверки для существующей записи проверки пользователя";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        } else {
          bcrypt
            .compare(uniqString, hashedUniqueString)
            .then((result) => {
              if (result) {
                UserForNative.updateOne({ _id: userId }, { verified: true })
                  .then(() => {
                    UserForNativeVerification.deleteOne({ userId })
                      .then(() => {
                        res.sendFile(
                          path.join(__dirname, "../views/verified.html")
                        );
                      })
                      .catch((error) => {
                        console.log(error);
                        let message = "Ошибка верификации в фнальной проверке";
                        res.redirect(
                          `/user/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    let message = "Ошибка верификации";
                    res.redirect(
                      `/user/verified/error=true&message=${message}`
                    );
                  });
              } else {
                let message = "Ошибка верификации";
                res.redirect(`/user/verified/error=true&message=${message}`);
              }
            })
            .catch((error) => {
              let message =
                "Время верификации истекло. Пожалуйста, зарегистрируйтесь или войдите";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        }
      } else {
        let message =
          "Время верификации истекло. Пожалуйста, зарегистрируйтесь или войдите";
        res.redirect(`/user/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      console.log(error);
      let message =
        "Ошибка правильности проверки для существующей записи проверки пользователя";
      res.redirect(`/user/verified/error=true&message=${message}`);
    });
};

const resendVerificationLink = async function (req, res) {
  try {
    let { userId, email } = req.body;
    console.log(req.body);
    if (!userId || !email) {
      throw Error("Пустые данные пользователя");
    } else {
      await UserForNativeVerification.deleteMany({ userId });
      sendVerificationEmail({ _id: userId, email }, res);
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "FAILED",
      message: "Ошибка в ссылке на верфикацию",
    });
  }
};

const userOTPPost = async (req, res) => {
  try {
    let { userId, otp } = req.body;
    if (!userId || !otp) {
      throw Error("Не разрешены пустые значяения для кода");
    } else {
      const UserOTPVerificationRecords = await UserOTPVerification.find({
        userId,
      });
      if (UserOTPVerificationRecords.length <= 0) {
        throw new Error("Не имеется доступа либо верификация уже прошла.");
      } else {
        const { expiresAt } = UserOTPVerificationRecords[0];
        const hashedOTP = UserOTPVerificationRecords[0].otp;

        if (expiresAt < Date.now()) {
          await UserOTPVerification.deleteMany({ userId });
          throw new Array(
            "срок действия кода истек. Пожалуйста, отправьте еще раз"
          );
        } else {
          const validOTP = await bcrypt.compare(otp, hashedOTP);

          if (!validOTP) {
            throw new Error("Указан неправильный код. Проверьте свою почту");
          } else {
            await UserForNative.updateOne({ _id: userId }, { verified: true });
            await UserOTPVerification.deleteMany({ userId });
            res.json({
              status: "VERIFIED",
              message: `Подтвержение почты прошло удачно`,
            });
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
    res.json({ status: "FAILED", message: e.message });
  }
};

const resendUserOTPVerification = async (req, res) => {
  try {
    let { userId, email } = req.body;
    console.log(req.body);
    if (!userId || !email) {
      throw Error("Пустые данные пользователя");
    } else {
      await UserOTPVerification.deleteMany({ userId });
      sendUserOTPVerification({ _id: userId, email }, res);
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "FAILED",
      message: "Ошибка в ссылке на верфикацию",
    });
  }
};

//получение всех клиентов
const all = function (req, res) {
  UserForNative.find({}, function (err, info) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err,
      });
    }

    res.json({
      status: true,
      data: info,
    });
  });
};

const update = async function (req, res) {
  const id = req.params.id;
  const errors = validationResult(req);
  //создание дданых
  const data = {
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    password: req.body.password,
  };

  //проверка данных на валидацию
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array(),
    });
  }

  UserForNative.updateOne({ _id: id }, { $set: data }, function (err, info) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err,
      });
    }

    if (!info) {
      return res.status(404).json({
        success: false,
        message: "Такого usera не существует",
      });
    }
    res.json({
      status: true,
      message: "user был удачно обновлен",
    });
  });
};

const remove = async function (req, res) {
  const id = req.params.id;
  try {
    await UserForNative.findOne({ _id: id });
  } catch (e) {
    return res.status(404).json({
      success: false,
      message: "USer_NOT_FOUND",
    });
  }
  UserForNative.deleteOne({ _id: id }, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err,
      });
    }

    res.json({
      status: true,
      message: "user был удачно удален из базы",
    });
  });
};

const show = async function (req, res) {
  const id = req.params.id;
  try {
    const user = await UserForNative.findById(id);
    console.log(user);
    res.json({
      status: true,
      data: { ...user._doc },
    });
  } catch (e) {
    return res.status(404).json({
      success: false,
      message: "PATIENT_NOT_FOUND",
    });
  }
};

const login = async function (req, res) {
  var { email, password } = req.body;
  password = password.trim();
  email = email.trim();
  if (email === "" || password === "") {
    res.json({ status: "FAILED", message: "Заполните поля" });
  } else {
    UserForNative.find({ email })
      .then((data) => {
        if (data.length) {
          if (!data[0].verified) {
            res.json({
              status: "FAILED",
              message:
                "очта еще не прошла проверку на аунтификацию. Проверьте свой почтовик",
            });
          } else {
            const hashedPassword = data[0].password;
            console.log(`data`, data);
            console.log(hashedPassword);
            bcrypt
              .compare(password, hashedPassword)
              .then((result) => {
                if (result) {
                  console.log(result);
                  res.json({
                    status: "SUCCESS",
                    message: "Signin successful",
                    data: data,
                  });
                } else {
                  res.json({
                    status: "FAILED",
                    message: "Введен не правильный пароль",
                  });
                }
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "Ошибка при сравнении паролей",
                });
              });
          }
        } else {
          res.json({
            status: "FAILED",
            message: "Invalid dates",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: "FAILED",
          message: "НЕдействительные учётные данные",
        });
      });
  }
};

const sendResetEmail = ({ _id, email }, res) => {
  const resetString = `${Math.floor(1000 + Math.random() * 9000)}`;
  PasswordReset.deleteMany({ userId: _id })
    .then((result) => {
      console.log(result);
      const mailOptions = {
        from: "elizavetka.chizh@gmail.com",
        to: email,
        subject: "Подтверждение почты", // Subject line
        html: `
        <div style="padding:10px;border-style: ridge">
        <p>Новый парорль для входа в систему</p>
          <p>Код для подтверждения ${resetString}</p>
        `,
      };
      bcrypt
        .hash(resetString, saltRound)
        .then((hashedResetString) => {
          const newPasswordReset = new PasswordReset({
            userId: _id,
            email: email,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiredAt: Date.now() + 3600000,
          });
          newPasswordReset
            .save()
            .then(() => {
              sendMail(mailOptions)
                .then(() => {
                  res.json({
                    status: "PENDING",
                    message: "Сброс пароля был отправлен на почту",
                  });
                })
                .catch((error) => {
                  console.log(error);
                  res.json({
                    status: "FAILED",
                    message: "электронная почта для сброса пароля не удалась",
                  });
                });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Не может сохранить новый пароль",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: "FAILED",
            message: "Ошибка в сбросе пароля",
          });
        });
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "не удалось очистить существующие записи сброса пароля",
      });
    });
};

const requestPasswordReset = (req, res) => {
  const { email } = req.body;
  UserForNative.find({ email })
    .then((data) => {
      if (data.length) {
        if (!data[0].verified) {
          res.json({
            status: "FAILED",
            message: "очта еще не была подтверждена. Проверьте свой ящик",
          });
        } else {
          sendResetEmail(data[0], res);
        }
      } else {
        res.json({
          status: "FAILED",
          message: "Нет аккаунта с таким email",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Ошибка при проврке данных об пользователе",
      });
    });
};

const passwordReset = (req, res) => {
  let { email, newPassword, resetString } = req.body;
  PasswordReset.find({ email })
    .then((result) => {
      if (result.length > 0) {
        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString;
        if (expiresAt < Date.now()) {
          PasswordReset.deleteOne({ email })
            .then(() => {
              res.json({
                status: "FAILED",
                message: "срок действия ссылки для сброса пароля истек",
              });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Ошибка при отправке пароля",
              });
            });
        } else {
          bcrypt
            .compare(resetString, hashedResetString)
            .then((result) => {
              if (result) {
                bcrypt
                  .hash(newPassword, saltRound)
                  .then((hashedNewPassword) => {
                    UserForNative.updateOne(
                      { email: email },
                      { password: hashedNewPassword }
                    )
                      .then(() => {
                        PasswordReset.deleteOne({ email })
                          .then(() => {
                            res.json({
                              status: "SUCCESS",
                              message: "пароль был удачно изменен",
                            });
                          })
                          .catch((error) => {
                            console.log(error);
                            res.json({
                              status: "FAILED",
                              message:
                                "произошла ошибка при завершении сброса пароля",
                            });
                          });
                      })
                      .catch((error) => {
                        console.log(error);
                        res.json({
                          status: "FAILED",
                          message: "Ошибка в обнолвении пароля пользователя",
                        });
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    res.json({
                      status: "FAILED",
                      message: "сравнение строк сброса пароля не удалось",
                    });
                  });
              } else {
                res.json({
                  status: "FAILED",
                  message: "переданы неверные данные для сброса пароля",
                });
              }
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "сравнение строк сброса пароля не удалось",
              });
            });
        }
      } else {
        res.json({
          status: "FAILED",
          message: "Нет аккаунта с таким email",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Проверьте правильность введенного пароля",
      });
    });
};

UserController.prototype = {
  all,
  update,
  remove,
  show,
  login,
  sendVerificationEmail,
  verificationEmail,
  resendVerificationLink,
  requestPasswordReset,
  passwordReset,
  userOTPPost,
  resendUserOTPVerification,
};

module.exports = UserController;
