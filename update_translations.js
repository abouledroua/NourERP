const fs = require('fs');

const dataFr = JSON.parse(fs.readFileSync('frontend/src/i18n/fr.json', 'utf8'));
dataFr.setup = {
  modal_title: "Créer une nouvelle année académique",
  modal_desc: "Il n'y a actuellement aucune année académique active. Vous devez en créer une pour commencer à utiliser le système.",
  year_name_label: "Nom de l'année académique *",
  year_name_placeholder: "ex: 2026/2027",
  start_date_label: "Date de début *",
  end_date_label: "Date de fin *",
  save_continue_btn: "Enregistrer et continuer",
  error_creating_year: "Erreur lors de la création de l'année académique",
  saving: "Enregistrement..."
};
dataFr.settings = dataFr.settings || {};
dataFr.settings.manage_academic_track = "Gérer la filière académique";
dataFr.settings.manage_teachers = "Gérer les enseignants";
fs.writeFileSync('frontend/src/i18n/fr.json', JSON.stringify(dataFr, null, 2));

const dataAr = JSON.parse(fs.readFileSync('frontend/src/i18n/ar.json', 'utf8'));
dataAr.setup = {
  modal_title: "إنشاء سنة دراسية جديدة",
  modal_desc: "لا توجد سنة دراسية نشطة حالياً. يجب إنشاء سنة دراسية لبدء استخدام النظام.",
  year_name_label: "اسم السنة الدراسية *",
  year_name_placeholder: "مثال: 2026/2027",
  start_date_label: "تاريخ البداية *",
  end_date_label: "تاريخ النهاية *",
  save_continue_btn: "حفظ ومتابعة",
  error_creating_year: "خطأ في إنشاء السنة الدراسية",
  saving: "جاري الحفظ..."
};
dataAr.settings = dataAr.settings || {};
dataAr.settings.manage_academic_track = "إدارة المسار الأكاديمي";
dataAr.settings.manage_teachers = "إدارة المعلمين";
fs.writeFileSync('frontend/src/i18n/ar.json', JSON.stringify(dataAr, null, 2));

console.log("Translations updated.");
