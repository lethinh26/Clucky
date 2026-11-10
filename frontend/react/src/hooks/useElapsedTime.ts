import { useEffect, useState } from "react";

export interface ElapsedTimeResult {
  /** Số phút trôi qua kể từ khi tạo đơn */
  diffMinutes: number;
  /** Chuỗi định dạng hiển thị, ví dụ: "Chờ 3 phút", "Chờ 12 phút" */
  elapsedTimeText: string;
  /** Vi phạm SLA (>= 10 phút) */
  isSlaBreached: boolean;
  /** Cảnh báo SLA sắp tới (6 - 9 phút) */
  isSlaWarning: boolean;
}

/**
 * Hook đếm thời gian trôi qua thực tế từ thời điểm `createdAt`,
 * tự động cập nhật mỗi 10 giây và kiểm tra vi phạm hạn mức SLA fast-food (>10 phút).
 *
 * @param createdAt Chuỗi ISO, Date hoặc timestamp
 * @returns ElapsedTimeResult
 */
export function useElapsedTime(
  createdAt: string | Date | number | undefined | null,
): ElapsedTimeResult {
  const calculate = (): ElapsedTimeResult => {
    if (!createdAt) {
      return {
        diffMinutes: 0,
        elapsedTimeText: "Chờ 0 phút",
        isSlaBreached: false,
        isSlaWarning: false,
      };
    }

    const createdTime =
      typeof createdAt === "number"
        ? createdAt
        : new Date(createdAt).getTime();

    if (isNaN(createdTime)) {
      return {
        diffMinutes: 0,
        elapsedTimeText: "Chờ 0 phút",
        isSlaBreached: false,
        isSlaWarning: false,
      };
    }

    const now = Date.now();
    const diffMs = Math.max(0, now - createdTime);
    const diffMinutes = Math.floor(diffMs / 60000);

    const isSlaBreached = diffMinutes >= 10;
    const isSlaWarning = diffMinutes >= 6 && diffMinutes < 10;
    const elapsedTimeText = `Chờ ${diffMinutes} phút`;

    return {
      diffMinutes,
      elapsedTimeText,
      isSlaBreached,
      isSlaWarning,
    };
  };

  const [state, setState] = useState<ElapsedTimeResult>(calculate);

  useEffect(() => {
    // Cập nhật ngay khi createdAt thay đổi
    setState(calculate());

    // Cập nhật mỗi 10 giây
    const intervalId = window.setInterval(() => {
      setState(calculate());
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [createdAt]);

  return state;
}
