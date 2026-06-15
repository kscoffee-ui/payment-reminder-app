import React from 'react'
import StudioPreview from './StudioPreview'

export default function StudioPage() {
  return React.createElement('main', { className: 'studio-shell' }, [
    React.createElement('section', { className: 'studio-panel', key: 'panel' }, [
      React.createElement('p', { className: 'studio-eyebrow', key: 'eyebrow' }, 'Kaishuru UI Studio'),
      React.createElement('h1', { key: 'title' }, '/dev/studio'),
      React.createElement('p', { className: 'studio-lead', key: 'lead' }, 'カイシュル本体UIを調整するための開発用画面です。'),
      React.createElement('div', { className: 'studio-placeholder', key: 'placeholder' }, [
        React.createElement('h2', { key: 'title' }, '編集パネル予定地'),
        React.createElement('p', { key: 'body' }, 'ここにテーマ調整用の項目を追加します。'),
      ]),
    ]),
    React.createElement('section', { className: 'studio-preview-area', key: 'preview' }, [
      React.createElement('div', { className: 'studio-preview-label', key: 'label' }, [
        React.createElement('p', { key: 'title' }, 'スマホプレビュー予定地'),
        React.createElement('span', { key: 'meta' }, 'モックデータ'),
      ]),
      React.createElement(StudioPreview, { key: 'phone' }),
    ]),
  ])
}
