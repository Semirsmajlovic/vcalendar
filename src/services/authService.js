import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const register = async (email, password) => {
    const auth = getAuth();
    await createUserWithEmailAndPassword(auth, email, password);
};

const login = async (email, password) => {
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password);
};

export default {
  register,
  login,
};