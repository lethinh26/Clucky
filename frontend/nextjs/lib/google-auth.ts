import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";

export async function getGoogleIdentity() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    throw new Error(
      "Đăng nhập Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.",
    );
  }
  const auth = getAuth(getApps().length ? getApp() : initializeApp(config));
  await setPersistence(auth, inMemoryPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    return {
      idToken: await result.user.getIdToken(),
      email: result.user.email ?? "",
    };
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}
