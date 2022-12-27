const express = require("express");
const patientValidation = require("../utils/validation/patient");
const { PatientCtrl, AppointmentCtrl, UserCtrl } = require("../controllers");
const validationAppointment = require("../utils/validation/appointment");
const path = require("path");
const create = require("../controllers/createUser");
const router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  console.log("hello");
  return res.send("hello");
});

//routers of patients
router.post("/patients", patientValidation.create, PatientCtrl.create);
router.get("/patients", PatientCtrl.all);
router.get("/patients/:id", PatientCtrl.show);
router.delete("/patients/:id", PatientCtrl.remove);
router.patch("/patients/:id", PatientCtrl.update);

//routers of appointments
router.post("/appointments", validationAppointment.create, create);
router.get("/appointments", AppointmentCtrl.all);
router.delete("/appointments/:id", AppointmentCtrl.remove);
router.patch(
  "/appointments/:id",
  validationAppointment.update,
  AppointmentCtrl.update
);

//routers for usersNative
router.get("/user", UserCtrl.all);
router.post("/user/registration", create);
router.post("/user/login", UserCtrl.login);

router.get("/user/verify/:userId/:uniqString", UserCtrl.verificationEmail);

router.get("/user/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/verified.html"));
});
router.post("/user/resendVerificationLink", UserCtrl.resendVerificationLink);

router.post("/user/requestPasswordReset", UserCtrl.requestPasswordReset);

router.post("/user/passwordReset", UserCtrl.passwordReset);

router.post("/user/userOTPPost", UserCtrl.userOTPPost);
router.post("/user/resenduserOTPPost", UserCtrl.resendUserOTPVerification);
module.exports = router;
