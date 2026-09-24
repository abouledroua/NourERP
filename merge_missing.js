const fs = require('fs');

const missingEn = {
  toast: {
    room_created: "Room created successfully",
    room_create_failed: "Failed to create room",
    room_updated: "Room updated successfully",
    room_update_failed: "Failed to update room",
    room_deleted: "Room deleted successfully",
    room_delete_failed: "Failed to delete room",
    export_failed: "Export failed"
  },
  dialog: {
    delete_room_title: "Delete Room",
    delete_room_msg: "Are you sure you want to delete this room?",
    confirm_delete_room: "Confirm Delete"
  },
  parent_portal: {
    nin_required: "NIN is required",
    password_required: "Password is required",
    nin_label: "National Identity Number",
    nin_placeholder: "Enter NIN",
    password_label: "Password",
    password_placeholder: "Enter password"
  },
  students: {
    birth_date_required: "Birth date is required",
    no_parents_registered: "No parents registered",
    section_parent_desc: "Parent Information",
    parent_nin: "Parent NIN",
    search_parent_by_nin: "Search by NIN"
  },
  teachers: {
    delete_btn: "Delete Teacher",
    payment_method: "Payment Method"
  },
  common: {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    pay: "Pay"
  },
  finance: {
    financial_account: "Financial Account"
  },
  classes: {
    grade_level_placeholder: "e.g. 1st Grade, Year 1..."
  }
};

const missingFr = {
  toast: {
    room_created: "Salle créée avec succès",
    room_create_failed: "Échec de la création de la salle",
    room_updated: "Salle mise à jour avec succès",
    room_update_failed: "Échec de la mise à jour de la salle",
    room_deleted: "Salle supprimée avec succès",
    room_delete_failed: "Échec de la suppression de la salle",
    export_failed: "Échec de l'exportation"
  },
  dialog: {
    delete_room_title: "Supprimer la salle",
    delete_room_msg: "Êtes-vous sûr de vouloir supprimer cette salle ?",
    confirm_delete_room: "Confirmer la suppression"
  },
  parent_portal: {
    nin_required: "Le NIN est requis",
    password_required: "Le mot de passe est requis",
    nin_label: "Numéro d'Identification National",
    nin_placeholder: "Saisir le NIN",
    password_label: "Mot de passe",
    password_placeholder: "Saisir le mot de passe"
  },
  students: {
    birth_date_required: "La date de naissance est requise",
    no_parents_registered: "Aucun parent enregistré",
    section_parent_desc: "Informations sur le parent",
    parent_nin: "NIN du parent",
    search_parent_by_nin: "Rechercher par NIN"
  },
  teachers: {
    delete_btn: "Supprimer l'enseignant",
    payment_method: "Méthode de paiement"
  },
  common: {
    cash: "Espèces",
    bank_transfer: "Virement bancaire",
    cheque: "Chèque",
    pay: "Payer"
  },
  finance: {
    financial_account: "Compte financier"
  },
  classes: {
    grade_level_placeholder: "ex: 1ère Année..."
  }
};

const missingAr = {
  toast: {
    room_created: "تم إنشاء القاعة بنجاح",
    room_create_failed: "فشل في إنشاء القاعة",
    room_updated: "تم تحديث القاعة بنجاح",
    room_update_failed: "فشل في تحديث القاعة",
    room_deleted: "تم حذف القاعة بنجاح",
    room_delete_failed: "فشل في حذف القاعة",
    export_failed: "فشل التصدير"
  },
  dialog: {
    delete_room_title: "حذف القاعة",
    delete_room_msg: "هل أنت متأكد من حذف هذه القاعة؟",
    confirm_delete_room: "تأكيد الحذف"
  },
  parent_portal: {
    nin_required: "رقم التعريف الوطني مطلوب",
    password_required: "كلمة المرور مطلوبة",
    nin_label: "رقم التعريف الوطني (NIN)",
    nin_placeholder: "أدخل رقم التعريف",
    password_label: "كلمة المرور",
    password_placeholder: "أدخل كلمة المرور"
  },
  students: {
    birth_date_required: "تاريخ الميلاد مطلوب",
    no_parents_registered: "لا يوجد أولياء أمور مسجلين",
    section_parent_desc: "معلومات ولي الأمر",
    parent_nin: "رقم التعريف الوطني للولي",
    search_parent_by_nin: "بحث عن ولي أمر بهذا الرقم"
  },
  teachers: {
    delete_btn: "حذف الأستاذ",
    payment_method: "وسيلة الدفع"
  },
  common: {
    cash: "نقداً",
    bank_transfer: "تحويل بنكي",
    cheque: "شيك",
    pay: "دفع"
  },
  finance: {
    financial_account: "الحساب المالي"
  },
  classes: {
    grade_level_placeholder: "مثال: السنة الأولى..."
  }
};

const mergeDeep = (target, source) => {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], mergeDeep(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
};

const mergeTranslations = (lang, newKeys) => {
  const filePath = `frontend/src/i18n/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  mergeDeep(data, newKeys);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Updated ${lang}.json`);
};

mergeTranslations('en', missingEn);
mergeTranslations('fr', missingFr);
mergeTranslations('ar', missingAr);
