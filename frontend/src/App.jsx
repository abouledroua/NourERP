import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { UIFeedbackProvider } from './context/UIFeedbackContext';

import Layout from './components/Layout';
import RequireAcademicYearModal from './components/RequireAcademicYearModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import Teachers from './pages/Teachers';
import Timetable from './pages/Timetable';
import Grades from './pages/Grades';
import Attendance from './pages/Attendance';
import Finance from './pages/Finance';
import InventoryPOS from './pages/InventoryPOS';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Rooms from './pages/Rooms';
import Announcements from './pages/Announcements';
import ParentLogin from './pages/ParentLogin';
import ParentPortal from './pages/ParentPortal';

function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { activeYear, loading: settingsLoading } = useSettings();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {!settingsLoading && !activeYear && <RequireAcademicYearModal />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
          <UIFeedbackProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/parent-login" element={<ParentLogin />} />
                <Route path="/parent" element={<ParentPortal />} />

                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="students" element={<Students />} />
                  <Route path="students/:id" element={<StudentDetails />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="classes/:id" element={<ClassDetails />} />
                  <Route path="rooms" element={<Rooms />} />
                  <Route path="teachers" element={<Teachers />} />
                  <Route path="timetable" element={<Timetable />} />
                  <Route path="grades" element={<Grades />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="inventory" element={<InventoryPOS />} />
                  <Route path="announcements" element={<Announcements />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </UIFeedbackProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
