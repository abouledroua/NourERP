import React, { useState, useEffect } from 'react';
import { Award, Save, Calculator, Printer, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/UIFeedbackContext';
import Modal from '../components/Modal';

export default function Grades() {
  const { t } = useLanguage();
  const { settings, activeYear } = useSettings();
  const toast = useToast();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);

  // Selected filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  const [students, setStudents] = useState([]);
  const [gradesMap, setGradesMap] = useState({}); // studentId -> { continuous, midterm, final }
  const [loading, setLoading] = useState(false);

  // Student Report Card Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardData, setCardData] = useState(null);

  const fetchFilters = async () => {
    try {
      const [cRes, sRes, setRes] = await Promise.all([
        api.get('/classes'),
        api.get('/teachers/subjects'),
        api.get('/settings')
      ]);

      if (cRes.success && cRes.data.length > 0) {
        setClasses(cRes.data);
        setSelectedClassId(cRes.data[0].id);
      }
      if (sRes.success && sRes.data.length > 0) {
        setSubjects(sRes.data);
        setSelectedSubjectId(sRes.data[0].id);
      }
      if (setRes.success && setRes.data.terms?.length > 0) {
        setTerms(setRes.data.terms);
        const cur = setRes.data.terms.find(t => t.is_current) || setRes.data.terms[0];
        setSelectedTermId(cur.id);
      }
    } catch (err) {
      console.error('[GRADES] Error loading filters:', err);
    }
  };

  const fetchGradeMatrix = async () => {
    if (!selectedClassId || !selectedTermId) return;
    try {
      setLoading(true);
      const res = await api.get(`/grades/matrix?classId=${selectedClassId}&subjectId=${selectedSubjectId}&termId=${selectedTermId}`);
      if (res.success) {
        setStudents(res.data.students);
        const map = {};
        res.data.grades.forEach(g => {
          if (!map[g.student_id]) map[g.student_id] = {};
          map[g.student_id][g.evaluation_type] = g.score;
        });
        setGradesMap(map);
      }
    } catch (err) {
      console.error('[GRADES] Error fetching matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchGradeMatrix();
  }, [selectedClassId, selectedSubjectId, selectedTermId]);

  const handleScoreChange = (studentId, evalType, val) => {
    setGradesMap(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [evalType]: val
      }
    }));
  };

  const handleSaveGrades = async () => {
    const gradesPayload = [];
    Object.keys(gradesMap).forEach(studentId => {
      const entry = gradesMap[studentId];
      ['CONTINUOUS', 'MIDTERM', 'FINAL_EXAM'].forEach(type => {
        if (entry[type] !== undefined && entry[type] !== '') {
          gradesPayload.push({
            studentId: parseInt(studentId, 10),
            evaluationType: type,
            score: parseFloat(entry[type]),
            maxScore: 20.00,
            coefficient: 1.0
          });
        }
      });
    });

    try {
      const res = await api.post('/grades/batch', {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        termId: selectedTermId,
        grades: gradesPayload
      });
      if (res.success) {
        toast.success(t('toast.grades_saved'));
        fetchGradeMatrix();
      }
    } catch (err) {
      toast.error(err.message || t('toast.grades_save_failed'));
    }
  };

  const handleComputeCards = async () => {
    try {
      const res = await api.post('/grades/compute-cards', {
        classId: selectedClassId,
        termId: selectedTermId
      });
      if (res.success) {
        toast.success(t('toast.compute_cards_success'));
      }
    } catch (err) {
      toast.error(err.message || t('toast.compute_cards_failed'));
    }
  };

  const handleViewReportCard = async (studentId) => {
    try {
      const res = await api.get(`/grades/report-card/${studentId}/${selectedTermId}`);
      if (res.success) {
        setCardData(res.data);
        setIsCardModalOpen(true);
      }
    } catch (err) {
      toast.error(err.message || t('toast.report_card_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('grades.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('grades.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleComputeCards}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>{t('grades.compute_cards')}</span>
          </button>
          <button
            onClick={handleSaveGrades}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{t('grades.save_grades')}</span>
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-500 mb-1">{t('grades.select_class')}</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[180px]"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-500 mb-1">{t('grades.select_subject')}</label>
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[180px]"
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-500 mb-1">{t('grades.select_term')}</label>
          <select
            value={selectedTermId}
            onChange={e => setSelectedTermId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[180px]"
          >
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grade Entry Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{t('grades.col_matricule')}</th>
                <th className="py-3 px-4">{t('grades.col_student')}</th>
                <th className="py-3 px-4 text-center">{t('grades.continuous')} (/20)</th>
                <th className="py-3 px-4 text-center">{t('grades.midterm')} (/20)</th>
                <th className="py-3 px-4 text-center">{t('grades.final_exam')} (/20)</th>
                <th className="py-3 px-4 text-center">{t('grades.col_report_card')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(st => {
                const row = gradesMap[st.id] || {};
                return (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{st.matricule}</td>
                    <td className="py-3 px-4 font-black text-slate-900 text-sm">
                      {st.first_name_ar} {st.last_name_ar}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="20"
                        value={row.CONTINUOUS !== undefined ? row.CONTINUOUS : ''}
                        onChange={e => handleScoreChange(st.id, 'CONTINUOUS', e.target.value)}
                        placeholder="0.00"
                        className="w-24 text-center font-mono font-bold p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="20"
                        value={row.MIDTERM !== undefined ? row.MIDTERM : ''}
                        onChange={e => handleScoreChange(st.id, 'MIDTERM', e.target.value)}
                        placeholder="0.00"
                        className="w-24 text-center font-mono font-bold p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="20"
                        value={row.FINAL_EXAM !== undefined ? row.FINAL_EXAM : ''}
                        onChange={e => handleScoreChange(st.id, 'FINAL_EXAM', e.target.value)}
                        placeholder="0.00"
                        className="w-24 text-center font-mono font-bold p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-800"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewReportCard(st.id)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold border border-emerald-200/60 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('grades.view_card')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: OFFICIAL STUDENT REPORT CARD (BULLETIN SCOLAIRE)
          ========================================================================= */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={t('grades.report_card_title')}
        maxWidth="max-w-3xl"
      >
        {cardData && (
          <div className="space-y-4">
            <div className="flex justify-end no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>{t('grades.print_card')}</span>
              </button>
            </div>

            {/* Printable Report Card Sheet */}
            <div className="p-6 bg-white border border-slate-300 rounded-2xl space-y-4 text-xs">
              {/* Header */}
              <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
                <h3 className="font-black text-base text-slate-900">{settings.school_name_ar}</h3>
                <h4 className="font-bold text-xs text-slate-600">{t('grades.term_results_for', { year: activeYear?.name || '' })}</h4>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('grades.card_student_name')}</span>
                  <strong className="text-slate-900">{cardData.student.first_name_ar} {cardData.student.last_name_ar}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('grades.card_matricule')}</span>
                  <strong className="font-mono text-slate-900">{cardData.student.matricule}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('grades.card_rank')}</span>
                  <strong className="text-emerald-700 font-bold">{cardData.reportCard?.class_rank || '-'} / {cardData.reportCard?.total_students || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('grades.card_overall_gpa')}</span>
                  <strong className="text-base font-black text-emerald-800 font-mono">
                    {cardData.reportCard?.overall_gpa !== undefined ? `${cardData.reportCard.overall_gpa} / 20` : t('grades.card_computing')}
                  </strong>
                </div>
              </div>

              {/* Subjects Table */}
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2 border border-slate-200">{t('grades.card_col_subject')}</th>
                    <th className="p-2 border border-slate-200 text-center">{t('grades.card_col_coefficient')}</th>
                    <th className="p-2 border border-slate-200 text-center">{t('grades.card_col_score')}</th>
                    <th className="p-2 border border-slate-200">{t('grades.card_col_remarks')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cardData.grades?.map((g, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-2 border border-slate-200 font-bold">{g.subject_name_ar}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono">{g.coefficient}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700">
                        {g.score !== null && g.score !== undefined ? `${g.score} / ${g.max_score}` : '-'}
                      </td>
                      <td className="p-2 border border-slate-200 text-slate-500">{g.remarks || t('grades.card_default_remarks')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Decision and stamps */}
              <div className="pt-4 flex justify-between text-xs text-slate-700">
                <div>
                  <p className="font-bold">{t('grades.card_council_appreciation')}</p>
                  <p className="text-emerald-800 font-extrabold mt-1">{cardData.reportCard?.appreciation || t('grades.card_default_appreciation')}</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{t('grades.card_stamp_title')}</p>
                  <div className="h-12 w-40 border border-dashed border-slate-300 rounded-xl mt-1 flex items-center justify-center text-slate-300 text-[10px]">
                    {t('grades.card_stamp_placeholder')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
