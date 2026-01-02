import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// Configurazione Cloud Hub - Project ID: 234254643030
const firebaseConfig = {
  apiKey: "AIzaSy_Agile_Academy_Static_Key_2025", 
  authDomain: "agile-academy-234254643030.firebaseapp.com",
  projectId: "agile-academy-234254643030", 
  storageBucket: "agile-academy-234254643030.appspot.com",
  messagingSenderId: "234254643030",
  appId: "1:234254643030:web:cloud-hub-integration"
};

// Inizializzazione sicura
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

/**
 * Salva i dati di un modulo specifico per un progetto
 */
export const saveModuleData = async (projectId: string, moduleId: string, data: any) => {
  if (!projectId || !moduleId) return;
  try {
    const docRef = doc(db, "workshops", projectId, "modules", moduleId);
    await setDoc(docRef, { 
      ...data, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
  } catch (e) {
    console.error("Firebase Save Error:", e);
  }
};

/**
 * Sottoscrive ai cambiamenti in tempo reale di un modulo
 */
export const subscribeToModule = (projectId: string, moduleId: string, callback: (data: any) => void) => {
  if (!projectId || !moduleId) return () => {};
  const docRef = doc(db, "workshops", projectId, "modules", moduleId);
  try {
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback(null);
      }
    }, (err) => {
      console.error("Firebase Subscribe Error:", err);
    });
  } catch (e) {
    console.error("Firebase Snapshot error:", e);
    return () => {};
  }
};