"use client";
import { NavigationError } from "@/components/ui-loader";
import Link from "@/components/ui-loader/navigation-link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <NavigationError>
      <main className="container" style={{ paddingBlock: 64 }}>
        <h1>Chưa tải được trang</h1>
        <p>Vui lòng thử lại hoặc chọn một trang khác.</p>
        <button type="button" className="btn-primary" onClick={reset}>
          Thử lại
        </button>{" "}
        <Link href="/">Về trang chủ</Link>
      </main>
    </NavigationError>
  );
}
