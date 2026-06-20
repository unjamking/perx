import React, { useState } from 'react';

export default function LeadModal({ active, type, onClose, lang, translations, onSubmitSuccess }) {
  const t = translations[lang];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: ''
  });

  if (!active) return null;

  // Save the lead to the backend, then show the success toast. Fire-and-forget on
  // the network error so a flaky API never blocks the user — the toast still fires.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: type, ...formData }),
      });
    } catch (err) {
      console.error('lead submit failed', err);
    }
    onSubmitSuccess();
    setFormData({ name: '', email: '', company: '', phone: '' });
    onClose();
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const isProvider = type === 'provider';

  return (
    <div className={`modal-overlay ${active ? 'active' : ''}`} onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {isProvider ? (
          <div>
            <h3 className="modal-title">{t.modalProviderTitle}</h3>
            <p className="modal-desc">{t.modalProviderDesc}</p>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{t.modalFormMerchant}</label>
                <input 
                  type="text" 
                  id="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">{t.modalFormWorkEmail}</label>
                <input 
                  type="email" 
                  id="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">{t.modalFormContact}</label>
                <input 
                  type="tel" 
                  id="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                {t.modalFormSubmitMerchant}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h3 className="modal-title">{t.modalRequestTitle}</h3>
            <p className="modal-desc">{t.modalRequestDesc}</p>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{t.modalFormName}</label>
                <input 
                  type="text" 
                  id="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">{t.modalFormWorkEmail}</label>
                <input 
                  type="email" 
                  id="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="company">{t.modalFormCompany}</label>
                <input 
                  type="text" 
                  id="company" 
                  value={formData.company} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                {t.modalFormSubmit}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
