# Espaço Casa Amarela — Contexto do Projeto

## O que é este projeto

Sistema de gestão para uma clínica de terapias infantis multidisciplinares chamada **Espaço Casa Amarela**. Tem duas partes: um site público institucional e um painel administrativo protegido por login.

## Stack

- **React 19** + **Vite**
- **Tailwind CSS v3** (sem component library externa)
- **React Router v7**
- **react-icons** (prefixo `Fi` do Feather Icons)
- **date-fns** para manipulação de datas
- **Sem backend** — dados persistidos em `localStorage` com seed de dados mock

## Estrutura de pastas relevante

```
src/
  App.jsx                        # Rotas principais
  main.jsx
  constants/
    routes.js                    # Todas as rotas centralizadas em ROUTES
    specialties.js               # SPECIALTIES, CONDITIONS, APPOINTMENT_STATUS, PATIENT_STATUS, SESSION_QUALITY
  context/
    AuthContext.jsx              # useAuth() — user, isAuthenticated, login, logout
    DataContext.jsx              # useData() — todos os dados e CRUD
  utils/
    storageUtils.js              # storageGet, storageSet, storageRemove, generateId
    dateUtils.js                 # formatDateBR, formatDateShort, formatWeekDay, isoToday, calculateAge, getWeekDays, formatMonthYear
    validators.js
  data/
    mockPatients.js, mockGuardians.js, mockAppointments.js, mockConsultations.js
    mockTherapists.js, mockSpecialties.js, mockPaymentMethods.js
    mockDiagnoses.js, mockPatientStatuses.js, mockRooms.js, mockUsers.js
  components/
    layout/
      PublicLayout.jsx, PublicHeader.jsx, PublicFooter.jsx
      AdminLayout.jsx, AdminSidebar.jsx
    guards/
      PrivateRoute.jsx
    common/
      ScrollToTop.jsx
    ui/
      Badge.jsx, Button.jsx, Input.jsx, Select.jsx, Textarea.jsx, Modal.jsx, EmptyState.jsx, Spinner.jsx
  pages/
    public/   HomePage, AboutPage, ServicesPage, TeamPage, ContactPage
    auth/     LoginPage
    admin/
      DashboardPage.jsx
      agenda/       AgendaPage, AppointmentFormModal
      patients/     PatientsPage, PatientDetailPage, PatientFormModal
      guardians/    GuardiansPage, GuardianFormModal
      consultations/ ConsultationsPage, ConsultationFormModal
      therapists/   TherapistsPage, TherapistFormModal
      specialties/  SpecialtiesPage, SpecialtyFormModal
      paymentmethods/ PaymentMethodsPage, PaymentMethodFormModal
      diagnoses/    DiagnosesPage, DiagnosisFormModal
      patientstatus/ PatientStatusPage, PatientStatusFormModal
      rooms/        RoomsPage, RoomFormModal
```

## Entidades e CRUD

Todas gerenciadas pelo `DataContext`. Cada entidade tem seus dados no localStorage com seed inicial dos arquivos mock.

| Entidade | Soft delete? | Campo de exclusão |
|---|---|---|
| patients | Sim | `deleted: true` |
| guardians | Sim | `active: false` |
| therapists | Sim | `active: false` |
| specialtiesData | Não (toggle ativo) | `active` |
| paymentMethods | Não (toggle ativo) | `active` |
| diagnoses | Não (toggle ativo) | `active` |
| patientStatuses | Não (toggle ativo) | `active` |
| rooms | Não (toggle ativo) | `active` |
| appointments | Hard delete | — |
| consultations | Hard delete | — |

## Especialidades

```js
SPECIALTIES = {
  FISIOTERAPIA, FONOAUDIOLOGIA, TO (Terapia Ocupacional), PSICOLOGIA
}
```
Cada especialidade tem `label`, `color` (Tailwind), `bgColor`, `textColor`, `calendarColor`.

## Autenticação e Roles

- Autenticação via `mockUsers.js` + localStorage (sem JWT/backend)
- Dois roles: `admin` e `therapist`
- **Admin** vê tudo. **Therapist** vê apenas seus próprios pacientes, agendamentos e consultas
- Seção "Administração" na sidebar só aparece para admin
- Credenciais mock:
  - `admin@casaamarela.com.br` / `admin2024`
  - `ana@casaamarela.com.br` / `casaamarela123` (e outros terapeutas)

## Rotas

```js
// Públicas
'/', '/sobre', '/servicos', '/equipe', '/contato'
// Auth
'/login'
// Admin (protegidas por PrivateRoute)
'/admin', '/admin/agenda', '/admin/pacientes', '/admin/pacientes/:id'
'/admin/responsaveis', '/admin/consultas'
'/admin/terapeutas', '/admin/especialidades', '/admin/formapagamento'
'/admin/diagnostico', '/admin/statuspaciente', '/admin/salas'
```

## Padrões de código

- Componentes funcionais com hooks
- Formulários em Modais (`*FormModal.jsx`) — padrão: recebem `onClose` e `initialData` (para edição)
- `Badge` component aceita props `specialty` ou `status` e renderiza a cor certa
- IDs gerados por `generateId()` do `storageUtils`
- Datas armazenadas como string ISO `YYYY-MM-DD`; timestamps como ISO completo
- Quando um agendamento vira consulta: `appointment.consultationId = consultation.id` e `appointment.status = 'completed'`

## Site público

Páginas institucionais em português. Usam `PublicLayout` com `PublicHeader` e `PublicFooter`. Conteúdo sobre a clínica, especialidades, equipe e contato. Design com cores `brand-blue` e `brand-yellow`.
