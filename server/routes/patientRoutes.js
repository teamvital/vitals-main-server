const router = require("express").Router();
const {
  getAllPatients,
  getPatientById,
  addPatient,
  deletePatient,
  UpdatePatient,
  sendAlert,
  realTimeVitalsUpdate,
} = require("../controllers/patientController");

router.get("/", getAllPatients);
router.get("/:id", getPatientById);
router.post("/", addPatient);
router.delete("/", deletePatient);
router.patch("/", UpdatePatient);
router.post("/alert", sendAlert);
router.patch("/vitals", realTimeVitalsUpdate);

module.exports = router;