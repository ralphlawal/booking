import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCzPc7VQQPibAJqe_hmKOYEPLkeWbgMtfk",
  authDomain: "ralph-lawal-group.firebaseapp.com",
  projectId: "ralph-lawal-group",
  storageBucket: "ralph-lawal-group.firebasestorage.app",
  messagingSenderId: "1032445412733",
  appId: "1:1032445412733:web:7bee466dca83ae0686b814",
  measurementId: "G-XBW4HFBD9T",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
