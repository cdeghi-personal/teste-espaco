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
      therapists/   TherapistsPage, TherapistFormModal
      specialties/  SpecialtiesPage, SpecialtyFormModal
      paymentmethods/ PaymentMethodsPage, PaymentMethodFormModal
      diagnoses/    DiagnosesPage, DiagnosisFormModal
      patientstatus/ PatientStatusPage, PatientStatusFormModal
      rooms/        RoomsPage, RoomFormModal
supabase/
  01_schema.sql                  # Tabelas, enums, índices, trigger de criação de profile
  02_rls.sql                     # Row Level Security — admin vê tudo, terapeuta vê só os seus
  03_invite_therapist.sql        # Função link_therapist_user + documentação do fluxo
  04_fix_trigger.sql             # Fix: trigger com search_path = public (resolve erro de user_role)
  05_prontuario.sql              # Tabelas do prontuário clínico colaborativo
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
| `patient_family_context` | Contexto familiar e escolar — 1:1 com paciente |
| `patient_clinical_history` | Histórico clínico, medicamentos, comorbidades — 1:1 com paciente |
| `patient_assessments` | Avaliação inicial por especialidade — 1 por paciente/especialidade |
| `therapeutic_plans` | Plano terapêutico por especialidade — colaborativo |

### Mappers (DB → App)

Todos em `src/lib/supabase.js`. Convertem snake_case do banco para camelCase do app:
- `mapPatient`, `mapGuardian`, `mapTherapist`, `mapAppointment`, `mapConsultation`
- `mapSpecialty`, `mapPaymentMethod`, `mapDiagnosis`, `mapPatientStatus`, `mapRoom`
- `mapFamilyContext`, `mapClinicalHistory`, `mapAssessment`, `mapTherapeuticPlan`
- `syncPatientRelations(patientId, { specialties, secondaryTherapistIds, conditionIds })`
- `syncGuardianPatients(guardianId, patientIds)`

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
'/admin/responsaveis', '/admin/consultas'
'/admin/terapeutas', '/admin/especialidades', '/admin/formapagamento'
'/admin/diagnostico', '/admin/statuspaciente', '/admin/salas'
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

## Prontuário Clínico (PatientDetailPage)

`PatientDetailPage` tem 5 abas:

| Aba | Componente | Conteúdo |
|---|---|---|
| Resumo | inline | Dados cadastrais + prévia das últimas 3 consultas |
| Prontuário | `ProntuarioTab` | Contexto familiar · Histórico clínico · Avaliações por especialidade |
| Plano Terapêutico | `PlanoTerapeuticoTab` | Um painel por especialidade — cada terapeuta edita só a sua |
| Consultas | inline | Evolução por sessão (existente) |
| Responsáveis | inline | Responsáveis vinculados (existente) |

**Padrão de edição inline:** botão lápis abre campos no lugar, salva sem modal.
Cada seção exibe `Atualizado por [nome] · [data]` para rastreabilidade colaborativa.

**Controle de acesso no Plano Terapêutico:**
- Admin: edita todos os planos de todas as especialidades
- Terapeuta: edita apenas o plano da sua própria especialidade; vê os demais somente leitura

**Funções do DataContext para prontuário:**
- `getFamilyContext(patientId)` / `saveFamilyContext(patientId, data, authUserId)`
- `getClinicalHistory(patientId)` / `saveClinicalHistory(patientId, data, authUserId)`
- `getAssessments(patientId)` / `saveAssessment(patientId, specialty, data, therapistId)`
- `getTherapeuticPlans(patientId)` / `saveTherapeuticPlan(patientId, specialty, data, authUserId)`

Todas usam `upsert` — criam ou atualizam sem duplicar.

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
