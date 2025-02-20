import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAKWUM4r69AH8VNwdmab7XsET60xO5YKeE",
    authDomain: "team-project-checker.firebaseapp.com",
    projectId: "team-project-checker",
    storageBucket: "team-project-checker.appspot.com", // ✅ Fixed this line
    messagingSenderId: "27209004424",
    appId: "1:27209004424:web:475bd65658081338d3763d",
    measurementId: "G-NDW48X1XSH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; // ✅ Named exports
