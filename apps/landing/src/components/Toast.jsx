import React from 'react';

export default function Toast({ active, lang, translations }) {
  const t = translations[lang];
  return (
    <div className={`toast-success ${active ? 'active' : ''}`}>
      <div style={{ fontSize: '1.25rem' }}>✓</div>
      <div>{t.toastSuccessMsg}</div>
    </div>
  );
}
