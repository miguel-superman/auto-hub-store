// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";
import { getStorage, ref, getBlob } from "firebase/storage";
import { getFirestore,collection, addDoc,setDoc,getDocs ,getDoc,doc} from "firebase/firestore";
import { getAuth,signInWithEmailAndPassword,signOut ,createUserWithEmailAndPassword , sendEmailVerification, onAuthStateChanged, sendPasswordResetEmail, reload , getIdToken} from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: "G-ZXW3E115TG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Replace your old 'const db = getFirestore(app);' with this:
// const db = initializeFirestore(app, {
//   experimentalForceLongPolling: true,
//   useFetchStreams: false, // This further simplifies the request for Safari
// });
const auth = getAuth(app)

export {db,auth, app, storage ,getBlob,ref,signInWithEmailAndPassword,onAuthStateChanged,sendPasswordResetEmail,sendEmailVerification, reload,getIdToken,signOut ,createUserWithEmailAndPassword,collection, addDoc,setDoc,getDocs,getDoc,doc, analytics}