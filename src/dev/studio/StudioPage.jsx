import React from 'react'
import StudioPanel from './StudioPanel'
import StudioPreview from './StudioPreview'

export default function StudioPage() {
  return React.createElement('main', { className: 'studio-shell' }, [
    React.createElement(StudioPanel, { key: 'panel' }),
    React.createElement('section', { className: 'studio-preview-area', key: 'preview' }, [
      React.createElement('div', { className: 'studio-preview-label', key: 'label' }, [
        React.createElement('p', { key: 'title' }, 'スマホプレビュー予定地'),
        React.createElement('span', { key: 'meta' }, 'モックデータ'),
      ]),
      React.createElement(StudioPreview, { key: 'phone' }),
    ]),
  ])
}
