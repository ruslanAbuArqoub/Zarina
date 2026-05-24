  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDhsdX9OxDVA88J5TzV_1-rXgp-cuaJlEU",
    authDomain: "zarinastore-cc94b.firebaseapp.com",
    projectId: "zarinastore-cc94b",
    storageBucket: "zarinastore-cc94b.firebasestorage.app",
    messagingSenderId: "480818656021",
    appId: "1:480818656021:web:128bb7885a8daceff02f1c",
    measurementId: "G-LRVB4HV79L"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  export { app };
