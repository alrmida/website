
import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocalizationContextType {
  language: string;
  currency: string;
  setLanguage: (lang: string) => void;
  setCurrency: (curr: string) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'header.welcome': 'Welcome to Your Kumulus Dashboard',
    'header.tagline': 'Your Drinking Water From Air. Mineralized, Fresh, Sustainable',
    'header.tagline.mobile': 'Water From Air',
    'header.admin.panel': 'Admin Panel',
    'header.settings': 'Settings',
    'header.signout': 'Sign out',
    'header.impersonating': 'Viewing as',
    'header.stop.impersonation': 'Stop Impersonation',
    
    // Analytics
    'analytics.title': 'Production Analytics',
    'analytics.subtitle': 'Water production and system status over time',
    'analytics.production.title': 'Water Production',
    'analytics.status.title': 'System Status Distribution',
    'analytics.status.subtitle': 'Time spent in each operational state',
    'analytics.period.daily': 'Daily View',
    'analytics.period.weekly': 'Weekly View',
    'analytics.period.monthly': 'Monthly View',
    'analytics.period.yearly': 'Yearly View',
    'analytics.last.7.days': 'Last 7 Days',
    'analytics.last.4.weeks': 'Last 4 Weeks',
    'analytics.last.3.months': 'Last 3 Months',
    'analytics.last.2.years': 'Last 2 Years',
    
    // Machine Info
    'machine.info': 'Machine Information',
    'machine.id': 'Machine ID',
    'machine.name': 'Machine Name',
    'machine.location': 'Location',
    'machine.model': 'Model',
    'machine.owner': 'Owner',
    'machine.purchase.date': 'Purchase Date',
    
    // Metrics
    'metrics.water.level': 'Water Level',
    'metrics.status': 'Status',
    'metrics.total.production': 'Total Production',
    'metrics.last.update': 'Last Update',
    'metrics.producing': 'Producing',
    'metrics.idle': 'Idle',
    'metrics.full.water': 'Full Water',
    'metrics.disconnected': 'Disconnected',
    
    // Settings
    'settings.language': 'Language',
    'settings.currency': 'Currency',
    'settings.profile': 'Profile',
    'settings.security': 'Security'
  },
  fr: {
    // Header
    'header.welcome': 'Bienvenue sur votre tableau de bord Kumulus',
    'header.tagline': 'Votre eau potable à partir de l\'air. Minéralisée, fraîche, durable',
    'header.tagline.mobile': 'Eau de l\'air',
    'header.admin.panel': 'Panneau d\'administration',
    'header.settings': 'Paramètres',
    'header.signout': 'Se déconnecter',
    'header.impersonating': 'Voir en tant que',
    'header.stop.impersonation': 'Arrêter l\'emprunt d\'identité',
    
    // Analytics
    'analytics.title': 'Analyses de production',
    'analytics.subtitle': 'Production d\'eau et état du système au fil du temps',
    'analytics.production.title': 'Production d\'eau',
    'analytics.status.title': 'Distribution de l\'état du système',
    'analytics.status.subtitle': 'Temps passé dans chaque état opérationnel',
    'analytics.period.daily': 'Vue quotidienne',
    'analytics.period.weekly': 'Vue hebdomadaire',
    'analytics.period.monthly': 'Vue mensuelle',
    'analytics.period.yearly': 'Vue annuelle',
    'analytics.last.7.days': '7 derniers jours',
    'analytics.last.4.weeks': '4 dernières semaines',
    'analytics.last.3.months': '3 derniers mois',
    'analytics.last.2.years': '2 dernières années',
    
    // Machine Info
    'machine.info': 'Informations sur la machine',
    'machine.id': 'ID de la machine',
    'machine.name': 'Nom de la machine',
    'machine.location': 'Emplacement',
    'machine.model': 'Modèle',
    'machine.owner': 'Propriétaire',
    'machine.purchase.date': 'Date d\'achat',
    
    // Metrics
    'metrics.water.level': 'Niveau d\'eau',
    'metrics.status': 'Statut',
    'metrics.total.production': 'Production totale',
    'metrics.last.update': 'Dernière mise à jour',
    'metrics.producing': 'En production',
    'metrics.idle': 'Inactif',
    'metrics.full.water': 'Réservoir plein',
    'metrics.disconnected': 'Déconnecté',
    
    // Settings
    'settings.language': 'Langue',
    'settings.currency': 'Devise',
    'settings.profile': 'Profil',
    'settings.security': 'Sécurité'
  },
  es: {
    // Header
    'header.welcome': 'Bienvenido a tu Panel Kumulus',
    'header.tagline': 'Tu agua potable del aire. Mineralizada, fresca, sostenible',
    'header.tagline.mobile': 'Agua del aire',
    'header.admin.panel': 'Panel de administración',
    'header.settings': 'Configuración',
    'header.signout': 'Cerrar sesión',
    'header.impersonating': 'Ver como',
    'header.stop.impersonation': 'Detener suplantación',
    
    // Analytics
    'analytics.title': 'Análisis de producción',
    'analytics.subtitle': 'Producción de agua y estado del sistema a lo largo del tiempo',
    'analytics.production.title': 'Producción de agua',
    'analytics.status.title': 'Distribución del estado del sistema',
    'analytics.status.subtitle': 'Tiempo dedicado a cada estado operacional',
    'analytics.period.daily': 'Vista diaria',
    'analytics.period.weekly': 'Vista semanal',
    'analytics.period.monthly': 'Vista mensual',
    'analytics.period.yearly': 'Vista anual',
    'analytics.last.7.days': 'Últimos 7 días',
    'analytics.last.4.weeks': 'Últimas 4 semanas',
    'analytics.last.3.months': 'Últimos 3 meses',
    'analytics.last.2.years': 'Últimos 2 años',
    
    // Machine Info
    'machine.info': 'Información de la máquina',
    'machine.id': 'ID de la máquina',
    'machine.name': 'Nombre de la máquina',
    'machine.location': 'Ubicación',
    'machine.model': 'Modelo',
    'machine.owner': 'Propietario',
    'machine.purchase.date': 'Fecha de compra',
    
    // Metrics
    'metrics.water.level': 'Nivel de agua',
    'metrics.status': 'Estado',
    'metrics.total.production': 'Producción total',
    'metrics.last.update': 'Última actualización',
    'metrics.producing': 'Produciendo',
    'metrics.idle': 'Inactivo',
    'metrics.full.water': 'Tanque lleno',
    'metrics.disconnected': 'Desconectado',
    
    // Settings
    'settings.language': 'Idioma',
    'settings.currency': 'Moneda',
    'settings.profile': 'Perfil',
    'settings.security': 'Seguridad'
  }
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    // Load from localStorage on mount
    const savedLanguage = localStorage.getItem('kumulus-language');
    const savedCurrency = localStorage.getItem('kumulus-currency');
    
    if (savedLanguage && ['en', 'fr', 'es'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
    if (savedCurrency && ['USD', 'EUR'].includes(savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('kumulus-language', lang);
  };

  const handleSetCurrency = (curr: string) => {
    setCurrency(curr);
    localStorage.setItem('kumulus-currency', curr);
  };

  const t = (key: string): string => {
    const langTranslations = translations[language as keyof typeof translations];
    return langTranslations?.[key as keyof typeof langTranslations] || key;
  };

  const formatCurrency = (amount: number): string => {
    const formatter = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount);
  };

  const formatNumber = (num: number): string => {
    const formatter = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US');
    return formatter.format(num);
  };

  const value: LocalizationContextType = {
    language,
    currency,
    setLanguage: handleSetLanguage,
    setCurrency: handleSetCurrency,
    t,
    formatCurrency,
    formatNumber
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
