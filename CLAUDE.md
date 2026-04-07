# Espaço Casa Amarela — Contexto do Projeto

## O que é este projeto

Sistema de gestão para uma clínica de terapias infantis multidisciplinares chamada **Espaço Casa Amarela**. Tem duas partes: um site público institucional e um painel administrativo protegido por login.

## Branches

| Branch | Descrição |
|---|---|
| `main` | Versão com Supabase (publicada no Vercel) — versão principal |
| `feat/supabase` | Branch de desenvolvimento — merges periódicos para main |

## Stack

- **React 19** + **Vite**
- **Tailwind CSS v3** (sem component library externa)
- **React Router v7**
- **react-icons** (prefixo `Fi` do Feather Icons)
- **date-fns** para manipulação de datas
- **@supabase/supabase-js**

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
    DataContext.jsx              # useData() — todos os dados e CRUD (Supabase)
  utils/
    storageUtils.js              # generateId (helpers locais)
    dateUtils.js                 # formatDateBR, formatDateShort, formatWeekDay, isoToday, calculateAge, getWeekDays, formatMonthYear
    validators.js
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
      agenda/           AgendaPage, AppointmentFormModal
      patients/         PatientsPage, PatientDetailPage, PatientFormModal
      guardians/        GuardiansPage, GuardianFormModal
      consultations/    ConsultationsPage, ConsultationFormModal
      medicalrecords/   MedicalRecordsPage
      therapists/       TherapistsPage, TherapistFormModal
      specialties/      SpecialtiesPage, SpecialtyFormModal
      paymentmethods/   PaymentMethodsPage, PaymentMethodFormModal
      diagnoses/        DiagnosesPage, DiagnosisFormModal
      patientstatus/    PatientStatusPage, PatientStatusFormModal
      consultationstatus/ ConsultationStatusPage, ConsultationStatusFormModal
      appointmenttypes/ AppointmentTypesPage, AppointmentTypeFormModal
      rooms/            RoomsPage, RoomFormModal
supabase/
  01_schema.sql                  # Tabelas, enums, índices, trigger de criação de profile
  02_rls.sql                     # Row Level Security — admin vê tudo, terapeuta vê só os seus
  03_invite_therapist.sql        # Função link_therapist_user + documentação do fluxo
  04_fix_trigger.sql             # Fix: trigger com search_path = public (resolve erro de user_role)
  05_prontuario.sql              # Legado — substituído por 07
  06_new_fields.sql              # Novos campos: dados bancários/especialidades do terapeuta, dados pessoais/escola/médico/externos do paciente
  07_medical_records.sql         # Prontuário novo + DROP patient_secondary_therapists CASCADE + recria RLS
  08_appointment_types.sql       # Tabela appointment_types + coluna appointment_type_id em consultations
  09_consultation_status_automatic.sql  # Flag automatic em consultation_statuses
  10_guardian_neighborhood.sql   # Campo neighborhood em guardians
  11_consultation_time_room.sql  # Campos time e room_id em consultations
  12_involved_therapists.sql     # Tabela patient_involved_therapists + RLS atualizado para Gerente de Conta + Envolvidos
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
| `patient_conditions` | Relação N:N paciente ↔ diagnósticos (comorbidades) |
| `guardians` | Responsáveis — soft delete com `active = false`; tem campo `neighborhood` |
| `patient_guardians` | Relação N:N paciente ↔ responsável |
| `appointments` | Agendamentos — hard delete; campos `time` (HH:MM), `room_id` |
| `consultations` | Consultas/evolução — hard delete; tem `appointment_type_id`, `time` (HH:MM), `room_id` |
| `consultation_activities` | Atividades dentro de uma consulta |
| `specialties` | Tabela de config — toggle `active` |
| `payment_methods` | Tabela de config — toggle `active` |
| `diagnoses` | Tabela de config — toggle `active` |
| `patient_statuses` | Tabela de config — toggle `active` |
| `rooms` | Salas — toggle `active` |
| `therapist_specialties` | Relação N:N terapeuta ↔ especialidade + nº do conselho regional |
| `patient_external_therapists` | Terapeutas externos vinculados ao paciente (nome, especialidade, telefone) |
| `consultation_statuses` | Status do atendimento — toggle `active`, cor configurável, flag `automatic` |
| `appointment_types` | Tipos de atendimento (Sessão Individual, Grupo etc.) — toggle `active` |
| `medical_records` | Prontuário do paciente — 1:1, criado automaticamente ao abrir |
| `medical_record_exams` | Exames complementares do paciente — N por prontuário |
| `medical_record_medications` | Medicamentos do paciente — N por prontuário |
| `medical_record_conducts` | Conduta & objetivo terapêutico — N por prontuário, vinculado ao terapeuta/especialidade |
| `patient_involved_therapists` | Terapeutas envolvidos no atendimento do paciente (N:N) — complementa o Gerente de Conta |

### Mappers (DB → App)

Todos em `src/lib/supabase.js`. Convertem snake_case do banco para camelCase do app:
- `mapPatient`, `mapGuardian` (inclui `neighborhood`), `mapTherapist`, `mapAppointment` (inclui `startTime`, `endTime` calculado via duration), `mapConsultation` (inclui `time`, `roomId`)
- `mapSpecialty`, `mapPaymentMethod`, `mapDiagnosis`, `mapPatientStatus`, `mapRoom`
- `mapConsultationStatus` (inclui `automatic`), `mapAppointmentType`, `mapExam`, `mapMedication`, `mapConduct`
- `syncPatientRelations(patientId, { specialties, conditionIds })`
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

## Autenticação e Roles

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

### Deploy da Edge Function

```
npx supabase functions deploy invite-therapist --project-ref ffkkgmikvsqhutftoajh
```

O Project Ref está em: Supabase Dashboard → Project Settings → General → Reference ID.
Também configurar a secret `SITE_URL` em: Edge Functions → invite-therapist → Secrets.

> **IMPORTANTE — JWT Verification:** A Edge Function `invite-therapist` deve ter **JWT Verification DESATIVADO** (Supabase Dashboard → Edge Functions → invite-therapist → Settings → JWT Verification → off). A função faz sua própria verificação de admin via `getUser()` + perfil. Com JWT Verification ativado, o gateway do Supabase rejeita a requisição com 401 antes de qualquer código rodar, e nenhum log aparece.

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
| appointmentTypes | Toggle | `active` |
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
'/admin/diagnostico', '/admin/statuspaciente', '/admin/statusconsulta'
'/admin/tipoatendimento', '/admin/salas'
```

## Padrões de código

- Componentes funcionais com hooks
- Formulários em Modais (`*FormModal.jsx`) — padrão: recebem `onClose` e `initial` (para edição)
- `Badge` component aceita props `specialty`, `quality` ou `patientStatus`
- Datas armazenadas como string ISO `YYYY-MM-DD`; timestamps como ISO completo
- Quando um agendamento vira consulta: `appointment.consultationId = consultation.id` e `appointment.status = 'completed'`
- DataContext é **async** — todas as funções CRUD retornam Promise
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

## Campos do Paciente

- **Terapeutas:** `primary_therapist_id` (Gerente de Conta) + tabela `patient_involved_therapists` (Terapeutas Envolvidos, N:N). No app: `therapistId` e `involvedTherapistIds[]`. Terapeuta vê pacientes onde é Gerente OU Envolvido (RLS).
- **Dados pessoais extras:** `rg`, `phone`, `email`, `address`, `neighborhood`, `city`, `state`, `zip_code`, `indication`
- **Dados escolares:** `school_name`, `school_phone`, `school_address`, `school_neighborhood`, `school_city`, `school_state`, `school_zip`, `school_coordinator`
- **Médico responsável:** `doctor_insurance`, `doctor_name`, `doctor_specialty`, `doctor_phone`
- **Terapeutas externos:** tabela `patient_external_therapists` — lista N por paciente, com `name`, `specialty`, `phone`
- **Diagnóstico Principal:** campo `diagnosis` (texto) — no formulário é um Select do cadastro de diagnósticos
- **Comorbidades:** tabela `patient_conditions` — exclui automaticamente o diagnóstico principal da lista

## Campos do Responsável

- Endereço completo: `address`, `neighborhood`, `city`, `state`, `cep`
- Seleção de pacientes vinculados: lista pesquisável com checkboxes (suporta muitos pacientes)
- Busca na listagem: por nome do responsável, CPF, telefone ou **nome do paciente vinculado**

## PatientDetailPage

Tela sem abas — apenas **Resumo** em tela única.

- **Dados Pessoais:** Nome, Nasc, Idade, Sexo, CPF + Terapeuta Principal
- **Informações Clínicas:** Diagnóstico Principal, Comorbidades, **Especialidades em Atendimento** (badges), Forma de Pagamento
- **Responsáveis:** card inline com Nome, Parentesco, Tel, E-mail
- **Observações Gerais:** notas do paciente
- **Últimos Atendimentos:** 10 mais recentes, cada card mostra Data + Horário, Especialidade, Status, Tipo, Terapeuta, Sala

## Prontuário Clínico (MedicalRecordsPage — `/admin/prontuario`)

Página independente de prontuário. Fluxo: busca paciente → carrega/cria `medical_record` → exibe 4 seções colapsáveis:

| Seção | Tabela | Inicia | Descrição |
|---|---|---|---|
| Exames Complementares | `medical_record_exams` | **Fechada** | Descrição, data, link/anexo, observações |
| Medicamentos | `medical_record_medications` | **Fechada** | Medicamento, data, status (ativa/interrompida), observações |
| Conduta & Objetivo Terapêutico | `medical_record_conducts` | **Fechada** | Terapeuta, especialidade, conduta, objetivo, datas, status |
| Histórico de Atendimentos | `consultations` | **Aberta** | Navegação por mês; card compacto com Data+Horário/Especialidade/Terapeuta/Status/Tipo/Sala/Objetivo; lápis abre `ConsultationFormModal`; link "Adicionar atendimento" no rodapé |

**Padrão de edição inline:** cada linha tem lápis (abre draft local) e lixeira. Novo item usa formulário dashed expandido (link `+ Adicionar ...`).

**Funções do DataContext para prontuário:**
- `getOrCreateMedicalRecord(patientId, authUserId)` → retorna `medicalRecordId`
- `getExams(mrId)` / `addExam(mrId, data)` / `updateExam(id, data)` / `deleteExam(id)`
- `getMedications(mrId)` / `addMedication(mrId, data)` / `updateMedication(id, data)` / `deleteMedication(id)`
- `getConducts(mrId)` / `addConduct(mrId, data)` / `updateConduct(id, data)` / `deleteConduct(id)`

**Componentes internos (não exportados):** `ExamRow`, `MedRow`, `ConductRow`, `InlineRow`, `Section(defaultOpen)` — cada Row gerencia seu próprio estado de edição via `useState` local.

## Status Atendimento (`/admin/statusconsulta`)

Tabela `consultation_statuses` — toggle `active`, cor do badge configurável, flag `automatic`.

- Status marcados como `automatic = true` **não aparecem** no Select de Status Atendimento do `ConsultationFormModal` (reservados para atribuição automática pelo sistema)
- Funções no DataContext: `addConsultationStatus(data)` / `updateConsultationStatus(id, data)`

## Tipos de Atendimento (`/admin/tipoatendimento`)

Tabela `appointment_types` — toggle `active`. Dados iniciais: Sessão Individual, Grupo Terapêutico, Avaliação, Devolutiva.
Funções no DataContext: `addAppointmentType(data)` / `updateAppointmentType(id, data)`

## Consultas (`/admin/consultas`)

- Campo **Status Atendimento** filtra automáticos (só mostra os manuais)
- Campo **Tipo de Atendimento** vinculado à tabela `appointment_types`
- Campos **Horário** (type=time) e **Sala** no formulário de registro
- Adicionar atividades usa link inline expandido (padrão prontuário): `+ Adicionar atividade`
- Card na listagem exibe: Paciente, Especialidade, Status, Tipo / Data + Hora, Terapeuta, Sala

## Agenda (`/admin/agenda`)

- `mapAppointment` expõe `startTime` (= `time` do banco) e `endTime` (calculado: startTime + duration)
- `DataContext.addAppointment` e `updateAppointment` aceitam `startTime` ou `time`
- Filtro "Minha Agenda" mostra todos os agendamentos quando o usuário é `admin`

## Atenção — SELECTs explícitos no DataContext

`CONSULTATION_SELECT` lista colunas explicitamente. Ao adicionar novas colunas ao banco, **sempre incluir no SELECT** correspondente, caso contrário o campo só aparece após edição (o insert/update retorna tudo, mas a carga inicial não).

Constantes de SELECT no DataContext: `PATIENT_SELECT`, `GUARDIAN_SELECT`, `CONSULTATION_SELECT`.

## Especialidades (tabela `specialties` no banco)

- Campos no banco: `key` (identificador único, ex: `MUSICOTERAPIA`) e `label` (nome exibido)
- `SpecialtyFormModal` gera o `key` automaticamente a partir do `label` digitado
- `key` aceita apenas letras maiúsculas, números e `_`
- A página exibe tanto o `label` quanto o `key` em cada linha

## Deploy

- **Vercel** — conectado ao GitHub (branch `main`)
- `vercel.json` com rewrite `/* → /index.html` para SPA routing
- Variáveis de ambiente do Supabase configuradas em Vercel → Settings → Environment Variables
- Edge Functions: `npx supabase functions deploy invite-therapist --project-ref ffkkgmikvsqhutftoajh`
  - Project Ref: `ffkkgmikvsqhutftoajh`
  - Secret necessária: `SITE_URL` (URL do app)
  - JWT Verification deve estar **desativado** na função (ver seção acima)

## Site público

Páginas institucionais em português. Usam `PublicLayout` com `PublicHeader` e `PublicFooter`. Design com cores `brand-blue` e `brand-yellow`.
