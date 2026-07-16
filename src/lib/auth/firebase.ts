import {
  initializeApp as initClientApp,
  getApps as getClientApps,
  getApp as getClientApp,
} from "firebase/app";
import { getAuth as getClientAuth } from "firebase/auth";
import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  getApp as getAdminApp,
} from "firebase-admin/app";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

let clientApp: any = null;
let clientAuth: any = null;
let adminApp: any = null;

if (process.env.FIREBASE_API_KEY) {
  try {
    clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApp();
    clientAuth = getClientAuth(clientApp);
  } catch (error) {
    console.error("Failed to initialize Firebase Client SDK:", error);
  }
}

if (process.env.FIREBASE_PROJECT_ID) {
  try {
    adminApp =
      getAdminApps().length === 0
        ? initAdminApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
          })
        : getAdminApp();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export { clientApp as firebaseApp, clientAuth as firebaseAuth, adminApp as firebaseAdmin };
export { firebaseConfig };
