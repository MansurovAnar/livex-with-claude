import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import LoginPage from '../pages/auth/LoginPage';

import AdminLayout from '../components/layout/AdminLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import ExamsPage from '../pages/admin/ExamsPage';
import NewExamPage from '../pages/admin/NewExamPage';
import StudentsPage from '../pages/admin/StudentsPage';
import UsersPage from '../pages/admin/UsersPage';
import SchoolsPage from '../pages/admin/SchoolsPage';

import SecurityLayout from '../components/layout/SecurityLayout';
import ExamSelectorPage from '../pages/security/ExamSelectorPage';
import EntryCheckPage from '../pages/security/EntryCheckPage';

import ReceptionLayout from '../components/layout/ReceptionLayout';
import AddStudentPage from '../pages/reception/AddStudentPage';
import StudentSearchPage from '../pages/reception/StudentSearchPage';
import RegisterToExamPage from '../pages/reception/RegisterToExamPage';
import ReceptionExamsPage from '../pages/reception/ReceptionExamsPage';

import ExamStudentsPage from '../pages/shared/ExamStudentsPage';
import PartnersPage from '../pages/shared/PartnersPage';
import MonitorPage from '../pages/monitor/MonitorPage';

import PartnerLayout from '../components/layout/PartnerLayout';
import MyStudentsPage from '../pages/partner/MyStudentsPage';
import PartnerRegisterPage from '../pages/partner/PartnerRegisterPage';
import PartnerPaymentsPage from '../pages/partner/PartnerPaymentsPage';
import PartnerExamsPage from '../pages/shared/PartnerExamsPage';
import PartnerExamStudentsPage from '../pages/shared/PartnerExamStudentsPage';
import PartnerMyExamStudentsPage from '../pages/partner/PartnerMyExamStudentsPage';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'security') return <Navigate to="/security" replace />;
  if (user.role === 'reception') return <Navigate to="/reception" replace />;
  if (user.role === 'partner') return <Navigate to="/partner" replace />;
  return <Navigate to="/monitor" replace />;
}

function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRedirect />} />

        <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/new" element={<NewExamPage />} />
          <Route path="exams/:id/students" element={<ExamStudentsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="partners/:partnerId/exams" element={<PartnerExamsPage />} />
          <Route path="partners/:partnerId/exams/:examId/students" element={<PartnerExamStudentsPage />} />
          <Route path="schools" element={<SchoolsPage />} />
        </Route>

        <Route path="/security" element={<RequireAuth roles={['security', 'admin']}><SecurityLayout /></RequireAuth>}>
          <Route index element={<ExamSelectorPage />} />
          <Route path="exam/:id" element={<EntryCheckPage />} />
        </Route>

        <Route path="/reception" element={<RequireAuth roles={['reception', 'admin']}><ReceptionLayout /></RequireAuth>}>
          <Route index element={<StudentSearchPage />} />
          <Route path="add" element={<AddStudentPage />} />
          <Route path="register" element={<RegisterToExamPage />} />
          <Route path="exams" element={<ReceptionExamsPage />} />
          <Route path="exams/:id/students" element={<ExamStudentsPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="partners/:partnerId/exams" element={<PartnerExamsPage />} />
          <Route path="partners/:partnerId/exams/:examId/students" element={<PartnerExamStudentsPage />} />
        </Route>

        <Route path="/partner" element={<RequireAuth roles={['partner']}><PartnerLayout /></RequireAuth>}>
          <Route index element={<MyStudentsPage />} />
          <Route path="register" element={<PartnerRegisterPage />} />
          <Route path="exams/:examId/students" element={<PartnerMyExamStudentsPage />} />
          <Route path="payments" element={<PartnerPaymentsPage />} />
        </Route>

        <Route path="/monitor/:examId" element={<RequireAuth roles={['admin', 'viewer']}><MonitorPage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
