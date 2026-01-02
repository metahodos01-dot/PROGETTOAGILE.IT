
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// Configurazione basata sul Project ID fornito: 234254643030
const firebaseConfig = {
  apiKey: "AIzaSy_Agile_Academy_Placeholder_Key", 
  authDomain: "project-234254643030.firebaseapp.com",
  projectId: "project-234254643030", // Identificativo basato sul numero fornito
  storageBucket: "project-234254643030.appspot.com",
  messagingSenderId: "234254643030",
  appId: "1:234254643030:web:cloud-hub-integration"
};

const app = initializeApp(firebaseConfig);
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
    console.error("Errore salvataggio Firebase:", e);
  }
};

/**
 * Sottoscrive ai cambiamenti in tempo reale di un modulo
 */
export const subscribeToModule = (projectId: string, moduleId: string, callback: (data: any) => void) => {
  if (!projectId || !moduleId) return () => {};
  const docRef = doc(db, "workshops", projectId, "modules", moduleId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("Errore sottoscrizione Firebase:", err);
  });
};
