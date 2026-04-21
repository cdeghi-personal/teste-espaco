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
- **jspdf** + **jspdf-autotable** — geração de PDFs

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
    dateUtils.js                 # formatDateBR, formatDateShort, formatWeekDay, isoToday, calculateAge, calculateAgeYears, getWeekDays, formatMonthYear
    validators.js
    pdfShared.js                 # Utilitários compartilhados por todos os PDFs (addPageHeader, addPageFooter, addAllPageFooters, sectionBlock, labelValue, loadLogo, fmtDatePDF, fmtCurrencyPDF + constantes)
    generateProntuarioPDF.js     # Gera PDF completo do prontuário (admin only)
    generateReportPDF.js         # Gera relatórios PDF: consultas por paciente ou terapeuta
  components/
    layout/
      PublicLayout.jsx, PublicHeader.jsx, PublicFooter.jsx
      AdminLayout.jsx, AdminSidebar.jsx
    guards/
      PrivateRoute.jsx
    common/
      ScrollToTop.jsx
    ui/
      Badge.jsx, Button.jsx, Input.jsx, Select.jsx, Textarea.jsx, Modal.jsx,
      EmptyState.jsx, Spinner.jsx, Toast.jsx, HelpButton.jsx
  pages/
    public/   HomePage, AboutPage, ServicesPage, TeamPage, ContactPage
    auth/     LoginPage, ResetPasswordPage
    admin/
      DashboardPage.jsx
      agenda/           AgendaPage, AppointmentFormModal
      patients/         PatientsPage, PatientDetailPage, PatientFormModal, PatientAdvancedSearchPage
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
      ageranges/        AgeRangesPage, AgeRangeFormModal
      audit/            AuditPage
      contactleads/     ContactLeadsPage
      reports/          ReportsPage, ConvenioReportPage
      support/          SupportPage, SupportFormModal
      company/          CompanySettingsPage
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
  12_involved_therapists.sql     # Tabela patient_involved_therapists + RLS atualizado para Gerente do Caso + Envolvidos
  25_audit_log.sql               # Cria tabela audit_logs + triggers INSERT/UPDATE/DELETE em todas as tabelas principais
  26_fix_audit_log.sql           # Fix: usa current_setting('request.jwt.claims') em vez de auth.uid()
  27_fix_audit_always_log.sql    # Fix: remove guard de NULL — trigger sempre grava (diagnóstico)
  28_fix_audit_rls.sql           # Fix: SET row_security = off na fn_audit_log + recria policies
  29_audit_debug.sql             # Script de diagnóstico (sem EXCEPTION — expõe o erro real)
  30_fix_audit_resource_name.sql # Fix: COALESCE(NEW.full_name, NEW.date) falha em tabelas sem "date"
  31_audit_grant.sql             # GRANT INSERT/SELECT em audit_logs para role authenticated
  32_log_view_rpc.sql            # Função RPC log_view_audit() SECURITY DEFINER para logs VIEW do frontend
  33_fix_log_view_rpc.sql        # Fix: p_resource_id vira TEXT (cast interno) + GRANT para anon
  34_contact_leads.sql           # Tabela contact_leads + RLS + GRANT para anon (INSERT público)
  35_fix_contact_leads_grant.sql # Revoga GRANT SELECT/UPDATE de authenticated (corrigido em 36)
  36_fix_contact_leads_grant2.sql # Restaura GRANT SELECT/UPDATE — GRANT + RLS devem coexistir
  37_patient_specialty_values.sql # Adiciona patient_value e therapist_value em patient_specialties
  38_support_tickets.sql         # Tabela support_tickets + support_ticket_history + RLS admin-only inicial
  39_support_tickets_all_users.sql # Adiciona created_by_id; abre INSERT p/ todos, SELECT por dono ou admin
  40_audit_resource_name_consultations.sql # fn_audit_log: consultations → "Paciente | Terapeuta | Data"; prontuário → "Paciente | Exames/Medicamentos/Conduta"
  41_age_ranges.sql              # Tabela age_ranges — RLS: SELECT p/ todos autenticados, INSERT/UPDATE/DELETE só admin
  42_convenio_reports.sql        # Tabela convenio_reports — histórico de PDFs gerados; RLS: admin vê tudo, outros veem só próprios
  43_company_settings.sql        # Tabela company_settings (linha única via CHECK id=1) — razao_social, cnpj; SELECT p/ autenticados, UPDATE só admin
  functions/
    invite-therapist/index.ts    # Edge Function — envia convite por e-mail ao criar terapeuta
    suggest-convenio/index.ts    # Edge Function — gera sugestões de texto para relatório de convênio via OpenAI gpt-4o-mini
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
| `patient_specialties` | Relação N:N paciente ↔ especialidade; colunas `patient_value` e `therapist_value` (NUMERIC 10,2) |
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
| `patient_involved_therapists` | Terapeutas envolvidos no atendimento do paciente (N:N) — complementa o Gerente do Caso |
| `audit_logs` | Log de auditoria — registra VIEW/INSERT/UPDATE/DELETE com user_id, user_email, action, resource_type, resource_id, resource_name |
| `contact_leads` | Contatos do site público — name, phone, email, specialty, how_found, message, status, internal_note, assigned_to, last_contact_at |
| `support_tickets` | Chamados de suporte — subject, type, author, description, solution, status, created_by_id |
| `support_ticket_history` | Histórico de status dos chamados — ticket_id, status, changed_at, changed_by |
| `age_ranges` | Faixas etárias — name, min_age, max_age, color; critério: min_age ≤ idade < max_age |
| `convenio_reports` | Histórico de relatórios ao convênio gerados em PDF — patient_id, therapist_id, specialty, mes_label, version_label, created_by |
| `company_settings` | Configurações da empresa — linha única (id=1, CHECK constraint); razao_social, cnpj, updated_at |

### Mappers (DB → App)

Todos em `src/lib/supabase.js`. Convertem snake_case do banco para camelCase do app:
- `mapPatient` — `specialties` agora é `[{ key, patientValue, therapistValue }]` (não mais string[])
- `mapGuardian` (inclui `neighborhood`), `mapTherapist`, `mapAppointment` (inclui `startTime`, `endTime` calculado via duration), `mapConsultation` (inclui `time`, `roomId`)
- `mapSpecialty`, `mapPaymentMethod`, `mapDiagnosis`, `mapPatientStatus`, `mapRoom`
- `mapConsultationStatus` (inclui `automatic`), `mapAppointmentType`, `mapExam`, `mapMedication`, `mapConduct`
- `age_ranges` mapeado inline no DataContext: `{ id, name, minAge, maxAge, color }`
- `company_settings` exposto como `companySettings` (`{ razaoSocial, cnpj }`) via `useData()`; função `updateCompanySettings({ razaoSocial, cnpj })` faz `.update().eq('id', 1)`
- `syncPatientRelations(patientId, { specialties, conditionIds })` — specialties agora `[{ key, patientValue, therapistValue }]`
- `syncGuardianPatients(guardianId, patientIds)`
- `syncTherapistSpecialties(therapistId, [{ specialty, credential }])`
- `syncExternalTherapists(patientId, [{ name, specialty, phone }])`

### RLS — padrão para verificação de admin

As policies RLS **não usam** a função `is_admin()` (definida no 02 mas não confiável). Usar sempre o subquery inline:
```sql
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
```

### Como criar admins

1. Supabase Dashboard → Authentication → Users → "+ Add user" → Create new user
2. Preencher email + senha + marcar "Auto Confirm User"
3. Rodar no SQL Editor:
```sql
INSERT INTO public.profiles (id, role)
VALUES
  ((SELECT id FROM auth.users WHERE email = 'admin1@email.com'), 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### Como definir nome do admin (exibido no menu)

O nome do admin vem de `authUser.user_metadata.full_name`. Para definir:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"full_name": "Nome do Admin"}'::jsonb
WHERE id = 'UUID-DO-USUARIO';
```
Após salvar, o admin faz logout e login para atualizar a sessão.

## Autenticação e Roles

- Autenticação via **Supabase Auth** (JWT real)
- Dois roles: `admin` e `therapist` — armazenados na tabela `profiles`
- **Admin** vê tudo. **Therapist** vê apenas seus próprios dados (via RLS no banco)
- `user.id` no contexto = ID da tabela `therapists` (não o UUID do auth)
- `user.authId` = UUID do `auth.users`
- `user.name` = `therapist.name` para terapeutas; para admins: `user_metadata.full_name` → `user_metadata.name` → prefixo do e-mail

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

Project Ref: `ffkkgmikvsqhutftoajh` (Supabase Dashboard → Project Settings → General → Reference ID).
Secret necessária: `SITE_URL`. JWT Verification deve estar **desativado**.

### Fluxo de reset de senha / convite

- Supabase redireciona para o app com evento `PASSWORD_RECOVERY`
- `AuthContext` detecta e seta `needsPasswordReset = true`
- `App.jsx` tem `<AuthRedirect />` que redireciona para `/reset-senha`
- `ResetPasswordPage` chama `updatePassword()` → entra no dashboard

### Race condition de login corrigida

`LoginPage` não chama `navigate()` diretamente — usa `useEffect` que observa `isAuthenticated` e redireciona somente após `loadUser()` terminar.

### Configuração de URL no Supabase

Authentication → URL Configuration:
- Site URL: URL do ambiente (localhost ou produção)
- Redirect URLs: `http://localhost:5175/**` para dev + URL do Vercel para prod

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
| ageRanges | Hard delete | — |
| medical_records | Hard delete | — |
| medical_record_exams | Hard delete | — |
| medical_record_medications | Hard delete | — |
| medical_record_conducts | Hard delete | — |
| support_tickets | Hard delete | — |
| support_ticket_history | Hard delete | — |
| company_settings | Upsert (linha única) | — |
| convenio_reports | Hard delete | — |

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
'/admin/tipoatendimento', '/admin/salas', '/admin/faixaetaria'
'/admin/auditoria'              // admin only
'/admin/contatos'               // admin only
'/admin/relatorios'             // todos autenticados (terapeuta vê só próprios dados)
'/admin/suporte'                // todos os usuários autenticados
'/admin/pacientes/avancado'     // busca avançada de pacientes — todos autenticados; filtros multi-select (terapeuta, gerente de caso, especialidade, forma de pagamento, diagnóstico, status, faixa etária); exporta CSV
'/admin/relatorios/convenio'    // relatório de convênio — todos autenticados; gera Relatório ao Convênio + Lista de Presença em PDF
'/admin/empresa'                // dados da empresa (Razão Social + CNPJ) — admin only
```

## Padrões de código

- Componentes funcionais com hooks
- Formulários em Modais (`*FormModal.jsx`) — padrão: recebem `onClose` e `initial` (para edição)
- `Badge` component aceita props `specialty`, `quality` ou `patientStatus`
- Datas armazenadas como string ISO `YYYY-MM-DD`; timestamps como ISO completo
- DataContext é **async** — todas as funções CRUD retornam Promise
- Erros do Supabase são exibidos via `Toast` (notificação na parte inferior da tela, 4s)
- Funções CRUD retornam `{ error: string }` em caso de falha, ou o objeto criado em caso de sucesso
- AuthContext usa `.maybeSingle()` no fetch de profile — nunca trava o login mesmo sem perfil cadastrado
- **Padrão read-only para terapeutas:** `const isAdmin = user?.role === 'admin'` → condicionar botões de novo/editar/toggle com `{isAdmin && ...}`

## Toast (notificações)

- Componente em `src/components/ui/Toast.jsx`
- `ToastProvider` envolve o app em `App.jsx` (dentro de `AuthProvider`)
- Hook `useToast()` retorna `{ show(message, type) }` — type: `'error'` (padrão) ou `'success'`

## HelpButton

- Componente em `src/components/ui/HelpButton.jsx`
- Uso: `<HelpButton title="Título"><p>Conteúdo JSX...</p></HelpButton>`
- Renderiza botão "Ajuda" com ícone `FiHelpCircle`; abre modal com as instruções
- Adicionado nas páginas: Agenda, Pacientes, Responsáveis, Atendimentos, Prontuário, Relatórios, Suporte

## Sidebar Admin

- Item "Contatos" — visível apenas para admin, com badge vermelho mostrando contagem de `novo`
- Item "Relatórios" — visível para **todos** os autenticados (terapeuta vê apenas próprios dados na página)
- Item "Suporte" — visível para **todos** os usuários autenticados
- Seção "Administração" — colapsável, visível a **todos** os autenticados; contém: Terapeutas, Especialidades, Formas de Pagamento, Diagnósticos, Status do Paciente, Status Atendimento, Tipos de Atendimento, Salas, Faixas Etárias (read-only para terapeutas) + Log de Auditoria (admin only) + **Dados da Empresa** (admin only, ícone `FiBriefcase`)
- "Sair" sempre visível no rodapé

## Site Público

- Telefone de contato: **(11) 9 7579-9590** — link abre WhatsApp (`https://wa.me/5511975799590`)
- Botão "Área Restrita" **removido** do header público (desktop e mobile)

## Faixas Etárias (`/admin/faixaetaria`)

- **Admin:** CRUD completo (nome, idade inicial, idade final, cor)
- **Terapeuta:** somente consulta
- Critério de classificação: `min_age ≤ idade_do_paciente < max_age`
- Idade calculada **dinamicamente** via `calculateAgeYears(dateOfBirth)` — não é atributo fixo do paciente
- Tag colorida exibida nos cards de paciente (mobile e desktop), calculada em tempo real
- Listagem mostra contador de pacientes por faixa (calculado no frontend)
- `calculateAgeYears(dateOfBirth)` em `src/utils/dateUtils.js` retorna número inteiro de anos

## Campos do Paciente

- **Terapeutas:** `primary_therapist_id` (**Gerente do Caso**) + tabela `patient_involved_therapists` (Terapeutas Envolvidos, N:N). No app: `therapistId` e `involvedTherapistIds[]`.
- **Especialidades em Atendimento:** tabela `patient_specialties` com colunas `specialty` (key), `patient_value` e `therapist_value`. No app: `patient.specialties = [{ key, patientValue, therapistValue }]`. Valores visíveis/editáveis somente por admin.
- **Dados pessoais extras:** `rg`, `phone`, `email`, `address`, `neighborhood`, `city`, `state`, `zip_code`, `indication`
- **Dados escolares:** `school_name`, `school_phone`, `school_address`, `school_neighborhood`, `school_city`, `school_state`, `school_zip`, `school_coordinator`
- **Médico responsável:** `doctor_insurance`, `doctor_name`, `doctor_specialty`, `doctor_phone`
- **Terapeutas externos:** tabela `patient_external_therapists` — lista N por paciente, com `name`, `specialty`, `phone`
- **Diagnóstico Principal:** campo `diagnosis` (texto livre via Select)
- **Comorbidades:** tabela `patient_conditions` — exclui o diagnóstico principal da lista
- **Tag de Faixa Etária:** exibida nos cards/tabela de PatientsPage, calculada dinamicamente a partir de `dateOfBirth` + tabela `age_ranges`

## Campos do Responsável

- Endereço completo: `address`, `neighborhood`, `city`, `state`, `cep`
- Seleção de pacientes vinculados: lista pesquisável com checkboxes
- Busca na listagem: por nome, CPF, telefone ou **nome do paciente vinculado**

## PatientDetailPage

- **Informações Clínicas:** Diagnóstico Principal, Comorbidades, Forma de Pagamento (especialidades removidas daqui)
- **Terapeutas:** Gerente do Caso, Terapeutas Envolvidos, **tabela de Especialidades em Atendimento** (Especialidade | Valor Paciente | Valor Terapeuta — colunas de valor apenas para admin)
- **Responsáveis:** card inline
- **Últimos Atendimentos:** 10 mais recentes

## Prontuário Clínico (MedicalRecordsPage — `/admin/prontuario`)

4 seções colapsáveis: Exames Complementares, Medicamentos, Conduta & Objetivo Terapêutico, Histórico de Atendimentos.

**Histórico de Atendimentos — filtros:**
- **Período:** 5 botões fixos — Mês -2, Mês Anterior, Mês Corrente (default), Mês Seguinte, Período (De & Até)
- **Status:** chips de múltipla seleção; vazio = todos
- **Ações em lote (admin):** checkbox por atendimento + botões de status dinâmicos (todos os status ativos)

**PDF do prontuário:** botão "PDF" no header (admin only) → `generateProntuarioPDF()`

## Relatórios PDF (`/admin/relatorios`)

- **Acesso:** todos os autenticados. Terapeutas veem apenas "Consultas por Terapeuta", com campo Terapeuta pré-preenchido (read-only) com seu próprio nome (`user.id`).
- **Consultas por Paciente:** coluna Valor (R$) usa `patient.specialties.find(s => s.key === c.specialty)?.patientValue` — admin only
- **Consultas por Terapeuta:** coluna Valor (R$) usa `patient.specialties.find(s => s.key === c.specialty)?.therapistValue`
- Ambos exibem total de atendimentos + total do período no rodapé
- Filtros: tipo de relatório, paciente/terapeuta (searchable), período (mês ou De/Até), status (múltipla seleção — inclui automáticos)
- Funções: `generateConsultasPacientePDF()`, `generateConsultasTerapeutaPDF()` em `src/utils/generateReportPDF.js`
- Card de acesso rápido ao "Relatório de Convênio" na parte superior da página

## Relatório de Convênio (`/admin/relatorios/convenio`)

- **Acesso:** todos os autenticados. Terapeutas veem seus próprios pacientes; admin seleciona qualquer terapeuta.
- **Fluxo:** (1) Seleciona terapeuta (admin) + paciente + especialidade + período → Buscar Atendimentos; (2) Edita sessões (data + horário + valor por linha, add/remove); (3) Preenche Diagnóstico com CID, Encaminhamento, Objetivos, Desempenho; (4) Visualiza preview do nome do arquivo + histórico de versões; (5) Gera PDFs.
- **Relatório ao Convênio (PDF):** seções Identificação, Atendimentos do Mês, Encaminhamento, Objetivos de Intervenção, Desempenho e Conclusão, assinatura em caixa. Rodapé com endereço/contato em todas as páginas.
- **Lista de Presença (PDF):** tabela Data | Valor | Local | Horário | Assinatura Profissional | Assinatura Responsável + linhas de assinatura.
- **Diagnóstico:** pré-preenchido com `patient.diagnosis` + nomes das comorbidades; editável (terapeuta acrescenta CID).
- **Registro/credencial:** `therapist.specialties.find(s => s.specialty === selectedSpecialty)?.credential`.
- **Nome do arquivo:** inclui especialidade — ex: `relatorio_convenio_nome_ESPECIALIDADE_Mes_Ano.pdf`.
- **Versionamento:** `versionLabel` (ex: `v1`, `v2`) impresso no cabeçalho do PDF; histórico gravado em `convenio_reports`.
- **companySettings:** passado para ambas as funções PDF; exibe Razão Social e CNPJ no cabeçalho.
- **Horários por sessão:** cada sessão tem campo `time` individual (preenchido do banco ao buscar). Campo "Horário padrão" com botão "aplicar a todas" para o caso comum. O PDF agrupa sessões por horário e gera uma linha "Datas e Horários" por grupo — ex: `04, 10 às 17:30` e `05, 12 às 18h`. Internamente: `buildSessionTimeGroups(sessions, fallbackHorario)`.
- **Auto-refresh do histórico:** após "Baixar e Registrar", a seção recarrega automaticamente via `historyRefreshKey` passado ao `HistorySection`.
- **Sugestão com IA:** botão "Sugerir com IA" (⚡ violeta) no topo da seção 3. Chama a Edge Function `suggest-convenio` via `supabase.functions.invoke`. Preenche automaticamente Encaminhamento, Objetivos e Desempenho com base em especialidade, diagnóstico, nº de sessões e terapeuta. Requer secret `OPENAI_API_KEY` no Supabase + JWT Verification ATIVADO.
- Funções em `src/utils/generateConvenioPDF.js`: `generateRelatórioConvenioPDF()`, `generateListaPresencaPDF()`, `formatMesLabel()`, `MONTHS`.
- `MONTHS` e `formatMesLabel` re-exportados de `pdfShared.js` via `export { MONTHS, formatMesLabel } from './pdfShared'`.

## Dados da Empresa (`/admin/empresa`)

- **Acesso:** admin only (terapeutas redirecionados para `/admin`).
- **Campos:** Razão Social e CNPJ (com máscara automática `XX.XXX.XXX/XXXX-XX`).
- **Armazenamento:** tabela `company_settings` — linha única (id=1, `CHECK (id = 1)`); UPDATE via `updateCompanySettings()`.
- **Uso:** `companySettings` (do `useData()`) é passado como parâmetro opcional para todas as funções geradoras de PDF — `generateProntuarioPDF`, `generateConsultasPacientePDF`, `generateConsultasTerapeutaPDF`, `generateRelatórioConvenioPDF`, `generateListaPresencaPDF`.
- **No cabeçalho PDF:** quando `companySettings` está preenchido, exibe Razão Social (y=8), CNPJ (y=13) e texto direito (y=18) dentro da barra azul do header.

## Utilitários PDF Compartilhados (`src/utils/pdfShared.js`)

- Centraliza header/footer/helpers usados por todos os 3 geradores de PDF.
- **Constantes:** `PDF_BLUE`, `PDF_GRAY`, `PDF_DARK`, `PDF_LIGHT`, `CLINIC_NAME`, `CLINIC_ADDRESS`, `CLINIC_ADDRESS_SHORT`, `CLINIC_CONTACT`, `CLINIC_LOCAL`, `MONTHS`.
- **`addPageHeader(doc, logoData, subtitle, companySettings, rightText)`** — barra azul 22mm, logo, nome/subtítulo da clínica; se `companySettings` presente → Razão Social + CNPJ na barra.
- **`addPageFooter(doc, pageNum, totalPages, { full })`** — `full: false` (compacto, linha + "Espaço Casa Amarela — Documento confidencial" + página); `full: true` (3 linhas: nome bold + endereço + contato + página).
- **`addAllPageFooters(doc, options)`** — itera todas as páginas e aplica `addPageFooter`.
- **`sectionBlock(doc, text, y, { uppercase })`** — bloco de seção com fundo azul e texto branco.
- **`labelValue(doc, label, value, x, y, maxWidth)`** — renderiza par label/valor em linha, retorna novo y.
- **`loadLogo()`** — carrega `/logo.png` como base64 via `fetch`.
- **`fmtDatePDF(str)`**, **`fmtCurrencyPDF(val)`**, **`formatMesLabel(yearMonth)`**.

## Suporte (`/admin/suporte`)

- **Acesso:** todos os usuários autenticados. Admin vê todos os chamados; usuário vê apenas os próprios.
- **Criar chamado:** Assunto, Tipo (Erro/Dúvida/Melhoria), Autor, Descrição. Status inicia sempre como "Novo".
- **Editar (admin):** todos os campos + Solução + Status + tabela de Histórico de Mudanças de Status.
- **Visualizar (não-admin):** apenas leitura; vê status como badge e solução se preenchida.
- `support_tickets.created_by_id` = `auth.uid()` do criador — base do RLS por usuário.
- `support_ticket_history`: cada mudança de status registra `status`, `changed_at`, `changed_by` (nome do usuário).
- Status: `novo` → `em_analise` → `em_desenvolvimento` → `resolvido` → `fechado`

## Status Atendimento (`/admin/statusconsulta`)

- Flag `automatic = true` → não aparece no Select do `ConsultationFormModal`, mas **aparece** nos filtros de relatório e no prontuário
- Ações em lote do prontuário mostram **todos os status ativos** (incluindo automáticos)

## Consultas (`/admin/consultas`)

- Status Atendimento: filtra automáticos no formulário (só mostra manuais)
- Campos Horário (time) e Sala no formulário
- Card na listagem: Paciente, Especialidade, Status, Tipo / Data + Hora, Terapeuta, Sala
- Editar/excluir: visível apenas para o terapeuta responsável ou admin
- **Campos obrigatórios quando status = "Realizada":** Objetivo da Sessão, Relato da Sessão / Evolução, Objetivo da Próxima Sessão

## Agenda (`/admin/agenda`)

- Usa a tabela `consultations` (appointments não é usada)
- 6 colunas: Seg/Ter/Qua/Qui/Sex + Sáb-Dom; mobile: abas
- Card: `HH:MM - PrimeiroNome Ultimo` + sala em 10px
- Legenda inferior exibe nome completo do terapeuta

## CRM de Contatos (`/admin/contatos`)

- `ContactPage` grava em `contact_leads` via Supabase anon
- Status: `novo` (vermelho), `em_contato` (amarelo), `agendado` (azul), `convertido` (verde), `sem_interesse` (cinza)
- Dashboard: banner vermelho clicável quando há leads `novo`
- Sidebar: badge vermelho com contagem de `novo`

## Auditoria de Acesso (`/admin/auditoria`)

- Triggers AFTER em todas as tabelas principais → `fn_audit_log` SECURITY DEFINER, SET row_security = off
- **resource_name por tabela:**
  - `patients`, `guardians`, `therapists` → `full_name`
  - `consultations` → `"Paciente | Terapeuta | YYYY-MM-DD"` (JOIN em patients + therapists)
  - `medical_record_exams` → `"Paciente | Exames"`
  - `medical_record_medications` → `"Paciente | Medicamentos"`
  - `medical_record_conducts` → `"Paciente | Conduta"`
  - demais tabelas → `date::TEXT` ou vazio
- **VIEW** registrado via RPC `log_view_audit(resource_type, resource_id, resource_name)`
- `AuditPage`: só admin; filtros por ação, recurso, usuário (select dinâmico), data e texto (busca em resource_name)

## Contadores nas páginas de configuração

- **Especialidades:** `N paciente(s)` — conta `patients` onde `patient.specialties.some(s => s.key === specialtyKey)`
- **Formas de Pagamento:** `N paciente(s)` — conta `patients` com `paymentMethodId === pm.id`
- **Diagnósticos:** `N paciente(s)` — conta `patients` onde `conditionIds.includes(d.id)` OR `p.diagnosis === d.name` (inclui diagnóstico principal)
- **Status do Paciente:** `N paciente(s)` — conta `patients` com `statusId === status.id`
- **Tipos de Atendimento:** `N atendimento(s) (últimos 30 dias)` — conta `consultations` com `appointmentTypeId === type.id` e `date >= hoje-30d`
- **Status Atendimento:** `N atendimento(s) (últimos 30 dias)` — conta `consultations` com `consultationStatusId === status.id` e `date >= hoje-30d`
- **Salas:** `N atendimento(s) nos últimos 30 dias` — conta `consultations` com `roomId === room.id` e `date >= hoje-30d`

## Atenção — SELECTs explícitos no DataContext

`CONSULTATION_SELECT` lista colunas explicitamente. Ao adicionar novas colunas ao banco, **sempre incluir no SELECT** correspondente.
Constantes: `PATIENT_SELECT` (inclui `patient_specialties(specialty, patient_value, therapist_value)`), `GUARDIAN_SELECT`, `CONSULTATION_SELECT`.

## Especialidades (tabela `specialties` no banco)

- Campos: `key` (identificador único, ex: `MUSICOTERAPIA`) e `label` (nome exibido)
- `SpecialtyFormModal` gera o `key` automaticamente a partir do `label`
- `key` aceita apenas letras maiúsculas, números e `_`

## Deploy

- **Vercel** — conectado ao GitHub (branch `main`), deploy automático no push
- `vercel.json` com rewrite `/* → /index.html` para SPA routing
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no Vercel
- Edge Functions: `npx supabase functions deploy invite-therapist --project-ref ffkkgmikvsqhutftoajh`

## Política de Senha Forte (ResetPasswordPage)

Regras validadas em tempo real: mínimo 8 chars, maiúscula, minúscula, número, caractere especial. Botão desabilitado até todas passarem.