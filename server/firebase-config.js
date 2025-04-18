const dotenv = require('dotenv');
const { initializeApp } = require('firebase/app');

dotenv.config();

const firebaseConfig = {
 apiKey: process.env.API_KEY,
 authDomain: process.env.AUTH_DOMAIN,
 projectId: process.env.PROJECT_ID,
 storageBucket: process.env.STORAGE_BUCKET,
 messagingSenderId: process.env.MESSAGING_SENDER_ID,
 appId: process.env.APP_ID,
};

const app = initializeApp(firebaseConfig);

module.exports = app;