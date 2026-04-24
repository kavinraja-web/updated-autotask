import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// You should securely populate these with actual Firebase configuration.
// For demonstration, these are placeholders that the Firebase SDK will try to use.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (error) {
  console.warn("Firebase not properly configured. Push notifications will be disabled.", error);
}

export const requestFirebaseNotificationPermission = () =>
  new Promise((resolve, reject) => {
    if (!messaging) {
        reject("Firebase messaging not initialized");
        return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        getToken(messaging, { vapidKey: "YOUR_VAPID_KEY_HERE" })
          .then((currentToken) => {
            if (currentToken) {
              resolve(currentToken);
            } else {
              reject("No registration token available.");
            }
          })
          .catch((err) => {
            reject(err);
          });
      } else {
        reject("Permission denied");
      }
    });
  });

export const onMessageListener = () =>
  new Promise((resolve) => {
      if (!messaging) return;
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
  });

export { messaging };
