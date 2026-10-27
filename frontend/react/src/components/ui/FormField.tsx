import React from 'react';
import { Form, Input, InputNumber, Select, Switch } from 'antd';
import type { FormItemProps } from 'antd';

export interface FormFieldWrapperProps extends FormItemProps {
  hint?: string;
}

export const FormField: React.FC<FormFieldWrapperProps> = ({
  children,
  label,
  hint,
  ...restProps
}) => {
  return (
    <Form.Item
      label={
        label ? (
          <span
            style={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: '#16100D',
              fontSize: 14,
            }}
          >
            {label}
          </span>
        ) : undefined
      }
      extra={
        hint ? (
          <span style={{ fontSize: 12, color: '#6B6259', fontFamily: 'Quicksand, sans-serif' }}>
            {hint}
          </span>
        ) : undefined
      }
      style={{ marginBottom: 18 }}
      {...restProps}
    >
      {children}
    </Form.Item>
  );
};

export const CluckyInput = Input;
export const CluckyTextArea = Input.TextArea;
export const CluckyInputNumber = InputNumber;
export const CluckySelect = Select;
export const CluckySwitch = Switch;

export default FormField;
