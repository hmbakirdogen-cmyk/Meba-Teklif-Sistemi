/**
 * design-system/antdTokens.ts
 * ─────────────────────────────────────────────────────────────────
 * Ant Design ConfigProvider için tema token objesi.
 * App.tsx bu fonksiyonu çağırarak ConfigProvider'a geçirir.
 *
 * Kullanım:
 *   import { getAntdTokens } from '../design-system/antdTokens';
 *   const antdTheme = useMemo(() => getAntdTokens(isDark), [isDark]);
 *   <ConfigProvider theme={antdTheme}>…</ConfigProvider>
 */

import { theme as antTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { BRAND, FONT_FAMILY } from './tokens';
import { lightTheme, darkTheme } from './theme';

/**
 * Ant Design tema konfigürasyonu üretir.
 * @param isDark - true: karanlık mod, false: aydınlık mod
 */
export function getAntdTokens(isDark: boolean): ThemeConfig {
  const C = isDark ? darkTheme : lightTheme;

  return {
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      // ── Marka rengi ────────────────────────────────────────────────────────
      colorPrimary:       BRAND.primary,

      // ── Tipografi ──────────────────────────────────────────────────────────
      fontFamily:         FONT_FAMILY.sans,

      // ── Köşe yarıçapı ──────────────────────────────────────────────────────
      borderRadius:       8,   // md token
      borderRadiusSM:     5,   // sm token
      borderRadiusLG:     10,  // lg token
      borderRadiusXS:     4,   // xs token

      // ── Arkaplan renkleri ──────────────────────────────────────────────────
      colorBgBase:        isDark ? C.bgSurface  : '#ffffff',
      colorBgContainer:   isDark ? C.bgSurface  : '#ffffff',
      colorBgElevated:    isDark ? C.bgElevated : '#ffffff',
      colorBgLayout:      isDark ? '#0f1117'    : '#f3f7fb', // gradient değil — solid renk

      // ── Metin renkleri ─────────────────────────────────────────────────────
      colorText:          C.textPrimary,
      colorTextSecondary: C.textSecondary,
      colorTextTertiary:  C.textFaint,

      // ── Kenarlık renkleri ──────────────────────────────────────────────────
      colorBorder:         isDark ? C.border        : '#d9d9d9',
      colorBorderSecondary:isDark ? C.borderSubtle  : '#f0f0f0',

      // ── Durum renkleri ─────────────────────────────────────────────────────
      colorSuccess: BRAND.success,
      colorWarning: BRAND.warning,
      colorError:   BRAND.danger,
      colorInfo:    BRAND.info,

      // ── Z-index katmanları ─────────────────────────────────────────────────
      // Antd default popup base: 1000. Suggestion paneli, satır aksiyon paneli,
      // iskonto rozeti gibi custom popup'ları Antd Select/Dropdown ile aynı
      // hizaya getirip, Modal'ı (1100) bunların üstünde tutuyoruz.
      zIndexPopupBase: 1050,
    },
    components: {
      // ── Button ─────────────────────────────────────────────────────────────
      Button: {
        borderRadius:    8,
        controlHeight:   36,
        controlHeightSM: 30,
        fontSize:        13,
        paddingInline:   14,
      },

      // ── Input ──────────────────────────────────────────────────────────────
      Input: {
        borderRadius:   8,
        controlHeight:  36,
        fontSize:       13,
        colorBgContainer: C.bgInput,
        colorBorder:      C.inputBorder,
        colorPrimaryHover:C.inputFocus,
      },

      // ── Select ─────────────────────────────────────────────────────────────
      Select: {
        borderRadius:     8,
        controlHeight:    36,
        fontSize:         13,
        colorBgContainer: C.bgInput,
        colorBorder:      C.inputBorder,
      },

      // ── Table ──────────────────────────────────────────────────────────────
      // colorBgContainer ve headerBg kaldırıldı — CSS override ile kontrol edilir
      Table: {
        borderRadius:     10,
        fontSize:         13,
        rowHoverBg:       'transparent', // hover CSS'te .urun-tablo tr:hover > td ile yapılır
        borderColor:      C.tableBorder,
      },

      // ── Modal ──────────────────────────────────────────────────────────────
      Modal: {
        borderRadius:    12,
        colorBgElevated: C.bgSurface,
        // Modal ve mask diğer tüm popup'ların üstünde görünsün — confirm
        // diyalogları suggestion paneli/aksiyon paneli arkasında kalmasın.
        zIndexPopupBase: 1100,
      },

      // ── Card ───────────────────────────────────────────────────────────────
      Card: {
        borderRadius:    12,
        colorBgContainer:C.bgSurface,
        colorBorderSecondary: isDark ? C.border : '#e2e8f0',
      },

      // ── Drawer ─────────────────────────────────────────────────────────────
      Drawer: {
        colorBgElevated: C.bgSurface,
      },

      // ── Tooltip ────────────────────────────────────────────────────────────
      Tooltip: {
        borderRadius: 8,
        fontSize:     12,
      },

      // ── Tag ────────────────────────────────────────────────────────────────
      Tag: {
        borderRadius: 9999,
        fontSize:     11,
      },

      // ── Form ───────────────────────────────────────────────────────────────
      Form: {
        labelFontSize:   13,
        labelColor:      C.textSecondary,
        verticalLabelPadding: '0 0 4px',
      },
    },
  };
}
