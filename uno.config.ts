/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2026-04-17 10:48:35
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-04-17 11:10:31
 * @FilePath: \vite-project\uno.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      // 页面主背景
      'tg-bg': 'var(--app-bg)',
      // 卡片/次级容器背景
      'tg-surface': 'var(--app-surface)',
      // 分组区块背景
      'tg-section': 'var(--app-section-bg)',
      // 头部背景
      'tg-header': 'var(--app-header-bg)',
      // 主文字
      'tg-text': 'var(--app-text)',
      // 副文字/说明文字
      'tg-subtitle': 'var(--app-subtitle)',
      // 弱提示文字
      'tg-hint': 'var(--app-hint)',
      // 链接文字
      'tg-link': 'var(--app-link)',
      // 主按钮/激活态背景
      'tg-accent': 'var(--app-accent)',
      // 主按钮/激活态文字
      'tg-accent-text': 'var(--app-accent-text)',
      // 分割线/描边
      'tg-divider': 'var(--app-divider)',
      // 危险文字/警告操作
      'tg-danger': 'var(--app-danger)',
      // 分组标题文字
      'tg-section-title': 'var(--app-section-title)',
      // 底部导航栏背景
      'tg-bottom-bar': 'var(--app-bottom-bar)',
    },
  },
  shortcuts: {
    'tg-card':
      'rounded-2xl border border-[color:var(--app-divider)] bg-tg-section shadow-[var(--app-shadow)]',
  },
})
