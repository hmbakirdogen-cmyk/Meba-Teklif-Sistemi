import { forwardRef, useCallback, type HTMLAttributes, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';
import {
  EDITABLE_CONTEXTMENU_EVENT,
  type EditableFieldContextMenuEventDetail,
} from './EditableFieldContextMenu';

export type EditableFieldType = 'text' | 'number' | 'date' | 'currency';

interface EditableFieldProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  type: EditableFieldType;
  fieldKey: string;
  children: ReactNode;
  as?: 'span' | 'div';
  readOnly?: boolean;
  extraAttrs?: Record<string, string>;
}

/**
 * Sağ tık menü tetikleyicisi. Native browser menüsünü engeller, alanın
 * görünen temiz metnini ve mouse pozisyonunu custom event ile yayar;
 * EditableFieldContextMenu (App seviyesinde singleton) onu dinleyip menüyü
 * portal ile render eder. Hiçbir koşulda edit modunu açmaz.
 */
function dispatchContextMenu(e: ReactMouseEvent<HTMLElement>, fieldKey: string) {
  e.preventDefault();
  e.stopPropagation();
  const node = e.currentTarget;
  // Görünür temiz metin — child component'ler (DescText, formatlanmış spans)
  // textContent'i yine doğru döndürür. trim ile boşluk artıklarını at.
  const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  const detail: EditableFieldContextMenuEventDetail = {
    x: e.clientX,
    y: e.clientY,
    text,
    fieldKey,
  };
  window.dispatchEvent(new CustomEvent(EDITABLE_CONTEXTMENU_EVENT, { detail }));
}

const EditableField = forwardRef<HTMLElement, EditableFieldProps>(
  (
    { type, fieldKey, children, as = 'span', readOnly = false, extraAttrs, className, style, onContextMenu, ...rest },
    ref,
  ) => {
    const Tag = as as 'span' | 'div';
    const cls = ['editable-field', className].filter(Boolean).join(' ');

    // onContextMenu — readOnly olsun olmasın her zaman aktif: kopyalama
    // edit yetkisinden bağımsız bir UX gerçeği. Konsumer kendi onContextMenu
    // verirse önce o çalışır (ve preventDefault yapmazsa) sonra bizim
    // menümüz açılır.
    const handleContextMenu = useCallback((e: ReactMouseEvent<HTMLElement>) => {
      if (onContextMenu) {
        onContextMenu(e);
        if (e.defaultPrevented) return;
      }
      dispatchContextMenu(e, fieldKey);
    }, [onContextMenu, fieldKey]);

    return (
      <Tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        data-editable={readOnly ? 'false' : 'true'}
        data-field-type={type}
        data-field-key={fieldKey}
        className={cls}
        style={style}
        onContextMenu={handleContextMenu}
        {...extraAttrs}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);

EditableField.displayName = 'EditableField';

export { EditableField };
export default EditableField;
