# Espaço Casa Amarela — Contexto do Projeto

## O que é este projeto

Sistema de gestão para uma clínica de terapias infantis multidisciplinares chamada **Espaço Casa Amarela**. Tem duas partes: um site público institucional e um painel administrativo protegido por login.

## Branches

| Branch | Descrição |
|---|---|
| `main` | Versão com localStorage (publicada no Vercel) |
| `feat/supabase` | Versão com Supabase (PostgreSQL + Auth real) — em desenvolvimento |

## Stack

- **React 19** + **Vite**
- **Tailwind CSS v3** (sem component library externa)
- **React Router v7**
- **react-icons** (prefixo `Fi` do Feather Icons)
- **date-fns** para manipulação de datas
- **@supabase/supabase-js** (na branch feat/supabase)

## Estrutura de pastas relevante

```
src/
  App.jsx                        # Rotas principais
  main.jsx
  lib/
    supabase.js                  # Cliente Supabase + mappers DB→app (snake_case→camelCase)
  constants/
    routes.js                    # Todas as rotas centralizadas em ROUTES
    specialties.js               # SPECIALTIES, CONDITIONS, APPOINTMENT_STATUS, PATIENT_STATUS, SESSION_QUALITY
  context/
    AuthContext.jsx              # useAuth() — user, isAuthenticated, needsPasswordReset, login, logout, updatePassword
    DataContext.jsx              # useData() — todos os dados e CRUD (Supabase na feat/supabase, localStorage na main)
  utils/
    storageUtils.js              # storageGet, storageSet, storageRemove, generateId (usado só na main)
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
      Badge.jsx, Button.jsx, Input.jsx, Select.jsx, Textarea.jsx, Modal.jsx, EmptyState.jsx, Spinner.jsx, Toast.jsx
  pages/
    public/   HomePage, AboutPage, ServicesPage, TeamPage, ContactPage
    auth/     LoginPage, ResetPasswordPage
    admin/
      DashboardPage.jsx
      agenda/       AgendaPage, AppointmentFormModal
      patients/     PatientsPage, PatientDetailPage, PatientFormModal, ProntuarioTab, PlanoTerapeuticoTab
      guardians/    GuardiansPage, GuardianFormModal
      consultations/ ConsultationsPage, ConsultationFormModal
      medicalrecords/ MedicalRecordsPage
      therapists/   TherapistsPage, TherapistFormModal
      specialties/  SpecialtiesPage, SpecialtyFormModal
      paymentmethods/ PaymentMethodsPage, PaymentMethodFormModal
      diagnoses/    DiagnosesPage, DiagnosisFormModal
      patientstatus/ PatientStatusPage, PatientStatusFormModal
      consultationstatus/ ConsultationStatusPage, ConsultationStatusFormModal
      rooms/        RoomsPage, RoomFormModal
supabase/
  01_schema.sql                  # Tabelas, enums, índices, trigger de criação de profile
  02_rls.sql                     # Row Level Security — admin vê tudo, terapeuta vê só os seus
  03_invite_therapist.sql        # Função link_therapist_user + documentação do fluxo
  04_fix_trigger.sql             # Fix: trigger com search_path = public (resolve erro de user_role)
  05_prontuario.sql              # Tabelas do prontuário clínico colaborativo (legado — substituído por 07)
  06_new_fields.sql              # Novos campos: dados bancários/especialidades do terapeuta, dados pessoais/escola/médico/externos do paciente
  07_medical_records.sql         # Prontuário novo: medical_records, medical_record_exams, medical_record_medications, medical_record_conducts, consultation_statuses
  functions/
    invite-therapist/index.ts    # Edge Function — envia convite por e-mail ao criar terapeuta
```

## Supabase — Banco de Dados

### Variáveis de ambiente necessárias

Arquivo `.env.local` na raiz (nunca commitar):
```
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Encontrar em: Supabase Dashboard → Project Settings → API.

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profiles` | Vincula `auth.users` ao role (`admin` ou `therapist`) |
| `therapists` | Terapeutas — tem `user_id` que referencia `auth.users` |
| `patients` | Pacientes — soft delete com `deleted = true` |
| `patient_specialties` | Relação N:N paciente ↔ especialidade |
| `patient_secondary_therapists` | Relação N:N paciente ↔ terapeutas secundários |
| `patient_conditions` | Relação N:N paciente ↔ diagnósticos |
| `guardians` | Responsáveis — soft delete com `active = false` |
| `patient_guardians` | Relação N:N paciente ↔ responsável |
| `appointments` | Agendamentos — hard delete |
| `consultations` | Consultas/evolução — hard delete |
| `consultation_activities` | Atividades dentro de uma consulta |
| `specialties` | Tabela de config — toggle `active` |
| `payment_methods` | Tabela de config — toggle `active` |
| `diagnoses` | Tabela de config — toggle `active` |
| `patient_statuses` | Tabela de config — toggle `active` |
| `rooms` | Salas — toggle `active` |
| `therapist_specialties` | Relação N:N terapeuta ↔ especialidade + nº do conselho regional |
| `patient_external_therapists` | Terapeutas externos vinculados ao paciente (nome, especialidade, telefone) |
| `consultation_statuses` | Status da consulta (ex: Realizada, Faltou, Cancelada) — toggle `active` |
| `medical_records` | Prontuário do paciente — 1:1, criado automaticamente ao abrir |
| `medical_record_exams` | Exames complementares do paciente — N por prontuário |
| `medical_record_medications` | Medicamentos do paciente — N por prontuário |
| `medical_record_conducts` | Conduta & objetivo terapêutico — N por prontuário, vinculado ao terapeuta/especialidade |

### Mappers (DB → App)

Todos em `src/lib/supabase.js`. Convertem snake_case do banco para camelCase do app:
- `mapPatient`, `mapGuardian`, `mapTherapist`, `mapAppointment`, `mapConsultation`
- `mapSpecialty`, `mapPaymentMethod`, `mapDiagnosis`, `mapPatientStatus`, `mapRoom`
- `mapConsultationStatus`, `mapExam`, `mapMedication`, `mapConduct`
- `syncPatientRelations(patientId, { specialties, secondaryTherapistIds, conditionIds })`
- `syncGuardianPatients(guardianId, patientIds)`
- `syncTherapistSpecialties(therapistId, [{ specialty, credential }])`
- `syncExternalTherapists(patientId, [{ name, specialty, phone }])`

### Como criar admins

1. Supabase Dashboard → Authentication → Users → "+ Add user" → Create new user
2. Preencher email + senha + marcar "Auto Confirm User"
3. Rodar no SQL Editor (pode adicionar múltiplos de uma vez):
```sql
INSERT INTO public.profiles (id, role)
VALUES
  ((SELECT id FROM auth.users WHERE email = 'admin1@email.com'), 'admin'),
  ((SELECT id FROM auth.users WHERE email = 'admin2@email.com'), 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## Autenticação e Roles (feat/supabase)

- Autenticação via **Supabase Auth** (JWT real)
- Dois roles: `admin` e `therapist` — armazenados na tabela `profiles`
- Role definido no `app_metadata` do Supabase (só o backend pode escrever)
- **Admin** vê tudo. **Therapist** vê apenas seus próprios dados (via RLS no banco)
- `user.id` no contexto = ID da tabela `therapists` (não o UUID do auth)
- `user.authId` = UUID do `auth.users`

### Fluxo de convite de terapeuta

```
Admin cria terapeuta no TherapistFormModal
  → INSERT em therapists (sem user_id ainda)
  → Chama Edge Function invite-therapist
  → Supabase envia e-mail de convite
  → Terapeuta clica no link → abre ResetPasswordPage
  → Define senha → therapists.user_id é vinculado automaticamente
```

### Fluxo de reset de senha / convite

- Supabase redireciona para o app com evento `PASSWORD_RECOVERY`
- `AuthContext` detecta esse evento e seta `needsPasswordReset = true`
- `App.jsx` tem `<AuthRedirect />` que redireciona para `/reset-senha`
- `ResetPasswordPage` chama `updatePassword()` → entra no dashboard

### Configuração de URL no Supabase

Authentication → URL Configuration:
- Site URL: URL do ambiente (localhost ou produção)
- Redirect URLs: adicionar `http://localhost:5175/**` para dev e URL do Vercel para prod

### SMTP (e-mails)

O plano gratuito do Supabase tem limite de **2 e-mails/hora**.
Para produção, configurar SMTP próprio em Project Settings → Auth → SMTP Settings.
Recomendado: **Resend** (resend.com) — 3.000 e-mails/mês grátis.

## Entidades e CRUD

| Entidade | Soft delete? | Campo |
|---|---|---|
| patients | Sim | `deleted: true` |
| guardians | Sim | `active: false` |
| therapists | Sim | `active: false` |
| specialtiesData | Toggle | `active` |
| paymentMethods | Toggle | `active` |
| diagnoses | Toggle | `active` |
| patientStatuses | Toggle | `active` |
| rooms | Toggle | `active` |
| appointments | Hard delete | — |
| consultations | Hard delete | — |
| consultationStatuses | Toggle | `active` |
| medical_records | Hard delete | — |
| medical_record_exams | Hard delete | — |
| medical_record_medications | Hard delete | — |
| medical_record_conducts | Hard delete | — |

## Especialidades

```js
SPECIALTIES = {
  FISIOTERAPIA, FONOAUDIOLOGIA, TO (Terapia Ocupacional), PSICOLOGIA
}
```
Cada especialidade tem `label`, `color` (Tailwind), `bgColor`, `textColor`, `calendarColor`.

## Rotas

```js
// Públicas
'/', '/sobre', '/servicos', '/equipe', '/contato'
// Auth
'/login', '/reset-senha'
// Admin (protegidas por PrivateRoute)
'/admin', '/admin/agenda', '/admin/pacientes', '/admin/pacientes/:id'
'/admin/responsaveis', '/admin/consultas', '/admin/prontuario'
'/admin/terapeutas', '/admin/especialidades', '/admin/formapagamento'
'/admin/diagnostico', '/admin/statuspaciente', '/admin/statusconsulta', '/admin/salas'
```

## Padrões de código

- Componentes funcionais com hooks
- Formulários em Modais (`*FormModal.jsx`) — padrão: recebem `onClose` e `initial` (para edição)
- `Badge` component aceita props `specialty`, `quality` ou `patientStatus`
- Datas armazenadas como string ISO `YYYY-MM-DD`; timestamps como ISO completo
- Quando um agendamento vira consulta: `appointment.consultationId = consultation.id` e `appointment.status = 'completed'`
- Na branch feat/supabase, o DataContext é **async** — todas as funções CRUD retornam Promise
- Erros do Supabase são exibidos via `Toast` (notificação na parte inferior da tela, 4s)
- Funções CRUD retornam `{ error: string }` em caso de falha, ou o objeto criado em caso de sucesso
- AuthContext usa `.maybeSingle()` no fetch de profile — nunca trava o login mesmo sem perfil cadastrado

## Toast (notificações)

- Componente em `src/components/ui/Toast.jsx`
- `ToastProvider` envolve o app em `App.jsx` (dentro de `AuthProvider`)
- Hook `useToast()` retorna `{ show(message, type) }` — type: `'error'` (padrão) ou `'success'`
- Aparece na parte inferior centralizada, desaparece em 4s, pode ser fechado manualmente

## Sidebar Admin (mobile)

- Seção "Administração" é **colapsável** — começa fechada no mobile
- Botão `▼/▲` ao lado do título "Administração" abre/fecha os itens de config
- "Sair" sempre visível no rodapé da sidebar (fora da área rolável)

## Tela de Login

- Logo oficial `/logo.jpg` no topo
- Botão "Esqueci minha senha" ao lado do label do campo senha
- Dispara `supabase.auth.resetPasswordForEmail()` com redirect para `/reset-senha`
- Exibe tela de confirmação após envio do e-mail

## Campos do Terapeuta

- **Especialidades múltiplas:** tabela `therapist_specialties` — cada linha tem `specialty` (chave do enum) e `credential` (nº do conselho, ex: CRFa 2/12345)
- O campo `therapists.specialty` guarda a especialidade principal (primeira da lista) para compatibilidade com queries existentes
- **Dados bancários:** `bank`, `agency`, `account_number`, `pix_key` na tabela `therapists`
- No formulário, dados bancários ficam em linha (4 campos lado a lado)

## Campos do Paciente (migração 06)

- **Dados pessoais extras:** `rg`, `phone`, `email`, `address`, `neighborhood`, `city`, `state`, `zip_code`, `indication`
- **Dados escolares:** `school_name`, `school_phone`, `school_address`, `school_neighborhood`, `school_city`, `school_state`, `school_zip`, `school_coordinator`
- **Médico responsável:** `doctor_insurance`, `doctor_name`, `doctor_specialty`, `doctor_phone`
- **Terapeutas externos:** tabela `patient_external_therapists` — lista N por paciente, com `name`, `specialty`, `phone`
- No mapper `mapPatient`: campo `externalTherapists` (array) + todos os novos campos em camelCase

## PatientDetailPage

Tem 3 abas: **Resumo**, **Consultas**, **Responsáveis**.

## Prontuário Clínico (MedicalRecordsPage — `/admin/prontuario`)

Página independente de prontuário. Fluxo: busca paciente → carrega/cria `medical_record` → exibe 4 seções colapsáveis:

| Seção | Tabela | Descrição |
|---|---|---|
| Exames Complementares | `medical_record_exams` | Descrição, data, link/anexo, observações |
| Medicamentos | `medical_record_medications` | Medicamento, data, status (ativa/interrompida), observações |
| Conduta & Objetivo Terapêutico | `medical_record_conducts` | Terapeuta, especialidade, conduta, objetivo, datas, status |
| Histórico de Atendimentos | `consultations` | Navegação por mês, leitura das consultas já registradas |

**Padrão de edição inline:** cada linha tem lápis (abre draft local) e lixeira. Novo item usa formulário dashed expandido.

**Funções do DataContext para prontuário:**
- `getOrCreateMedicalRecord(patientId, authUserId)` → retorna `medicalRecordId`
- `getExams(mrId)` / `addExam(mrId, data)` / `updateExam(id, data)` / `deleteExam(id)`
- `getMedications(mrId)` / `addMedication(mrId, data)` / `updateMedication(id, data)` / `deleteMedication(id)`
- `getConducts(mrId)` / `addConduct(mrId, data)` / `updateConduct(id, data)` / `deleteConduct(id)`

**Componentes internos (não exportados):** `ExamRow`, `MedRow`, `ConductRow`, `InlineRow`, `Section` — cada Row gerencia seu próprio estado de edição via `useState` local.

## Status da Consulta (`/admin/statusconsulta`)

Tabela `consultation_statuses` — toggle `active`, cor do badge configurável.
Funções no DataContext: `addConsultationStatus(data)` / `updateConsultationStatus(id, data)`.

## Especialidades (tabela `specialties` no banco)

- Campos no banco: `key` (identificador único, ex: `MUSICOTERAPIA`) e `label` (nome exibido)
- `SpecialtyFormModal` gera o `key` automaticamente a partir do `label` digitado
- `key` aceita apenas letras maiúsculas, números e `_`
- A página exibe tanto o `label` quanto o `key` em cada linha

## Deploy

- **Vercel** — conectado ao GitHub (branch `main`)
- `vercel.json` com rewrite `/* → /index.html` para SPA routing
- Variáveis de ambiente do Supabase configuradas em Vercel → Settings → Environment Variables
- Edge Functions deployadas via: `npx supabase functions deploy invite-therapist --project-ref SEU_PROJECT_ID`

## Site público

Páginas institucionais em português. Usam `PublicLayout` com `PublicHeader` e `PublicFooter`. Design com cores `brand-blue` e `brand-yellow`.
