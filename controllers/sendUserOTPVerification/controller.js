const { UserOTPVerification } = require("../../models");
const hashData = require("../../utils/hashData");
const sendMail = require("../../utils/sendEmail");
const sendUserOTPVerification = async ({ _id, email }) => {
  try {
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const mailOptions = {
      from: "elizavetka.chizh@gmail.com",
      to: email,
      subject: "Подтверждение почты", // Subject line
      html: `
        <div style="padding:10px;border-style: ridge">
        <p>Подтвердите свою почту для продолжения регистрации и входа в систему</p>
        <p>Эта ссылка будет действовать 1 час</p>
            <p>Код для подтверждения ${otp}</p>
        `,
    };
    const hashedOTP = await hashData(otp);

    const newUSerOTPVerification = new UserOTPVerification({
      userId: _id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiredAt: Date.now() + 3600000,
    });
    await newUSerOTPVerification.save();
    await sendMail(mailOptions);
    return {
      userId: _id,
      email,
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
};

module.exports = { sendUserOTPVerification };
