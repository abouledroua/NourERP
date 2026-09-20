import * as XLSX from 'xlsx';
import { toast } from '../context/UIFeedbackContext';
import ar from '../i18n/ar.json';
import fr from '../i18n/fr.json';
import en from '../i18n/en.json';

const translations = { ar, fr, en };

export function exportJsonToExcel(data, fileName = 'export.xlsx', sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    const currentLang = localStorage.getItem('alnour_lang') || 'ar';
    const warningMsg = translations[currentLang]?.toast?.no_data_export || translations.ar.toast.no_data_export;
    toast.warning(warningMsg);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
