import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    school_name_ar: '',
    school_name_en: '',
    school_name_fr: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    currency: 'DA',
    tax_number: '',
    print_receipt_footer: '«التربية ركيزتنا والامتياز غايتنا» - شكراً لثقتكم بمؤسستنا'
  });
  const [tracks, setTracks] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.success && res.data) {
        if (res.data.settings) setSettings(res.data.settings);
        if (res.data.tracks) setTracks(res.data.tracks);
        if (res.data.years) {
          const curYear = res.data.years.find(y => y.is_current) || res.data.years[0];
          setActiveYear(curYear);
        }
        if (res.data.terms) {
          const curTerm = res.data.terms.find(t => t.is_current) || res.data.terms[0];
          setActiveTerm(curTerm);
        }
      }
    } catch (err) {
      console.warn('[SettingsContext] Could not load dynamic settings, using defaults:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchSettings();
  }, [token]);

  return (
    <SettingsContext.Provider value={{ settings, tracks, activeYear, activeTerm, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
