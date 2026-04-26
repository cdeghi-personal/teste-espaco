import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ROUTES } from './constants/routes'

// Layouts & Guards
import PublicLayout from './components/layout/PublicLayout'
import AdminLayout from './components/layout/AdminLayout'
import PrivateRoute from './components/guards/PrivateRoute'

// Public Pages
import HomePage from './pages/public/HomePage'
import AboutPage from './pages/public/AboutPage'
import ServicesPage from './pages/public/ServicesPage'
import TeamPage from './pages/public/TeamPage'
import ContactPage from './pages/public/ContactPage'

// Auth
import LoginPage from './pages/auth/LoginPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage'
import AgendaPage from './pages/admin/agenda/AgendaPage'
import PatientsPage from './pages/admin/patients/PatientsPage'
import PatientDetailPage from './pages/admin/patients/PatientDetailPage'
import PatientAdvancedSearchPage from './pages/admin/patients/PatientAdvancedSearchPage'
import GuardiansPage from './pages/admin/guardians/GuardiansPage'
import ConsultationsPage from './pages/admin/consultations/ConsultationsPage'
import MedicalRecordsPage from './pages/admin/medicalrecords/MedicalRecordsPage'

// Admin - Cadastros
import TherapistsPage from './pages/admin/therapists/TherapistsPage'
import SpecialtiesPage from './pages/admin/specialties/SpecialtiesPage'
import PaymentMethodsPage from './pages/admin/paymentmethods/PaymentMethodsPage'
import DiagnosesPage from './pages/admin/diagnoses/DiagnosesPage'
import PatientStatusPage from './pages/admin/patientstatus/PatientStatusPage'
import ConsultationStatusPage from './pages/admin/consultationstatus/ConsultationStatusPage'
import AppointmentTypesPage from './pages/admin/appointmenttypes/AppointmentTypesPage'
import RoomsPage from './pages/admin/rooms/RoomsPage'
import AuditPage from './pages/admin/audit/AuditPage'
import ContactLeadsPage from './pages/admin/contactleads/ContactLeadsPage'
import ReportsPage from './pages/admin/reports/ReportsPage'
import ConvenioReportPage from './pages/admin/reports/ConvenioReportPage'
import SupportPage from './pages/admin/support/SupportPage'
import AgeRangesPage from './pages/admin/ageranges/AgeRangesPage'
import CompanySettingsPage from './pages/admin/company/CompanySettingsPage'
import GuidePage from './pages/admin/guide/GuidePage'
import GuidePageV2 from './pages/admin/guide/GuidePageV2'

// Common
import ScrollToTop from './components/common/ScrollToTop'
import { useAuth } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'

// Redireciona para reset de senha quando o link de convite/recuperação é clicado
function AuthRedirect() {
  const { needsPasswordReset } = useAuth()
  if (needsPasswordReset) return <Navigate to="/reset-senha" replace />
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
        <AuthRedirect />
        <DataProvider>
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.ABOUT} element={<AboutPage />} />
              <Route path={ROUTES.SERVICES} element={<ServicesPage />} />
              <Route path={ROUTES.TEAM} element={<TeamPage />} />
              <Route path={ROUTES.CONTACT} element={<ContactPage />} />
            </Route>

            {/* Auth */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path="/reset-senha" element={<ResetPasswordPage />} />

            {/* Admin (protected) */}
            <Route element={<PrivateRoute />}>
              <Route element={<AdminLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                <Route path={ROUTES.AGENDA} element={<AgendaPage />} />
                <Route path={ROUTES.PATIENTS} element={<PatientsPage />} />
                <Route path={ROUTES.PATIENTS_ADVANCED} element={<PatientAdvancedSearchPage />} />
                <Route path={ROUTES.PATIENT_DETAIL} element={<PatientDetailPage />} />
                <Route path={ROUTES.GUARDIANS} element={<GuardiansPage />} />
                <Route path={ROUTES.CONSULTATIONS} element={<ConsultationsPage />} />
                <Route path={ROUTES.MEDICAL_RECORDS} element={<MedicalRecordsPage />} />
                <Route path={ROUTES.THERAPISTS} element={<TherapistsPage />} />
                <Route path={ROUTES.SPECIALTIES_ADMIN} element={<SpecialtiesPage />} />
                <Route path={ROUTES.PAYMENT_METHODS} element={<PaymentMethodsPage />} />
                <Route path={ROUTES.DIAGNOSES} element={<DiagnosesPage />} />
                <Route path={ROUTES.PATIENT_STATUS} element={<PatientStatusPage />} />
                <Route path={ROUTES.CONSULTATION_STATUS} element={<ConsultationStatusPage />} />
                <Route path={ROUTES.APPOINTMENT_TYPES} element={<AppointmentTypesPage />} />
                <Route path={ROUTES.ROOMS} element={<RoomsPage />} />
                <Route path={ROUTES.AGE_RANGES} element={<AgeRangesPage />} />
                <Route path={ROUTES.AUDIT} element={<AuditPage />} />
                <Route path={ROUTES.CONTACT_LEADS} element={<ContactLeadsPage />} />
                <Route path={ROUTES.CONVENIO_REPORT} element={<ConvenioReportPage />} />
                <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                <Route path={ROUTES.SUPPORT} element={<SupportPage />} />
                <Route path={ROUTES.COMPANY_SETTINGS} element={<CompanySettingsPage />} />
                <Route path={ROUTES.GUIDE} element={<GuidePage />} />
                <Route path={ROUTES.GUIDE_V2} element={<GuidePageV2 />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
