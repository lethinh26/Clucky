'use client';

import React, { useState } from 'react';
import styles from './auth-shared.module.css';

export interface GoogleCompletePasswordProps {
  /** Email Google đã xác thực — hiển thị cho user biết đang tạo mật khẩu cho tài khoản nào */
  email: string;
  /** Gọi khi submit hợp lệ; parent xử lý POST /api/auth/google/complete với pendingToken + password */
  onSubmit?: (password: string) => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function GoogleCompletePassword({
  email,
  onSubmit,
  loading = false,
  className = '',
}: GoogleCompletePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setError('');
    await onSubmit?.(password);
  };

  return (
    <div className={`${styles.completeCard} ${styles.authScope} ${className}`}>
      <h2 className={styles.completeTitle}>Tạo mật khẩu Clucky</h2>
      <p className={styles.completeDesc}>
        Tài khoản Google <strong>{email}</strong> chưa có mật khẩu. Đặt mật khẩu để sau này
        đăng nhập được cả bằng email + mật khẩu, không cần Google.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="google-new-password">
            Mật khẩu mới
          </label>
          <input
            id="google-new-password"
            type="password"
            className={styles.fieldInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="google-confirm-password">
            Nhập lại mật khẩu
          </label>
          <input
            id="google-confirm-password"
            type="password"
            className={styles.fieldInput}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <p className={styles.fieldError} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Đang tạo tài khoản…' : 'Hoàn tất đăng ký'}
        </button>
      </form>
    </div>
  );
}
