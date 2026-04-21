import React from 'react';
import { AutoComplete, Input, InputNumber, Select } from 'antd';

const BASE_STYLE: React.CSSProperties = {
  width: '100%',
  font: 'inherit',
  color: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
};

export const INLINE_TABLE_DROPDOWN_CLASS = 'belge-inline-table-dropdown';

type SelectProps = React.ComponentProps<typeof Select>;
type AutoCompleteProps = React.ComponentProps<typeof AutoComplete>;
type InputProps = React.ComponentProps<typeof Input>;
type InputNumberProps = React.ComponentProps<typeof InputNumber>;
type SelectRef = React.ComponentRef<typeof Select>;
type AutoCompleteRef = React.ComponentRef<typeof AutoComplete>;
type InputRefType = React.ComponentRef<typeof Input>;
type InputNumberRefType = React.ComponentRef<typeof InputNumber>;

export const InlineTableSelectField = React.forwardRef<SelectRef, SelectProps>(function InlineTableSelectField(
  { style, className, popupClassName, popupMatchSelectWidth, ...props },
  ref,
) {
  return (
    <Select
      ref={ref}
      size="small"
      variant="borderless"
      suffixIcon={null}
      popupMatchSelectWidth={popupMatchSelectWidth ?? false}
      popupClassName={popupClassName ?? INLINE_TABLE_DROPDOWN_CLASS}
      className={['inline-table-field', className].filter(Boolean).join(' ')}
      style={{ ...BASE_STYLE, ...style }}
      {...props}
    />
  );
});

export const InlineTableAutocompleteField = React.forwardRef<AutoCompleteRef, AutoCompleteProps>(function InlineTableAutocompleteField(
  { style, className, popupClassName, popupMatchSelectWidth, ...props },
  ref,
) {
  return (
    <AutoComplete
      ref={ref}
      size="small"
      variant="borderless"
      popupMatchSelectWidth={popupMatchSelectWidth ?? false}
      popupClassName={popupClassName ?? INLINE_TABLE_DROPDOWN_CLASS}
      className={['inline-table-field', className].filter(Boolean).join(' ')}
      style={{ ...BASE_STYLE, ...style }}
      {...props}
    />
  );
});

export const InlineTableInputField = React.forwardRef<InputRefType, InputProps>(function InlineTableInputField(
  { style, className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      size="small"
      variant="borderless"
      className={['inline-table-field', className].filter(Boolean).join(' ')}
      style={{ ...BASE_STYLE, ...style }}
      {...props}
    />
  );
});

export const InlineTableNumberField = React.forwardRef<InputNumberRefType, InputNumberProps>(function InlineTableNumberField(
  { style, className, ...props },
  ref,
) {
    return (
      <InputNumber
        ref={ref}
        size="small"
        variant="borderless"
        controls={false}
        className={['inline-table-field', className].filter(Boolean).join(' ')}
        style={{ ...BASE_STYLE, ...style }}
        {...props}
      />
    );
});
