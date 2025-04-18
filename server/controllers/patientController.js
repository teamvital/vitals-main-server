const {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} = require("firebase/firestore");
const app = require("../firebase-config");
const {
  getDatabase,
  ref,
  set,
  remove,
  get: rtdbGet,
} = require("firebase/database");
const nodemailer = require("nodemailer");
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

// Get all patients
const getAllPatients = async (req, res) => {
  try {
    const patientsSnapshot = await getDocs(collection(db, "patients"));
    const patients = [];

    patientsSnapshot.forEach((doc) => {
      patients.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get patient by ID
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const patientDoc = await getDoc(doc(db, "patients", id));

    if (!patientDoc.exists()) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.status(200).json({
      id: patientDoc.id,
      ...patientDoc.data(),
    });
  } catch (error) {
    console.error("Error getting patient:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add new patient
const addPatient = async (req, res) => {
  try {
    const requiredFields = [
      "fullName",
      "age",
      "email",
      "mobile",
      "dob",
      "gender",
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    const patientData = {
      fullName: req.body.fullName,
      age: req.body.age,
      gender: req.body.gender || null,
      email: req.body.email,
      mobile: req.body.mobile,
      dob: req.body.dob,
      heartRate: req.body.heartRate || "0",
      spo2: req.body.spo2 || "0",
      temperature: req.body.temperature || "0",
    };

    let randomId;
    let isUnique = false;

    const idsRef = ref(realtimeDb, "ids");
    const existingIdsSnapshot = await rtdbGet(idsRef);
    const existingIds = existingIdsSnapshot.exists()
      ? Object.keys(existingIdsSnapshot.val())
      : [];

    while (!isUnique) {
      randomId = Math.floor(10000 + Math.random() * 90000).toString();
      if (!existingIds.includes(randomId)) {
        isUnique = true;
      }
    }

    const timestamp = new Date().toISOString();
    const patientWithTimestamp = {
      id: randomId,
      createdAt: timestamp,
      ...patientData,
    };

    const patientRef = doc(db, "patients", randomId);
    await setDoc(patientRef, patientWithTimestamp);
    await set(ref(realtimeDb, `ids/${randomId}`), {
      spo2: "0",
      heartRate: "0",
      temperature: "0"
    });

    res.status(201).json({
      id: randomId,
      ...patientWithTimestamp,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete patient
const deletePatient = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const idsRef = ref(realtimeDb, `ids/${id}`);
    const idSnapshot = await rtdbGet(idsRef);

    if (!idSnapshot.exists()) {
      await deleteDoc(doc(db, "patients", id));
      return res.status(200).json({ message: "Patient deleted from Firestore only as no real-time data found" });
    }

    await deleteDoc(doc(db, "patients", id));
    await remove(ref(realtimeDb, `ids/${id}`));

    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update patient
const UpdatePatient = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const idsRef = ref(realtimeDb, `ids/${id}`);
    const idSnapshot = await rtdbGet(idsRef);

    if (!idSnapshot.exists()) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const patientRef = doc(db, "patients", id);
    await updateDoc(patientRef, updateData);

    const updatedDoc = await getDoc(patientRef);

    res.status(200).json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update real-time vitals
const realTimeVitalsUpdate = async (req, res) => {
  try {
    const { id, spo2, heartRate, temperature } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const idsRef = ref(realtimeDb, `ids/${id}`);
    const idSnapshot = await rtdbGet(idsRef);

    if (!idSnapshot.exists()) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const updateData = {
      spo2: spo2 || idSnapshot.val().spo2,
      heartRate: heartRate || idSnapshot.val().heartRate,
      temperature: temperature || idSnapshot.val().temperature,
    };

    await set(idsRef, updateData);

    res.status(200).json({ message: "Real-time vitals updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send alert
const sendAlert = async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    console.log(req.body);

    if (!to || !subject || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: html || text,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Alert email sent successfully" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  addPatient,
  deletePatient,
  UpdatePatient,
  realTimeVitalsUpdate,
  sendAlert,
};
