import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDveNWfmv6TIHe7FSD0xXFsGqa1pmlGV7c",
  authDomain: "construtec-erp-2026.firebaseapp.com",
  projectId: "construtec-erp-2026",
  storageBucket: "construtec-erp-2026.firebasestorage.app",
  messagingSenderId: "2271943759",
  appId: "1:2271943759:web:7f11a22447e78c6fcade3a"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
