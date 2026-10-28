export async function getGoogleIdentity() {
  if (new URLSearchParams(location.search).has("cancel"))
    throw { code: "auth/popup-closed-by-user" };
  return { email: "customer@example.test", idToken: "test-firebase-id-token" };
}
