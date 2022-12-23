const {
  UserForNative,
  UserForNativeVerification,
  PasswordReset,
} = require("../models");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();
const path = require("path");
function UserController() {}
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "elizavetka.chizh@gmail.com",
    pass: "qxxqmjzhpqvpqzcw",
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.log("bed");
    console.log(err);
  } else {
    console.log(success);
    console.log("good");
  }
}); //post date

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

  const saltRound = 10;
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
          transporter
            .sendMail(mailOptions)
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
        console.log(`res1`, result);
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
              console.log(result);
              if (result) {
                console.log(result);
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
              console.log(`err1`, error);
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

const create = function (req, res) {
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
    res.json({
      status: "FAILED",
      message: "Заполните, пожалуйста, все поля",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.json({ status: "FAILED", message: "Введите корректный email" });
  } else if (phone.length < 13) {
    res.json({ status: "FAILED", message: "Введите корректный телефон" });
  } else if (password.length < 8) {
    res.json({
      status: "FAILED",
      message: "Длина пароля должна быть не меньше 8 символов",
    });
  } else if (password !== confirmPassword) {
    res.json({
      status: "FAILED",
      data: "Пароли не совпадают",
    });
  } else {
    UserForNative.find({ email })
      .then((result) => {
        if (result.length) {
          res.json({
            status: "FAILED",
            message: "Такой пользователь уже существует",
          });
        } else {
          const saltRound = 10;
          bcrypt.hash(password, saltRound).then((hashedPassword) => {
            const newUser = new UserForNative({
              name: name,
              email: email,
              phone: phone,
              password: hashedPassword,
              confirmPassword: hashedPassword,
              verified: false,
            });

            newUser
              .save()
              .then((result) => {
                sendVerificationEmail(result, res);
                console.log(`res`, result);
                // res.json({
                //   status: "SUCCESS",
                //   message: "SUCCESS",
                //   data: result,
                // });
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message:
                    "произошла ошибка при сохранении учетной записи пользователя",
                });
              });
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: "FAILED",
          message: "произошла ошибка при хешировании пароля",
        });
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
                console.log(`1`, result);
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

const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4 + _id;
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
        <p>Эта ссылка будет действовать 60 минут</p>
            <p>Перейдите по этой <a href=${
              redirectUrl + "/" + _id + "/" + resetString
            }>ссылке</a></p>
        `,
      };
      const saltRound = 10;
      bcrypt
        .hash(resetString, saltRound)
        .then((hashedResetString) => {
          const newPasswordReset = new PasswordReset({
            userId: _id,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiredAt: Date.now() + 3600000,
          });
          newPasswordReset
            .save()
            .then(() => {
              transporter
                .sendMail(mailOptions)
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
  const { email, redirectUrl } = req.body;
  UserForNative.find({ email })
    .then((data) => {
      if (data.length) {
        if (!data[0].verified) {
          res.json({
            status: "FAILED",
            message: "очта еще не была подтверждена. Проверьте свой ящик",
          });
        } else {
          sendResetEmail(data[0], redirectUrl, res);
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
  let { userId, resetString, newPassword } = req.body;

  PasswordReset.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString
        if (expiresAt < Date.now()) {
          PasswordReset.deleteOne({ userId })
            .then(()=>{
              res.json({
                status: "FAILED",
                message: "срок действия ссылки для сброса пароля истек",
              });
            })
            .catch((error) => {
              res.json({
                status: "FAILED",
                message: "Ошибка при отправке пароля",
              });
            });
        } else {
          bcrypt.compare(resetString, hashedResetString).then((result)=>{
            if(result){
            //!!!! ОТСЮДАААА
            } else{ res.json({
              status: "FAILED",
              message: "Нет аккаунта с таким email",
            });}
          }).catch((error)=>{
            console.log(error)})
          res.json({
            status: "FAILED",
            message: "Нет аккаунта с таким email",
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
  create,
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
};

module.exports = UserController;
