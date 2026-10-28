"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi, type AuthTokens } from "@/lib/api";
import { getGoogleIdentity } from "@/lib/google-auth";
import { GoogleButton } from "./google-button";
import { GoogleCompletePassword } from "./google-complete-password";
import styles from "./auth-shared.module.css";

function errorMessage(error: unknown) {
  const failure = error as { code?: string; message?: string };
  if (
    failure?.code === "auth/popup-closed-by-user" ||
    failure?.code === "auth/cancelled-popup-request"
  )
    return "Bạn đã đóng đăng nhập Google. Có thể thử lại.";
  if (failure?.code === "auth/popup-blocked")
    return "Trình duyệt chặn cửa sổ Google. Hãy cho phép cửa sổ bật lên và thử lại.";
  if (failure?.code === "auth/network-request-failed")
    return "Không kết nối được Google. Kiểm tra mạng và thử lại.";
  return failure?.message || "Đăng nhập Google thất bại. Vui lòng thử lại.";
}

export function GoogleAuthFlow({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<{
    token: string;
    email: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function finish(tokens: AuthTokens) {
    if (!tokens.accessToken || !tokens.refreshToken)
      throw new Error("Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.");
    localStorage.setItem("clucky_access_token", tokens.accessToken);
    localStorage.setItem("clucky_refresh_token", tokens.refreshToken);
    router.push("/account");
  }

  async function login() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const identity = await getGoogleIdentity();
      const result = await authApi.google(identity.idToken);
      if ("status" in result && result.status === "REQUIRES_PASSWORD") {
        if (!result.pendingToken)
          throw new Error("Thiếu phiên đăng ký Google. Vui lòng thử lại.");
        setPending({ token: result.pendingToken, email: identity.email });
      } else {
        finish(result as AuthTokens);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function complete(password: string) {
    if (!pending || loading) return;
    setLoading(true);
    setError("");
    try {
      finish(await authApi.completeGoogle(pending.token, password));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 410) {
        setPending(null);
        setError(
          "Phiên đăng ký Google đã hết hạn. Vui lòng đăng nhập Google lại.",
        );
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div aria-busy={loading}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {pending ? (
        <>
          <GoogleCompletePassword
            email={pending.email}
            onSubmit={complete}
            loading={loading}
          />
          <button
            type="button"
            className={styles.googleBtn}
            disabled={loading}
            onClick={() => {
              setPending(null);
              setError("");
            }}
          >
            Quay lại đăng nhập
          </button>
        </>
      ) : (
        <>
          {children}
          <div className={styles.divider}>hoặc</div>
          <GoogleButton onClick={login} loading={loading} />
        </>
      )}
    </div>
  );
}
