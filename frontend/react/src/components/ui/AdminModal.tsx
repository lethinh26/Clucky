import React from 'react';
import { Modal, Button, Space } from 'antd';
import type { ModalProps } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

export interface AdminModalProps extends ModalProps {
  subtitle?: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  title,
  subtitle,
  children,
  okText = 'Lưu thay đổi',
  cancelText = 'Hủy bỏ',
  okButtonProps,
  cancelButtonProps,
  confirmLoading = false,
  ...restProps
}) => {
  return (
    <Modal
      title={
        <div>
          <div
            style={{
              fontFamily: 'Baloo 2, sans-serif',
              fontWeight: 700,
              fontSize: 20,
              color: '#16100D',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: 13,
                color: '#6B6259',
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      }
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{
        style: {
          backgroundColor: '#8F1216',
          borderColor: '#8F1216',
          borderRadius: 999,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          height: 40,
          padding: '0 20px',
        },
        ...okButtonProps,
      }}
      cancelButtonProps={{
        style: {
          borderRadius: 999,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 600,
          borderColor: '#E8E2D9',
          height: 40,
          padding: '0 20px',
        },
        ...cancelButtonProps,
        disabled: confirmLoading || cancelButtonProps?.disabled,
      }}
      styles={{
        body: {
          background: '#FFFAF3',
          padding: '16px 0',
        },
        header: {
          background: '#FFFAF3',
          marginBottom: 16,
          borderBottom: '1px solid #F0E8DC',
          paddingBottom: 12,
        },
        footer: {
          marginTop: 20,
          borderTop: '1px solid #F0E8DC',
          paddingTop: 16,
        },
      }}
      {...restProps}
      confirmLoading={confirmLoading}
      closable={confirmLoading ? false : restProps.closable}
      maskClosable={confirmLoading ? false : restProps.maskClosable}
      keyboard={confirmLoading ? false : restProps.keyboard}
      onCancel={confirmLoading ? undefined : restProps.onCancel}
    >
      {children}
    </Modal>
  );
};

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  content,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận thực hiện',
  cancelText = 'Hủy bỏ',
  danger = true,
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      closable={!loading}
      maskClosable={!loading}
      keyboard={!loading}
      centered
      width={440}
      styles={{
        body: {
          background: '#FFFAF3',
          padding: '12px 8px',
        },
      }}
    >
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <ExclamationCircleFilled
          style={{
            fontSize: 48,
            color: danger ? '#B42318' : '#D97706',
            marginBottom: 16,
          }}
        />
        <h3
          style={{
            fontFamily: 'Baloo 2, sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: '#16100D',
            margin: '0 0 10px',
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: 14,
            color: '#6B6259',
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {content}
        </div>
        <Space size={12}>
          <Button
            onClick={onCancel}
            disabled={loading}
            style={{
              borderRadius: 999,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              height: 40,
              padding: '0 20px',
            }}
          >
            {cancelText}
          </Button>
          <Button
            type="primary"
            danger={danger}
            loading={loading}
            onClick={onConfirm}
            style={{
              borderRadius: 999,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              height: 40,
              padding: '0 24px',
              backgroundColor: danger ? '#B42318' : '#8F1216',
              borderColor: danger ? '#B42318' : '#8F1216',
            }}
          >
            {confirmText}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default AdminModal;
