const nodemailer = require("nodemailer");
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

const sendMail = async (mailOptions) => {
  try {
    const emailSent = await transporter.sendMail(mailOptions);
    return emailSent;
  } catch (error) {
    throw error;
  }
};
module.exports = sendMail;
