"use client";

import { useState, type ReactNode } from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
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
  const startAction = useDeferredAction();
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
    const task = startAction();
    setLoading(true);
    setError("");
    try {
      const identity = await getGoogleIdentity();
      if (!task.isCurrent()) return;
      const result = await authApi.google(identity.idToken);
      if (!task.isCurrent()) return;
      if ("status" in result && result.status === "REQUIRES_PASSWORD") {
        if (!result.pendingToken)
          throw new Error("Thiếu phiên đăng ký Google. Vui lòng thử lại.");
        setPending({ token: result.pendingToken, email: identity.email });
      } else {
        finish(result as AuthTokens);
      }
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(errorMessage(err));
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  }

  async function complete(password: string) {
    if (!pending || loading) return;
    const task = startAction();
    setLoading(true);
    setError("");
    try {
      const tokens = await authApi.completeGoogle(pending.token, password);
      if (task.isCurrent()) finish(tokens);
    } catch (err) {
      if (!task.isCurrent()) return;
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
      if (task.isCurrent()) setLoading(false);
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
