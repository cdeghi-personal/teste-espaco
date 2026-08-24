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
- **pdfjs-dist** — renderização de PDF em `<canvas>` para pré-visualização (`PdfPreviewModal`), carregado via dynamic import (não faz parte do bundle principal)

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
    conflictUtils.js             # Detecção de conflitos: detectConflicts, detectSeriesConflicts, getCalendarBlockConflicts, buildConflictTooltip; CONFLICT_DURATION (50min), CONFLICT_LABELS; tooltips ricos com data DD/MM/YYYY, intervalo de horário, nome do paciente/entrevistado, terapeuta e tipo do evento
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
      agenda/           AgendaPage, AppointmentFormModal, CalendarBlockFormModal, CalendarBlockHistoryModal
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
      guide/            GuidePageV2          # Guia do Sistema — rota protegida /admin/guia (admin only)
      contactleads/     ContactLeadsPage
      reports/          ReportsPage, ConvenioReportPage
      support/          SupportPage, SupportFormModal
      company/          CompanySettingsPage
      payments/         PaymentsPage
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
  12_color_specialty_therapist_room.sql # Adiciona coluna color (hex) em specialties, therapists e rooms
  12_involved_therapists.sql     # Tabela patient_involved_therapists + RLS atualizado para Gerente do Caso + Envolvidos
  13_fix_circular_rls.sql        # Fix: recursão circular nas policies de patient_involved_therapists
  14_fix_therapist_rls.sql       # Fix: RLS de medical_records e patients para terapeutas envolvidos
  15_belongs_to_team.sql         # Flag belongs_to_team no terapeuta — terapeutas de equipe veem todos os pacientes/prontuários
  16_therapist_write_rls.sql     # Políticas de escrita (INSERT/DELETE) para terapeutas em pacientes e sub-tabelas
  17_fix_circular_rls2.sql       # Fix: recursão circular criada pelo 16 em patient_involved_therapists
  18_fix_team_patient_visibility.sql # Fix: terapeuta da equipe vê apenas pacientes de outros terapeutas da equipe
  19_fix_consultations_team_rls.sql  # Terapeuta da equipe vê atendimentos de pacientes da equipe
  20_fix_consultations_team_select.sql # Terapeuta da equipe vê apenas consultas de terapeutas da equipe
  21_guardian_write_rls.sql      # Políticas de escrita (INSERT/UPDATE/DELETE) para terapeutas em guardians e patient_guardians
  22_fix_guardian_insert_rls.sql # Adiciona colunas de endereço/contato extras em guardians; corrige policy de INSERT
  23_fix_guardian_insert_rls2.sql # Fix: INSERT em guardians usa auth.uid() IS NOT NULL (qualquer autenticado pode criar)
  24_fix_guardian_insert_final.sql # Fix: INSERT em guardians com WITH CHECK (true) — sem campo de "dono"
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
  44_ai_prompt.sql               # Adiciona coluna ai_system_prompt (TEXT) em company_settings — prompt customizável para a Edge Function suggest-convenio
  45_audit_consultation_full_name.sql # fn_audit_log: consultations → "Paciente | DD/MM/YYYY HH:MM | Especialidade | Terapeuta"
  46_audit_config_tables.sql     # fn_audit_log: fallback full_name → name → label → date; triggers nas tabelas de configuração (therapists, specialties, payment_methods, diagnoses, patient_statuses, consultation_statuses, appointment_types, rooms, age_ranges)
  47_support_nova_resposta.sql   # Coluna nova_resposta (BOOLEAN) em support_tickets + RPC mark_support_ticket_read
  48_support_reprovado.sql       # RPCs approve_support_ticket / reject_support_ticket + coluna note em support_ticket_history
  49_support_rls_fix.sql         # Recria RPCs com SET row_security = off (parcialmente efetivo — complementado por 50)
  50_support_update_owner.sql    # RLS UPDATE policy para dono do ticket — fix real que permite RPCs SECURITY DEFINER atualizarem o registro
  51_support_fix_therapist_name.sql  # Fix: RPCs usavam t.full_name → corrigido para t.name (therapists usa name)
  52_support_status_reprovado.sql    # Recria CHECK constraint de status incluindo reprovado_usuario
  53_audit_user_name.sql         # Adiciona user_name em audit_logs; recria fn_audit_log e log_view_audit com resolução de nome (terapeuta → display name → email) — ATENÇÃO: reverteu p_resource_id de TEXT para UUID acidentalmente (corrigido em 60)
  54_audit_backfill_user_name.sql    # Popula user_name nos registros existentes de audit_logs
  55_audit_cleanup_cron.sql      # Substituído por 56 — agendava DELETE simples de >90 dias sem histórico
  56_audit_history_table.sql     # Retenção em dois níveis: audit_logs (90 dias ativos) + audit_logs_history (arquivo até 1 ano); pg_cron diário 03:00 UTC via maintain_audit_logs()
  57_session_audit.sql           # RPC log_session_audit(p_type) SECURITY DEFINER — registra LOGIN e sessao_retomada no audit_logs
  58_fix_session_audit.sql       # Fix: adiciona SET row_security = off + GRANT para anon em log_session_audit
  59_fix_session_audit_uuid.sql  # Fix: resource_id e UUID — removido do INSERT (fica NULL); resource_name recebe o label
  60_fix_log_view_audit_uuid.sql # Fix: script 53 reverteu log_view_audit para UUID — restaura parametro TEXT + GRANT anon
  61_therapist_specialty_can_be_rt.sql # Adiciona can_be_rt boolean DEFAULT false em therapist_specialties
  62_patient_specialty_report_settings.sql # Nova tabela patient_specialty_report_settings (referral_challenges por paciente+especialidade) + RLS
  63_convenio_reports_rt_goals_cnes.sql # convenio_reports: responsible_therapist_id + intervention_goals; company_settings: cnes
  64_patient_specialties_payment.sql   # payment_type em patient_specialties + tabela patient_specialty_payment_history
  65_patient_specialty_payment_history.sql # Histórico de alterações financeiras por paciente+especialidade
  66_company_settings_discount.sql     # therapist_discount_percent em company_settings
  67_prepaid_packages.sql              # Tabela patient_prepaid_packages + patient_prepaid_ledger
  68_consultation_status_consumes_prepaid.sql # Flag consumes_prepaid_session em consultation_statuses
  69_prepaid_enrich.sql                # Backfill: marca prepaid_session_consumed em consultas já debitadas
  70_prepaid_ledger_no_unique.sql      # Remove constraint unique(consultation_id) do ledger — append-only
  71_consultation_status_requires_note.sql # Flag requires_objective_note em consultation_statuses
  72_patient_needs_convenio_report.sql # needs_convenio_report boolean em patients
  73_patient_specialties_pay_per_session.sql # Adiciona PAY_PER_SESSION ao CHECK constraint de patient_specialties
  74_contact_leads_new_fields.sql      # Adiciona patient_name, contact_reason, referred_by em contact_leads
  75_fix_patients_admin_rls.sql        # Corrige policy admin em patients: remove deleted=false do USING (bloqueava soft-delete), usa subquery inline em vez de is_admin()
  76_payment_demonstratives.sql        # Tabela payment_demonstratives — histórico de demonstrativos definitivos (com NF); admin only
  77_audit_consultation_rich_name.sql  # fn_audit_log: consultations → "Paciente: X | Data/Hora: DD/MM/YYYY HH:MM | Especialidade: Y | Terapeuta: Z | Tipo: W | Sala: K | Status: S" — recria apenas fn_audit_log, NÃO toca log_view_audit
  78_consultations_nf_fields.sql       # Adiciona nf_number, nf_issue_date, previous_status_before_invoice em consultations; índice parcial em nf_number
  79_payment_invoices.sql              # Tabela payment_invoices (ISSUED/PAID/CANCELLED) — NF global única via índice parcial; RLS admin only
  80_series_and_multi_therapist.sql    # Tabelas consultation_series + consultation_therapists; ADD series_id/series_original_date/is_series_exception em consultations; RLS e GRANTs
  81_audit_series.sql                  # fn_audit_log: consultation_series → "Paciente | Especialidade | Início: DD/MM/YYYY"; consultation_therapists → "Paciente | DD/MM/YYYY | Terapeuta"; triggers nas duas tabelas
  82_fix_ct_team_select.sql            # Fix RLS: expande ct_therapist_select para incluir consultas de colegas da equipe (teamMember vê consultationTherapists[] preenchido)
  83_fix_series_therapist_write.sql    # Fix RLS: adiciona INSERT/UPDATE em consultation_series para terapeuta (faltava no 80)
  84_therapist_unavailabilities.sql    # Legado — substituído por 88; tabela removida pelo 87
  85_consultation_conflicts.sql        # Tabela consultation_conflicts + RLS + RPC persist_consultation_conflicts (SECURITY DEFINER)
  86_fix_ct_team_inline.sql            # Fix RLS: ct_therapist_select sem funções inexistentes (my_belongs_to_team) — usa subquery inline
  87_cleanup_unavailabilities.sql      # Remove tabela therapist_unavailabilities e coluna unavailability_id de consultation_conflicts
  88_calendar_blocks.sql               # Tabelas calendar_block_series + calendar_blocks; RLS; GRANT; persist_consultation_conflicts com calendar_block_id; triggers de auditoria
  89_block_type_rigid_flex.sql         # Converte dados TOTAL→RIGID / PARTIAL→FLEX; recria CHECK constraints
  90_fix_audit_calendar_blocks.sql     # Fix triggers de auditoria: ignora operações sem JWT (SQL Editor/migrations); completa migração 89
  91_interviews.sql                    # Adiciona event_type (SESSION/INTERVIEW), interview_format (PRESENTIAL/REMOTE), meeting_platform, meeting_link em consultations e consultation_series
  92_interviewee_name.sql              # Adiciona interviewee_name TEXT em consultations e consultation_series — obrigatório quando event_type=INTERVIEW
  93_consultations_patient_optional.sql # Torna patient_id opcional em consultations — suporte a entrevistas sem paciente vinculado
  94_patient_cleanup_rpc.sql           # RPCs get_patient_cleanup_summary + cleanup_inactive_patient_data — limpeza de dados transacionais de paciente inativo
  95_fix_patients_therapist_rls.sql    # Fix: WITH CHECK da policy de UPDATE de terapeuta em patients — permite soft-delete sem falhar RLS de dual-role
  96_admin_soft_delete_patient.sql     # RPC admin_soft_delete_patient SECURITY DEFINER — substitui UPDATE direto que sofria de silent failure com múltiplas policies RLS
  97_fix_rpc_auth_uid.sql              # Fix: auth.uid() → current_setting('request.jwt.claims')::jsonb->>'sub' nos RPCs de admin (SECURITY DEFINER)
  98_fix_soft_delete_no_admin_check.sql # Fix: remove verificação de admin do RPC admin_soft_delete_patient — instável para dual-role; segurança via frontend
  99_fix_cleanup_audit_resource_id.sql # Fix: tipo do resource_id no INSERT de audit_logs dentro de cleanup_inactive_patient_data (uuid, não text)
  100_fix_cleanup_fk_order.sql         # Fix: order de DELETE em cleanup — payment_invoices antes de payment_demonstratives (FK constraint)
  101_guardian_financial_responsible.sql # Flag is_financial_responsible em guardians — CPF obrigatório somente quando marcado como financeiro
  102_therapeutic_project.sql          # Adiciona therapeutic_project_description + therapeutic_project_notes TEXT em medical_records
  103_remove_school_address.sql        # Remove colunas school_address, school_neighborhood, school_city, school_state, school_zip de patients
  104_fix_consultations_admin_rls.sql  # Fix: recria policy admin de consultations com subquery inline (is_admin() SECURITY DEFINER falhava no RETURNING de bulk INSERT, causando série criada com 0 atendimentos)
  105_consultation_status_admin_can_edit.sql # Coluna admin_can_edit em consultation_statuses — sigilo clínico por status (admin bloqueado de ver/editar quando false)
  106_consultation_notes.sql           # Coluna notes em consultations e consultation_series — "Observação do Atendimento"
  107_audit_consultation_new_format.sql # fn_audit_log: consultations → "Paciente | Terapeuta | DD/MM/YYYY | HH:MM | Tipo | Status"
  108_anamnesis.sql                    # Colunas anamnesis_description, anamnesis_notes em medical_records — seção Anamnese/HPMA do prontuário
  109_payment_method_display_order.sql # Coluna display_order (INTEGER) em payment_methods + índice único parcial (valores não-nulos)
  110_consultation_status_observation_flags.sql # RENOMEIA requires_objective_note → shows_observation; adiciona requires_observation (default true) — separa "exibe observação" de "observação obrigatória"
  111_room_allows_multiple_patients.sql # Coluna allows_multiple_patients em rooms — sala não gera ROOM_OVERLAP quando true
  112_consultation_status_replacement_flags.sql # Colunas requests_replacement_decision e is_scheduling_default em consultation_statuses (+ índice único parcial no máximo 1 status ativo padrão de agendamento)
  113_consultations_replacement.sql    # Colunas will_have_replacement e replacement_for_consultation_id em consultations (Reposição de Atendimentos) — CHECK anti-auto-referência + índice único parcial (no máx. 1 reposição direta por atendimento)
  114_dashboard_monthly_metrics_rpc.sql # RPC get_dashboard_monthly_metrics (SECURITY DEFINER) — métricas agregadas (terapeutas + especialidades) para os painéis mensais do Dashboard, fonte única para Admin e Terapeuta; nunca retorna dado clínico/paciente
  115_consultation_status_awaiting_outcome.sql # Coluna is_awaiting_outcome em consultation_statuses — status que representa atendimento ainda não ocorrido (ex.: Agendada); sem limite de quantos status podem ter a flag (diferente de is_scheduling_default)
  116_dashboard_metrics_pending_split.sql # CREATE OR REPLACE de get_dashboard_monthly_metrics — separa "pending" em pending_month/pending_previous (mesma assinatura da 114)
  117_dashboard_metrics_total_atendidos.sql # CREATE OR REPLACE de get_dashboard_monthly_metrics — "total" passa a contar só até a data de corte; "completed" (rótulo "Atendidos") deixa de depender de consumesPrepaidSession e passa a ser "status ≠ aguarda desfecho", fechando Total = Atendidos + Pend.(mês) (mesma assinatura da 114)
  functions/
    invite-therapist/index.ts    # Edge Function — envia convite por e-mail ao criar terapeuta
    suggest-convenio/index.ts    # Edge Function — gera sugestões de texto para relatório de convênio via OpenAI gpt-4o-mini
    dashboard-greeting/index.ts  # Edge Function — saudacao personalizada do dashboard via OpenAI gpt-4o-mini (JWT Verification DESATIVADO)
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
| `consultations` | Consultas/evolução — hard delete; tem `appointment_type_id`, `time` (HH:MM), `room_id`, `nf_number`, `nf_issue_date`, `previous_status_before_invoice`, `series_id`, `series_original_date`, `is_series_exception`, `event_type` (SESSION/INTERVIEW), `interview_format` (PRESENTIAL/REMOTE), `meeting_platform`, `meeting_link`, `interviewee_name`, `will_have_replacement` (migration 113 — NULL/true/false, ver seção Reposição de Atendimentos), `replacement_for_consultation_id` (migration 113 — preenchido só no atendimento de reposição) |
| `consultation_activities` | Atividades dentro de uma consulta |
| `specialties` | Tabela de config — toggle `active` |
| `payment_methods` | Tabela de config — toggle `active`; `display_order` (INTEGER opcional, único quando preenchido) — ordem manual de exibição |
| `diagnoses` | Tabela de config — toggle `active` |
| `patient_statuses` | Tabela de config — toggle `active` |
| `rooms` | Salas — toggle `active`; `allows_multiple_patients` (boolean, default false) — quando true, a sala não gera conflito `ROOM_OVERLAP` mesmo com atendimentos sobrepostos |
| `therapist_specialties` | Relação N:N terapeuta ↔ especialidade + nº do conselho regional + flag `can_be_rt` |
| `patient_external_therapists` | Terapeutas externos vinculados ao paciente (nome, especialidade, telefone) |
| `consultation_statuses` | Status do atendimento — toggle `active`, cor configurável, flag `automatic`, `admin_can_edit`; `shows_observation` (renomeada de `requires_objective_note` na migration 110) — oculta campos clínicos e mostra só "Observação do Atendimento"; `requires_observation` (default true) — só tem efeito quando `shows_observation=true`, define se a observação é obrigatória ou opcional; `requests_replacement_decision` (migration 112) — pede decisão de reposição ao atribuir o status; `is_scheduling_default` (migration 112) — status inicial usado ao criar reposições/novos atendimentos, no máximo 1 **ativo**; `is_awaiting_outcome` (migration 115) — status representa atendimento que ainda não aconteceu (ex.: Agendada, Confirmada), **sem limite** de quantos status ativos podem ter — isenta Objetivo/Relato de obrigatoriedade e alimenta o cálculo de Pendências |
| `appointment_types` | Tipos de atendimento (Sessão Individual, Grupo etc.) — toggle `active` |
| `medical_records` | Prontuário do paciente — 1:1, criado automaticamente ao abrir; campos `therapeutic_project_description` e `therapeutic_project_notes` TEXT (Projeto Terapêutico); campos `anamnesis_description` e `anamnesis_notes` TEXT (Anamnese/HPMA, migration 108) |
| `medical_record_exams` | Exames complementares do paciente — N por prontuário |
| `medical_record_medications` | Medicamentos do paciente — N por prontuário |
| `medical_record_conducts` | Conduta & objetivo terapêutico — N por prontuário, vinculado ao terapeuta/especialidade |
| `patient_involved_therapists` | Terapeutas envolvidos no atendimento do paciente (N:N) — complementa o Gerente do Caso |
| `audit_logs` | Log de auditoria — registra VIEW/INSERT/UPDATE/DELETE com user_id, user_email, user_name, action, resource_type, resource_id, resource_name; retém apenas 90 dias |
| `audit_logs_history` | Arquivo do log de auditoria — mesmo schema + coluna archived_at; retém de 90 dias a 1 ano; manutenção via pg_cron (maintain_audit_logs) |
| `contact_leads` | Contatos do site público — name, phone, email, specialty, how_found, message, status, internal_note, assigned_to, last_contact_at, patient_name, contact_reason, referred_by |
| `payment_demonstratives` | Histórico de demonstrativos de pagamento definitivos — patient_id, period_start, period_end, mes_label, nf_number, nf_date, consultation_ids (UUID[]), form_data (JSONB — inclui `totalAmount`, `patientName`, `periodType`), created_by; admin only |
| `support_tickets` | Chamados de suporte — subject, type, author, description, solution, status, nova_resposta (BOOLEAN), created_by_id |
| `support_ticket_history` | Histórico de status dos chamados — ticket_id, status, changed_at, changed_by, note (TEXT) |
| `age_ranges` | Faixas etárias — name, min_age, max_age, color; critério: min_age ≤ idade < max_age |
| `convenio_reports` | Histórico de relatórios ao convênio — patient_id, therapist_id, responsible_therapist_id (RT), specialty, mes_label, version_label, intervention_goals, created_by |
| `patient_specialty_report_settings` | Desafios relacionados do Encaminhamento por paciente + especialidade — unique(patient_id, specialty), referral_challenges |
| `company_settings` | Configurações da empresa — linha única (id=1, CHECK constraint); razao_social, cnpj, cnes, ai_system_prompt, updated_at |
| `payment_invoices` | Notas fiscais / faturas — nf_number (globalmente único via índice parcial), patient_id, nf_issue_date, status (ISSUED/PAID/CANCELLED), total_amount, payment_demonstrative_id, consultation_ids (UUID[]), snapshot (JSONB), created_by, cancelled_at, cancelled_by, paid_at, paid_by; admin only |
| `consultation_series` | Séries recorrentes — patient_id, primary_therapist_id, specialty, appointment_type_id, consultation_status_id, room_id, time, duration, recurrence_type ('by_count'/'by_date'), recurrence_days (integer[] ISO 1=Seg…7=Dom), start_date, end_date, session_count, active, notes, created_by, `event_type` (SESSION/INTERVIEW), `interview_format` (PRESENTIAL/REMOTE), `meeting_platform`, `meeting_link`, `interviewee_name`; RLS: admin tudo; terapeuta SELECT/INSERT/UPDATE das próprias séries (migration 83 adicionou INSERT/UPDATE que faltava no 80) |
| `consultation_therapists` | Participantes por consulta — consultation_id, therapist_id, specialty, is_primary; UNIQUE (consultation_id, therapist_id); sempre deve existir exatamente 1 is_primary=true; ON DELETE CASCADE de consultations |
| `calendar_block_series` | Séries de bloqueios recorrentes — therapist_id, block_type ('RIGID'/'FLEX'), description, start_date, end_date, recurrence_type, recurrence_days (integer[]), session_count, start_time, end_time, active, cancelled, created_by |
| `calendar_blocks` | Bloqueios de agenda por data — therapist_id, series_id (nullable), block_type ('RIGID'/'FLEX'), description, date, start_time, end_time, series_original_date, is_series_exception, active, cancelled, cancelled_at, cancelled_by, created_by; soft-delete via cancelled=true (nunca DELETE físico); RLS: admin tudo; próprio terapeuta SELECT/INSERT/UPDATE; membro da equipe SELECT |
| `consultation_conflicts` | Conflitos de agenda detectados — consultation_id (CASCADE), conflict_type ('THERAPIST_OVERLAP'/'ROOM_OVERLAP'/'THERAPIST_UNAVAILABLE_TOTAL'/'THERAPIST_UNAVAILABLE_PARTIAL'), related_consultation_id (SET NULL), therapist_id, room_id, calendar_block_id (SET NULL), conflict_date, start_time, end_time, description, resolved; RLS: admin tudo; terapeuta SELECT para próprias/equipe |

### Mappers (DB → App)

Todos em `src/lib/supabase.js`. Convertem snake_case do banco para camelCase do app:
- `mapPatient` — `specialties` agora é `[{ key, patientValue, therapistValue }]` (não mais string[])
- `mapTherapist` — `therapistSpecialties` agora é `[{ specialty, credential, canBeRt }]`
- `mapGuardian` (inclui `neighborhood`), `mapTherapist`, `mapAppointment` (inclui `startTime`, `endTime` calculado via duration), `mapConsultation` (inclui `time`, `roomId`)
- `mapSpecialty`, `mapPaymentMethod` (inclui `displayOrder`), `mapDiagnosis`, `mapPatientStatus`, `mapRoom` (inclui `allowsMultiplePatients`)
- `mapConsultation` também inclui `nfNumber`, `nfIssueDate`, `previousStatusBeforeInvoice`, `seriesId`, `seriesOriginalDate`, `isSeriesException`, `consultationTherapists[{id, therapistId, specialty, isPrimary}]`, `eventType`, `interviewFormat`, `meetingPlatform`, `meetingLink`, `intervieweeName`, `willHaveReplacement` (preserva `null`/`true`/`false`, nunca normalizado para boolean — ver seção Reposição de Atendimentos), `replacementForConsultationId`
- `mapConsultationSeries` — mapper para `consultation_series`; inclui `eventType`, `interviewFormat`, `meetingPlatform`, `meetingLink`, `intervieweeName`
- `mapConsultationStatus` (inclui `automatic`, `showsObservation`, `requiresObservation` — migration 110; `requestsReplacementDecision`, `isSchedulingDefault` — migration 112), `mapAppointmentType`, `mapExam`, `mapMedication`, `mapConduct`
- `sortPaymentMethods(list)` (`src/utils/paymentMethodUtils.js`) — ordenação centralizada de formas de pagamento: `displayOrder` crescente (desempate alfabético), depois as sem `displayOrder` em ordem alfabética; aplicada em `fetchAll`/`addPaymentMethod`/`updatePaymentMethod` no DataContext, então `paymentMethods` do `useData()` já vem sempre ordenado
- `mapCalendarBlock` — mapper para `calendar_blocks` (camelCase; inclui `seriesId`, `blockType`, `startTime`, `endTime`, `cancelled`, `cancelledAt`, `cancelledBy`)
- `mapCalendarBlockSeries` — mapper para `calendar_block_series`
- `mapConsultation` inclui também `conflicts[{id, conflictType, relatedConsultationId, therapistId, roomId, calendarBlockId, conflictDate, startTime, endTime, description, resolved}]` — filtrados por `!resolved` no mapper
- `age_ranges` mapeado inline no DataContext: `{ id, name, minAge, maxAge, color }`
- `company_settings` exposto como `companySettings` (`{ razaoSocial, cnpj, aiSystemPrompt }`) via `useData()`; função `updateCompanySettings({ razaoSocial, cnpj, aiSystemPrompt })` faz `.update().eq('id', 1)`
- `syncPatientRelations(patientId, { specialties, conditionIds })` — specialties agora `[{ key, patientValue, therapistValue }]`
- `syncGuardianPatients(guardianId, patientIds)`
- `syncTherapistSpecialties(therapistId, [{ specialty, credential }])`
- `syncExternalTherapists(patientId, [{ name, specialty, phone }])`
- `fetchInactivePatients()` — busca pacientes com `deleted=true` sob demanda (não carregado no estado global); usado pela `PatientsPage` ao ativar o toggle "Ver Inativos"
- `getPaymentDemonstrativos(patientId)` — busca registros de `payment_demonstratives` por paciente, `ORDER BY created_at DESC`; usado pelo `HistoricoSection` em `ReportsPage`
- `createPaymentInvoice({ nfNumber, patientId, nfDate, totalAmount, demonstrativoId, consultationIds, snapshot })` — INSERT em `payment_invoices`; retorna o registro inserido
- `getPaymentInvoices({ patientId, status, nfNumber, dateFrom, dateTo, search })` — SELECT com JOIN `patients(full_name)`; filtros opcionais; busca texto client-side
- `cancelPaymentInvoice(invoiceId, consultationIds)` — lê `previous_status_before_invoice` de cada consulta, restaura status, limpa `nf_number`/`nf_issue_date`, atualiza invoice para CANCELLED
- `markInvoicePaid(invoiceId, consultationIds, paidStatusId)` — atualiza consultas para status pago, atualiza invoice para PAID

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
- **AuthContext sempre busca registro de terapeuta** independente do role. Admin que também é terapeuta terá `user.id` preenchido; admin puro terá `user.id = null`. Use `isSupportAdmin = isAdmin && !user?.id` para detectar "admin puro" onde a distinção importa (ex.: suporte, dashboard).

### Fluxo de convite de terapeuta

```
Admin cria terapeuta no TherapistFormModal
  → INSERT em therapists (sem user_id ainda)
  → Chama Edge Function invite-therapist
  → Supabase envia e-mail de convite
  → Terapeuta clica no link → abre ResetPasswordPage
  → Define senha → therapists.user_id é vinculado automaticamente
```

**E-mail é imutável após o cadastro:** `TherapistFormModal` desabilita o campo de e-mail em modo edição (é a base do convite/conta já criada) e exclui `email` do payload enviado a `updateTherapist` mesmo assim (dupla trava). No cadastro, exibe alerta vermelho destacado orientando a conferir o e-mail antes de salvar, já que não há como corrigi-lo depois pela tela.

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
'/admin/pagamentos'             // gestão de notas fiscais / faturas (PaymentsPage) — admin only
'/admin/guia'                   // Guia do Sistema (GuidePageV2) — admin only; abas 'Para Terapeutas' e 'Para Administradores' visiveis so para admin
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
- Adicionado nas páginas: Agenda, Pacientes, Busca Avançada de Pacientes, Responsáveis, Atendimentos, Prontuário, Terapeutas, Relatórios, Relatório de Convênio, Contatos, Suporte

## Sidebar Admin

- Item "Contatos" — visível apenas para admin, com badge vermelho mostrando contagem de `novo`
- Item "Relatórios" — visível para **todos** os autenticados (terapeuta vê apenas próprios dados na página)
- Item "Pagamentos" — visível apenas para admin (ícone `FiDollarSign`); rota `/admin/pagamentos`; posicionado após "Relatórios"
- Item "Suporte" — visível para **todos** os usuários autenticados; badge laranja para admin puro mostrando contagem de tickets com status `novo` ou `reprovado_usuario`
- Seção "Administração" — colapsável, visível a **todos** os autenticados; contém: Terapeutas, Especialidades, Formas de Pagamento, Diagnósticos, Status do Paciente, Status Atendimento, Tipos de Atendimento, Salas, Faixas Etárias (read-only para terapeutas) + Log de Auditoria (admin only) + **Dados da Empresa** (admin only, ícone `FiBriefcase`)
- "Sair" sempre visível no rodapé — redireciona para `/login` (não para a home pública)
- **"Powered by ©DGT"** — texto `text-xs text-gray-400` exibido abaixo do botão Sair

## Site Público

- Telefone de contato: **(11) 9 7579-9590** — link abre WhatsApp (`https://wa.me/5511975799590`)
- **Endereço:** Rua Almirante Protógenes, 143, Jardim, Santo André - SP, CEP 09090-760
- **E-mail:** contatocasa.amarela2024@gmail.com
- Botão "Área Restrita" **removido** do header público (desktop e mobile)
- `PublicFooter`: rodapé inferior em layout flex — copyright à esquerda, "Powered by ©DGT" à direita

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
- **Dados escolares:** `school_name`, `school_phone`, `school_coordinator` (campos de endereço escolar removidos do DB em 103)
- **Médico responsável:** `doctor_insurance`, `doctor_name`, `doctor_specialty`, `doctor_phone`
- **Terapeutas externos:** tabela `patient_external_therapists` — lista N por paciente, com `name`, `specialty`, `phone`
- **Diagnóstico Principal:** campo `diagnosis` (texto livre via Select)
- **Comorbidades:** tabela `patient_conditions` — exclui o diagnóstico principal da lista
- **Flag `needs_convenio_report`:** boolean, default false; visível/editável apenas por admin (seção Informações Clínicas do `PatientFormModal`); exibida como chip azul no `PatientDetailPage`; filtra a lista de pacientes no Relatório de Convênio — somente pacientes com `needs_convenio_report = true` aparecem na seleção
- **Tag de Faixa Etária:** exibida nos cards/tabela de PatientsPage, calculada dinamicamente a partir de `dateOfBirth` + tabela `age_ranges`

## Campos do Responsável

- Endereço completo: `address`, `neighborhood`, `city`, `state`, `cep`
- Seleção de pacientes vinculados: lista pesquisável com checkboxes
- Busca na listagem: por nome, CPF, telefone ou **nome do paciente vinculado**
- **Flag `is_financial_responsible`:** boolean, default false; indica que este responsável é o pagador da clínica. CPF obrigatório somente quando marcado como financeiro; se preenchido sem ser financeiro, formato ainda é validado. Exibido como chip verde "Financeiro" nos cards mobile e tabela desktop da `GuardiansPage`; checkbox "Responsável financeiro?" no `GuardianFormModal`. Migration: `101_guardian_financial_responsible.sql`.

## Limpeza Definitiva de Dados de Paciente Inativo

- **Acesso:** admin only; botão só aparece na aba de inativos (`showDeleted=true`) e somente em pacientes com `deleted=true`.
- **Fluxo:** botão ícone `FiTrash2` → `PatientCleanupModal` → chama `get_patient_cleanup_summary` → exibe contagens → usuário digita "LIMPAR" → chama `cleanup_inactive_patient_data` → Toast de sucesso → remove da lista.
- **O que é limpo:** todos os dados transacionais (consultas, séries, prontuário, pré-pago, demonstrativos, NFs, relatórios de convênio, vínculos do paciente). O cadastro do paciente (`patients`) é mantido com `deleted=true`.
- **O que NÃO é limpo:** `patients`, `guardians`, `therapists`, `rooms`, `specialties`, `diagnoses`, `appointment_types`, `consultation_statuses`, `calendar_blocks`, `support_tickets`, `contact_leads`.
- **RPCs (migration `94_patient_cleanup_rpc.sql`):**
  - `get_patient_cleanup_summary(p_patient_id uuid)` — SECURITY DEFINER; retorna JSONB com contagens por tabela; valida que paciente existe e está inativo.
  - `cleanup_inactive_patient_data(p_patient_id uuid, p_confirm text)` — SECURITY DEFINER; valida admin inline (`EXISTS (SELECT 1 FROM profiles ...)`), `deleted=true`, `p_confirm='LIMPAR'`; executa DELETE em ordem de FK; grava em `audit_logs`.
- **DataContext:** `getPatientCleanupSummary(patientId)` e `cleanupInactivePatientData(patientId)` — expostos no contexto.

## PatientDetailPage

- **Informações Clínicas:** Diagnóstico Principal, Comorbidades, Forma de Pagamento (especialidades removidas daqui)
- **Terapeutas:** Gerente do Caso, Terapeutas Envolvidos, **tabela de Especialidades em Atendimento** (Especialidade | Valor Paciente | Valor Terapeuta — colunas de valor apenas para admin)
- **Responsáveis:** card inline
- **Próximos Atendimentos:** até 20 atendimentos futuros (data ≥ hoje), ordenados ASC; botões de editar (lápis) e excluir (lixeira) visíveis para admin ou terapeuta responsável do atendimento (`isAdmin || c.therapistId === user?.id`)

## Prontuário Clínico (MedicalRecordsPage — `/admin/prontuario`)

6 seções colapsáveis: **Anamnese / HPMA**, Exames Complementares, Medicamentos, **Projeto Terapêutico**, Conduta & Objetivo Terapêutico, Histórico de Atendimentos.

**Anamnese / HPMA:** primeira seção, antes de Exames Complementares. Dois campos texto livres — Anamnese/HPMA e Observações. Único por prontuário (colunas `anamnesis_description` e `anamnesis_notes` em `medical_records`, migration 108). Mesmo padrão de permissão, carregamento, salvamento e PDF do Projeto Terapêutico (ver abaixo). `getOrCreateMedicalRecord` retorna também `{ anamnesisDescription, anamnesisNotes }`. DataContext expõe `updateAnamnesis(medicalRecordId, { description, notes })`. Incluído no PDF do prontuário (entre Responsáveis e Exames Complementares) somente quando ao menos um campo estiver preenchido — nunca gera seção vazia.

**Projeto Terapêutico:** seção entre Medicamentos e Conduta. Dois campos texto livres — Descrição do Projeto e Observações. Único por prontuário (colunas `therapeutic_project_description` e `therapeutic_project_notes` em `medical_records`). Editável por admin e terapeutas da equipe. `getOrCreateMedicalRecord` retorna `{ id, therapeuticProjectDescription, therapeuticProjectNotes }` (objeto, não string). DataContext expõe `updateTherapeuticProject(medicalRecordId, { description, notes })`. Incluído no PDF do prontuário quando preenchido.

**Histórico de Atendimentos — filtros:**
- **Período:** 4 botões fixos — Mês -2, Mês Anterior, Mês Corrente (default), Período (De & Até). "Mês Seguinte" foi removido — não faz sentido prontuário futuro. Cálculo usa `new Date(y, m-1, 1)` (local) para evitar bug de timezone UTC-3.
- **Status:** chips de múltipla seleção; vazio = todos
- **Ações em lote (admin):** checkbox por atendimento + botões de status dinâmicos (todos os status ativos)

**PDF do prontuário:** botão "PDF" no header (admin only) → `generateProntuarioPDF()`

## Relatórios PDF (`/admin/relatorios`)

- **Acesso:** todos os autenticados. Terapeutas veem apenas "Consultas por Terapeuta", com campo Terapeuta pré-preenchido (read-only) com seu próprio nome (`user.id`).
- **Pré-visualização (`PdfPreviewModal`, `src/components/ui/PdfPreviewModal.jsx`):** componente reutilizável entre os dois relatórios — modal `size="preview"` (~90% da tela, altura 90vh) que renderiza o PDF em `<canvas>` via `pdfjs-dist` (dynamic import + worker via `new URL(...)`), em vez de `<iframe>` apontando pro visualizador nativo do navegador. Não há barra lateral de miniaturas porque não há nenhuma UI nativa envolvida — decisão tomada porque parâmetros de URL como `#toolbar=0&navpanes=0` não são confiáveis nos visualizadores PDF atuais. Rodapé sempre com "Fechar" + prop `actions[]` (`{ label, icon, onClick, variant, loading, disabled }`) parametrizando os botões específicos de cada fluxo.
- **Demonstrativo de Pagamento (admin only):** ao clicar "Gerar PDF", abre `PdfPreviewModal` com `actions = [Gerar DRAFT, Faturar]`:
  - **Fechar:** fecha o modal; "Gerar PDF" reaparece no formulário
  - **Gerar DRAFT:** baixa o PDF com marca d'água "RASCUNHO" diagonal (sem salvar histórico nem alterar status); modal permanece aberto
  - **Faturar:** fecha o modal e exibe o formulário inline de NF (número + data emissão, ambos opcionais) → ao confirmar: salva em `payment_demonstratives` (com `totalAmount` em `form_data`) → atualiza status para "Faturado" via `batchFaturarConsultations` → gera e baixa PDF definitivo com banner verde de NF
- **Consultas por Terapeuta:** também abre `PdfPreviewModal`, mas com `actions = [Gerar PDF]` apenas — sem DRAFT, Faturar, NF ou qualquer ação que grave faturamento; "Gerar PDF" baixa o blob já gerado (sem regenerar).
- **Layout do PDF (ambos os relatórios):** tabela colunada (`autoTable`) — Data/Hora | Status | Tipo | Terapeuta(paciente)/Paciente(terapeuta) | Especialidade | Modalidade | Valor. **Não exibe mais "Objetivo da Sessão"** (campo clínico sigiloso removido do PDF). **"Observação"** aparece como linha complementar (colSpan, itálico, fundo âmbar) logo abaixo do atendimento **somente quando** o status tem `showsObservation && requiresObservation` **e** `consultations.notes` está preenchido — não reserva coluna/espaço permanente quando não se aplica (`needsObservationRow`/`observationRowCell` em `generateReportPDF.js`, compartilhadas pelos dois geradores).
- **Sequência de operações definitivas (quasi-transactional):** salva histórico PRIMEIRO; se falhar, nada mais é executado; se `batchFaturarConsultations` falhar após salvar, alerta que o status deve ser corrigido manualmente
- **Histórico de Demonstrativos Faturados:** seção abaixo do formulário (admin, quando paciente selecionado) mostra registros de `payment_demonstratives` ordenados por data; clicar no `>` abre modal de detalhes com período, NF, total e data de geração. Atualizado automaticamente após cada faturamento via `historyRefreshKey`.
- **`batchFaturarConsultations(ids, statusId, { nfNumber, nfDate } = {})`** no DataContext: lê `previous_status_before_invoice` existente de cada consulta (Promise.all), salva onde ainda null, depois atualiza `consultation_status_id` + `nf_number` + `nf_issue_date`; SEM chamar `handlePrepaidConsumption` — ledger pré-pago não é afetado
- Após faturar, `handleFaturar` em `ReportsPage` chama `createPaymentInvoice` (try/catch silencioso) para registrar em `payment_invoices` com snapshot completo das consultas
- **`getPaymentDemonstrativos(patientId)`** no DataContext: busca registros de `payment_demonstratives` por paciente, ordenados por `created_at DESC`
- **Consultas por Terapeuta:** inclui consultas onde o terapeuta é participante secundário (`consultation_therapists`). Cada consulta recebe `effectiveSpecialty` = especialidade do terapeuta selecionado naquele atendimento. Coluna Valor usa `effectiveSpecialty` para buscar o valor de repasse correto em `patient.specialties`.
- **Demonstrativo de Pagamento:** expande terapeutas secundários como entradas de cobrança separadas — para cada consulta com participantes secundários, gera cards adicionais com o terapeuta secundário e sua especialidade, usando `effectiveSpecialty` para calcular o valor do paciente.
- **`effectiveSpecialty`:** campo virtual adicionado em `ReportsPage` antes de gerar o PDF — `c.effectiveSpecialty = participation?.specialty || c.specialty`. Usado por `resolvePatientValue`, `resolveTherapistValue` e `findPatientSpecialtyConfig` em `generateReportPDF.js`.
- Ambos exibem total de atendimentos + total do período no rodapé
- Filtros: tipo de relatório, paciente/terapeuta (searchable), período (mês ou De/Até), status (múltipla seleção — inclui automáticos)
- Funções: `generateConsultasPacientePDF({ ..., draftMode, nfNumber, nfDate, returnBlob })` — quando `returnBlob=true` retorna `{ blob, filename, totalAmount }` em vez de fazer `doc.save()`; `generateConsultasTerapeutaPDF({ ..., returnBlob })` — mesmo padrão, retorna `{ blob, filename }` — em `src/utils/generateReportPDF.js`
- Card de acesso rápido ao "Relatório de Convênio" na parte superior da página
- **Filtro de terapeutas não-equipe:** `filterConsultations` exclui consultas cujo terapeuta primário tenha `belongsToTeam === false` (checagem explícita, não afeta registros onde o campo é null/undefined).
- **`buildUnconfiguredItems`:** verifica valor não configurado tanto para a especialidade primária quanto para cada especialidade secundária em `c.consultationTherapists.filter(t => !t.isPrimary)` — espelha a expansão que o gerador de PDF faz.
- **Ordenação dos PDFs:** todos os relatórios PDF (consultas por paciente, por terapeuta, prontuário, faturas) ordenam os itens do mais antigo para o mais novo. A tela preserva a ordem original.

## Relatório de Convênio (`/admin/relatorios/convenio`)

- **Acesso:** todos os autenticados. Terapeutas veem seus próprios pacientes; admin seleciona qualquer terapeuta.
- **Fluxo:** (1) Seleciona terapeuta emissor + paciente + especialidade + período → Buscar Atendimentos; (2) Edita sessões; (3) Preenche Diagnóstico, Desafios Relacionados, Objetivos; (4) Pré-visualiza e gera PDFs.
- **Relatório ao Convênio (PDF):** seções Identificação, Atendimentos do Mês, Encaminhamento (template automático), Objetivos de Intervenção, Desempenho e Conclusão (texto fixo), Fechamento, Assinatura em caixa. Rodapé com endereço/contato em todas as páginas.
- **Lista de Presença (PDF):** tabela Data | Valor | Local | Horário | Assinatura Profissional | Assinatura Responsável + linhas de assinatura.

### Responsável Técnico (RT)

Conceito crítico: nem todo terapeuta pode ser RT em todas as especialidades. Definido na relação `therapist_specialties` via campo `can_be_rt boolean default false`.

**Regra de seleção do RT:**
1. Ao selecionar terapeuta emissor + especialidade, verificar `therapist.therapistSpecialties.find(s => s.specialty === specialty)?.canBeRt`.
2. Se `canBeRt === true`: o próprio emissor é o RT. Nenhum campo adicional é exibido.
3. Se `canBeRt !== true`: exibir campo "Responsável Técnico" com apenas terapeutas que têm `can_be_rt = true` para aquela especialidade. Se nenhum existir, bloquear a geração.
4. O RT efetivo (`selectedRT`) é quem aparece no PDF — nome, especialidade e conselho regional.

**No PDF (Relatório e Lista de Presença):** os parâmetros `terapeutaNome` e `terapeutaRegistro` recebem dados do RT (não do emissor quando diferente). O emissor fica apenas em `therapist_id` no histórico.

**Cadastro:** `TherapistFormModal.jsx` tem coluna "RT?" (checkbox) na seção de Especialidades e Registros Profissionais.

### Encaminhamento (template automático)

Não é mais texto livre. Texto gerado automaticamente:
> "[Primeiro nome] foi encaminhado para atendimento [especialidade] devido a dificuldades observadas em seu desenvolvimento, incluindo [desafios relacionados]. O objetivo do acompanhamento é realizar avaliação contínua, intervir de forma estruturada conforme as necessidades apresentadas e promover avanços funcionais que favoreçam seu desenvolvimento."

- **Desafios relacionados:** campo editável na tela (`referralChallenges`). Persistido por paciente+especialidade na tabela `patient_specialty_report_settings`. Preenchido na primeira geração, reutilizado automaticamente nas seguintes. Atualizado no banco ao "Baixar e Registrar".
- O PDF exibe o texto completo montado.

### Tabela patient_specialty_report_settings

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `patient_id` | uuid → patients | — |
| `specialty` | text | chave da especialidade |
| `referral_challenges` | text | desafios relacionados do encaminhamento |
| `created_at`, `updated_at` | timestamptz | — |

Constraint única: `(patient_id, specialty)`. RLS: admin tudo; terapeuta SELECT/INSERT/UPDATE para pacientes que gerencia.

### Objetivos de Intervenção (auto-carregamento)

- Campo `objetivos` (`intervention_goals` no banco) é mensalmente editável.
- Ao buscar atendimentos, o sistema carrega automaticamente o `intervention_goals` do último relatório gerado para aquele `patient_id + specialty`.
- Ao "Baixar e Registrar", salvo em `convenio_reports.intervention_goals`.

### Desempenho e Conclusão (texto fixo)

Não é mais editável. Texto padrão fixo definido em `DESEMPENHO_FIXO` em `generateConvenioPDF.js`. Exibido como read-only na tela.

### Campos do convenio_reports

| Coluna | Tipo | Descrição |
|---|---|---|
| `patient_id` | uuid | — |
| `therapist_id` | uuid | terapeuta emissor |
| `responsible_therapist_id` | uuid | RT (quando diferente do emissor) |
| `specialty` | text | — |
| `mes_label` | text | — |
| `version_label` | text | — |
| `intervention_goals` | text | objetivos do mês (pré-carregado na próxima geração) |
| `form_data` | jsonb | snapshot completo do formulário |
| `created_by` | uuid | auth.uid() do criador |

- **Diagnóstico:** pré-preenchido com `patient.diagnosis` + nomes das comorbidades; editável (terapeuta acrescenta CID).
- **Registro/credencial:** `rtTherapist.therapistSpecialties.find(s => s.specialty === specialty)?.credential`.
- **Nome do arquivo:** inclui especialidade — ex: `relatorio_convenio_nome_ESPECIALIDADE_Mes_Ano.pdf`.
- **Versionamento:** `versionLabel` impresso no cabeçalho do PDF; histórico gravado em `convenio_reports`.
- **companySettings:** passado para ambas as funções PDF; exibe Razão Social, CNPJ e CNES (se configurado) no cabeçalho.
- **Horários por sessão:** cada sessão tem campo `time` individual. Campo "Horário padrão" + botão "aplicar a todas". O PDF produz uma linha única via `buildSessionsLine(sessions, fallbackHorario)` — formato: `"02 às 17:00, 15 às 18:00 e 27 às 11:00"`.
- **Lista de pacientes:** somente pacientes com `needs_convenio_report = true` aparecem no select. Admin vê todos os elegíveis; terapeuta vê apenas os seus (gerente do caso ou envolvido). Filtro aplicado em `accessiblePatients` na `ConvenioReportPage`.
- **Busca de atendimentos:** filtra `consultations` por `patientId + therapistId (emissor) + specialty + date range`. Admin recebe erro se não tiver terapeuta emissor selecionado. Exclui consultas com `belongsToTeam === false` no terapeuta primário.
- **Auto-refresh do histórico:** após "Baixar e Registrar", seção recarrega via `historyRefreshKey`.
- **Sugestão com IA:** botão "Sugerir com IA" (⚡ violeta), posicionado inline ao lado da label "Objetivos de Intervenção". Sugere apenas `objetivos`; encaminhamento e desempenho não são sugeridos pela IA. Requer `OPENAI_API_KEY` no Supabase + JWT Verification **DESATIVADO**.
- **Histórico — RT:** `saveHistory` sempre persiste `responsible_therapist_id: selectedRT?.id || null` (mesmo quando RT = emissor). `handleRestore` prioriza `record.responsible_therapist_id` antes de `fd.rtId` (legado).
- **PDF Identificação:** tabela compacta — Paciente e Diagnóstico em linha própria (colSpan 3); Especialidade e Terapeuta responsável compartilham a mesma linha em 4 colunas (44/44/46/48mm).
- Funções em `src/utils/generateConvenioPDF.js`: `generateRelatórioConvenioPDF()`, `generateListaPresencaPDF()`, `formatMesLabel()`, `MONTHS`.
- `MONTHS` e `formatMesLabel` re-exportados de `pdfShared.js` via `export { MONTHS, formatMesLabel } from './pdfShared'`.

## Dashboard (`/admin`)

- **Saudacao IA:** mensagem de abertura gerada pela Edge Function `dashboard-greeting` via OpenAI gpt-4o-mini.
  - **Cache:** `localStorage` com chave `greeting_${today}_${user.authId}` — uma chamada por usuario por dia; entradas de dias anteriores limpas automaticamente na proxima geracao.
  - **Categoria:** sorteada no frontend (`GREETING_CATEGORIAS`) a cada novo dia — 10 opcoes: `motivacional`, `pessoal`, `bemEstar`, `geografia`, `cinema`, `musica`, `tecnologia`, `historia`, `ciencia`, `gastronomia`.
  - **Sub-hint:** sorteado junto com a categoria (`HINT_MAP`) — seculo (XIII-XXI) para geografia/historia/gastronomia; decada (1800-2020) para cinema/musica/ciencia/tecnologia; tema especifico para motivacional/pessoal/bemEstar. Enviado como diretiva adicional ao modelo.
  - **Categorias com datas removidas** (`efemeride`, `santo`, `aniversario`, `comemorativa`) — LLMs confabulam datas especificas.
  - **Loading:** mensagem humorstica exibida enquanto aguarda a Edge Function.
  - **Deploy:** `npx supabase functions deploy dashboard-greeting --project-ref ffkkgmikvsqhutftoajh`

### Estrutura de painéis e dual-role

- `isDualRole = isAdmin && !!user?.id` — admin que também tem perfil de terapeuta.
- `effectiveView = isDualRole ? dashView : isAdmin ? 'admin' : 'therapist'` — painel efetivo; `dashView` é estado local que começa em `'therapist'` para dual-role.
- Toggle **"Meu Painel / Painel Admin"** exibido na área da saudação apenas para `isDualRole`. Permite alternar sem recarregar a página.
- **IMPORTANTE:** todas as condições de renderização usam `effectiveView === 'admin'` / `effectiveView === 'therapist'` — NUNCA `isAdmin` diretamente, para que dual-role funcione corretamente.

### Fontes de dados separadas

- `clinicSessions` — todas as consultas da clínica (`event_type !== 'INTERVIEW'`); usado no painel admin.
- `mySessions` — consultas pessoais (`therapistId === user?.id || consultationTherapists.includes(user?.id)`); retorna `[]` se `!user?.id`; **nunca** usa `isAdmin` para expandir. Usado no painel terapeuta.
- `myPatients` — pacientes onde o usuário é gerente ou envolvido. Usado no painel terapeuta.
- `activePatients` — todos os pacientes ativos da clínica. Usado no painel admin.
- `clinicThisMonth`, `clinicLastMonth` — fatias mensais de `clinicSessions`.

### Critérios de "realizada" e "agendada"

- `realizadaIds` = `consultationStatuses` com `consumesPrepaidSession === true && !norm(s.name).includes('agend')` — mais robusto que busca por nome.
- `agendadaIds` = `consultationStatuses` com `norm(s.name).includes('agend')`.
- Entrevistas (`event_type === 'INTERVIEW'`) são excluídas de todos os contadores.

### Pendências de preenchimento

- `pendingFill` = atendimentos com `c.date < today && agendadaIds.includes(c.consultationStatusId) && c.therapistId === user?.id` (somente primário — terapeuta secundário não é responsável pelo preenchimento).
- Exibido como tabela editável abaixo do card "Agenda de Hoje" no painel terapeuta; tem `ref` (`pendingSectionRef`) para o botão "Regularizar pendências" do card "Meu desempenho" rolar até ela e destacá-la temporariamente (`ring-2 ring-amber-400` por ~1.5s) — não é uma lista duplicada, é a mesma tabela.
- Lápis (FiEdit2) por linha abre `ConsultationFormModal` em modo edição; ao fechar (sucesso ou cancelamento), `reloadMonthlyMetrics()` é chamado para manter os painéis mensais sincronizados sem F5.

### Distribuição de pacientes por especialidade (pessoal — só terapeuta)

- `myPatientsBySpecialty` — conta **pacientes** de `myPatients` que têm aquela especialidade no cadastro. Indicador pessoal, exibido só no painel terapeuta ("Meus Pacientes por Especialidade"), mantido separado do painel coletivo "Sessões por Especialidade — mês" abaixo para não confundir os dois.

### Painéis mensais compartilhados (Admin + Terapeuta) — "Terapeutas" e "Sessões por Especialidade"

Os dois painéis (`🏆 Terapeutas — mês` e `📊 Sessões por Especialidade — mês`) aparecem em **ambas** as visões (`effectiveView === 'admin'` e `'therapist'`), com a mesma fonte de dados — sem cálculo duplicado entre Admin e Terapeuta.

- **Motivo de existir uma RPC:** a policy de SELECT em `consultations` ([20_fix_consultations_team_select.sql](supabase/20_fix_consultations_team_select.sql)) só libera ao terapeuta linhas onde ele é `therapist_id`, ou (se `belongs_to_team`) linhas de pacientes com terapeuta de equipe envolvido — nunca a clínica inteira. O array `consultations` do `DataContext` não contém os atendimentos dos colegas para um terapeuta comum, então os painéis não podiam ser calculados client-side como o admin já fazia. Em vez de ampliar a RLS de `consultations` (rejeitado por design — vazaria dado clínico), foi criada a RPC `get_dashboard_monthly_metrics` (migration 114), `SECURITY DEFINER` + `SET LOCAL row_security = off`, que só retorna contagens agregadas (nunca `patient_id`, nome de paciente ou conteúdo clínico) — `therapist_id`/`name`/`color` (já visível a todo autenticado hoje, ex. legenda da Agenda) e contagens totais/realizadas por terapeuta e por especialidade. Valida `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())`; `GRANT EXECUTE` só para `authenticated`.
- **Elegibilidade decidida no frontend, passada como parâmetro para a RPC** (`p_realizada_status_ids`, `p_agendada_status_ids` — os mesmos `useMemo` `realizadaIds`/`agendadaIds` já existentes) — evita duplicar a classificação em SQL. `realizadaIds` = `consumesPrepaidSession === true && !isAwaitingOutcome` (usado só para `specialties.completed`, ver abaixo); `agendadaIds` = `isAwaitingOutcome === true` (migration 115 — antes era busca textual por "agend" no nome, migrada nesta correção).
- **Pendências em duas colunas** (migration 116 — `CREATE OR REPLACE` da RPC 114, mesma assinatura): `pending_month` (atendimentos `is_awaiting_outcome` com data dentro do mês de referência e já vencida, até a data de corte) e `pending_previous` (idem, mas com data **anterior** ao mês de referência — atraso acumulado). O card "Meu desempenho" mostra a soma (`totalPending`) como headline, mas a projeção de meta (`computeFillProjection`) usa só `pendingMonth` — só as pendências do mês afetam a Taxa deste período.
- **Total = Atendidos + Pend. (mês)** (migration 117 — `CREATE OR REPLACE` da RPC 114/116, mesma assinatura): antes `total` contava **todo** o mês de referência (inclusive agendamentos futuros ainda não vencidos) enquanto `completed`/pendências eram sempre recortados pela data de corte — sobrava um resto sem coluna (agendamentos futuros do próprio mês + qualquer atendimento com status fora de `realizadaIds`/`agendadaIds`, ex. status configurado sem nenhuma das duas flags). Correção: `total` agora só conta até a data de corte (`c.date < p_cutoff_date`, "ontem" — automaticamente vira "o mês inteiro" quando hoje já é o mês seguinte, dentro do prazo de carência do 3º dia útil, já que todas as datas do mês de referência são então `< hoje`); e o campo `completed` (rótulo **"Atendidos"** na tabela, não mais "Realizadas") deixou de depender de `consumesPrepaidSession` — passa a ser **qualquer status diferente de `is_awaiting_outcome`** (a terapeuta já resolveu o registro, mesmo que o desfecho tenha sido Cancelada/Faltou). Com isso, todo atendimento do mês até a data de corte cai em exatamente uma de duas categorias (Atendidos ou Pend. (mês)), fechando a conta por construção. O painel de especialidades (`specialties.completed`) **não** foi alterado — continua usando `p_realizada_status_ids` (definição estrita, só `consumesPrepaidSession`), por não fazer parte do problema de reconciliação.
- **`src/utils/dashboardMetrics.js`** — helpers puros, única fonte para as duas visões:
  - `getReferenceMonth(now)` — regra do **3º dia útil**: até o final do 3º dia útil do mês corrente (inclusive), os 2 painéis + o card pessoal mostram o **mês anterior**; do 4º dia útil em diante, mostram o **mês corrente**. Sábado/domingo não contam como dia útil. **Feriados não são considerados (limitação conhecida).** Escopo desta regra: **só** os 2 painéis mensais + card "Meu desempenho" — os StatCards do topo (Sessões no mês, Taxa de realização, Realizadas no mês, Faltas+canceladas, comparativos "vs mês anterior") continuam no mês corrente literal, por decisão de produto.
  - `getPerformanceTier(rate, hasEligible)` — 4 faixas visuais (100% Excelência / 95–99% Meta alcançada / 85–94% Quase lá / <85% Atenção às pendências) + caso sem atendimento elegível. Mensagens sempre positivas/acionáveis, nunca punitivas ("pior terapeuta", "ranking de produtividade" etc. propositalmente evitados).
  - `computeFillProjection({ completed, total, pending })` — quantos preenchimentos faltam para a próxima meta, **sem prometer o impossível**: `needed = ceil(nextGoalPct/100 * total) - completed`, capado em `pending`; se `pending` não bastar para a meta, marca `achievable: false` e a UI cai para uma mensagem genérica ("preencha suas N pendências") em vez de afirmar que a meta X% é alcançável.
  - `compareTherapistPerformance(a, b)` — ordenação única do ranking: maior Taxa → maior preenchidos → maior Total → nome (pt-BR). Usada tanto para ordenar a tabela quanto para achar a posição do usuário logado.
- **`TherapistPerformanceTable`** (sub-componente local em `DashboardPage.jsx`, reaproveitado nas duas views): recebe a lista crua da RPC, só deriva `rate` (não recalcula total/completed), filtra `total > 0`, ordena com `compareTherapistPerformance`. Colunas Total/**Atendidos**/Taxa/**Pend. (mês)**/**Pend. (anteriores)** — duas colunas de pendência, não uma. Medalhas 🥇🥈🥉 nas 3 primeiras posições com tooltip "Posição baseada na Taxa de preenchimento do período."; linha do usuário logado destacada (fundo azul claro) com rótulo "— Você" (só visual, não altera `therapist.name` no banco); Total sempre visível ao lado da Taxa; sem `slice`, lista completa com scroll interno (`max-h-96 overflow-y-auto`) para a própria linha continuar acessível.
- **`SpecialtyMonthlyPanel`** (idem): junta `specialty_key`+contagens da RPC com `label`/`color` de `specialtiesData` (já carregado, dado público). Subtítulo fixo "Visão consolidada da clínica no período." nas duas views — sempre a clínica inteira, nunca só os pacientes/especialidades do terapeuta logado.
- **`MyPerformanceCard`** (idem, só na view terapeuta): Taxa, Posição (índice+1 na lista ordenada/filtrada da RPC), "{completed} de {total}", Pendências (`pendingMonth + pendingPrevious`, com detalhamento visual quando há atraso acumulado), barra de progresso, tier + mensagem, "Meta: {nextGoalPct}%" + frase de projeção (baseada só em `pendingMonth`), botão "Regularizar pendências" (só quando há pendência) que rola/destaca a tabela de pendências já existente — não abre modal nem cria lista nova.
- Busca via `supabase.rpc('get_dashboard_monthly_metrics', {...})` direto em `DashboardPage.jsx` (mesmo padrão local já usado para `financial`/`newLeadsCount`, sem passar pelo `DataContext`) — dispara uma vez (independe de `effectiveView`, reaproveitado pelos dois painéis no toggle dual-role) e de novo a cada fechamento do modal de pendência. Erro → `Toast` + estado local isolado com botão "Tentar novamente"; nunca derruba o resto do Dashboard.

## Dados da Empresa (`/admin/empresa`)

- **Acesso:** admin only (terapeutas redirecionados para `/admin`).
- **Campos:** Razão Social, CNPJ (máscara `XX.XXX.XXX/XXXX-XX`), **CNES** (opcional) e **Prompt da IA** (textarea `font-mono`, botão "Restaurar prompt padrão").
- **Armazenamento:** tabela `company_settings` — linha única (id=1, `CHECK (id = 1)`); UPDATE via `updateCompanySettings()`. Campo `cnes` TEXT adicionado em `63_convenio_reports_rt_goals_cnes.sql`.
- **CNES:** exibido no cabeçalho dos PDFs ao lado do CNPJ, se preenchido. Tratado em `addPageHeader` de `pdfShared.js`.
- **Prompt da IA:** `companySettings.aiSystemPrompt` enviado à Edge Function `suggest-convenio`. Se vazio, usa `DEFAULT_SYSTEM_PROMPT`.
- `companySettings` (do `useData()`) agora inclui `{ razaoSocial, cnpj, cnes, aiSystemPrompt }` — passado como parâmetro opcional para todas as funções geradoras de PDF.

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

- **Acesso:** todos os usuários autenticados. Admin puro vê todos os chamados; admin que também é terapeuta (`isSupportAdmin = false`) e terapeutas veem apenas os próprios.
- **Criar chamado:** Assunto, Tipo (Erro/Dúvida/Melhoria), Autor, Descrição. Status inicia sempre como `novo`.
- **Editar (admin puro):** todos os campos + Solução + Status + tabela de Histórico de Mudanças de Status.
- **Visualizar (não-admin puro):** apenas leitura; vê status como badge, solução se preenchida e botões de aprovação/reprovação se há resposta pendente.
- `support_tickets.created_by_id` = `auth.uid()` do criador — base do RLS por usuário.
- `support_ticket_history`: cada mudança de status registra `status`, `changed_at`, `changed_by`, `note` (texto opcional).
- **Status:** `novo` → `em_analise` → `em_desenvolvimento` → `resolvido` → `fechado`; também `reprovado_usuario` (reprovado pelo usuário) e status apenas de histórico (`resposta_admin`, `visualizado`).
- **nova_resposta flag:** admin marca `nova_resposta = true` ao registrar solução → usuário vê linha âmbar no SupportPage.
- **Fluxo de aprovação/reprovação (não-admin puro com `nova_resposta = true`):**
  - "OK com a Resposta" → RPC `approve_support_ticket(ticket_id)` → status = `fechado`, nova_resposta = false.
  - "Não OK" → textarea de comentário → RPC `reject_support_ticket(ticket_id, comment)` → status = `reprovado_usuario`, nova_resposta = false, salva comment em `support_ticket_history.note`.
- **Histórico de soluções:** quando admin altera o campo Solução, o frontend insere entrada com `status = 'resposta_admin'` e `note = nova_solução` no histórico. Texto longo exibido com truncamento + "ver mais".
- **Dashboard:** banner vermelho (admin puro) para tickets `novo`; banner laranja (admin puro) para `reprovado_usuario`; banner âmbar (não-admin puro) para `nova_resposta = true` do próprio usuário.
- **isSupportAdmin pattern:** `const isSupportAdmin = isAdmin && !user?.id` — admin puro tem `user.id = null`; admin+terapeuta tem `user.id` preenchido.
## Status Atendimento (`/admin/statusconsulta`)

- Flag `automatic = true` → não aparece no Select do `ConsultationFormModal`, mas **aparece** nos filtros de relatório e no prontuário
- Ações em lote do prontuário mostram **todos os status ativos** (incluindo automáticos)
- Flag `consumes_prepaid_session = true` → ao salvar/atualizar consulta com este status, debita automaticamente 1 sessão do pacote pré-pago do paciente (se especialidade for `PREPAID_PACKAGE`); exibido como chip verde "Consome pré-paga" na listagem de status
- Flags `requests_replacement_decision` e `is_scheduling_default` (migration 112) — ver seção "Reposição de Atendimentos" mais abaixo
- Flag `is_awaiting_outcome` (migration 115) — "Atendimento ainda não aconteceu" no `ConsultationStatusFormModal`; ver "Obrigatoriedade dos campos clínicos" abaixo e "Painéis mensais compartilhados" (Pendências)

### Flags de Observação (`shows_observation` / `requires_observation` — migration 110)

Substituem a antiga flag única `requires_objective_note` (migration 71). Duas flags distintas, exibidas no `ConsultationStatusFormModal` como **"Exibe Observação"** e **"Obrigatoriedade da Observação"** (a segunda só aparece/tem efeito quando a primeira está marcada):

- **`shows_observation = true`** — ao atribuir este status no `ConsultationFormModal`, oculta todos os campos clínicos (Objetivo Principal, Atividades, Relato/Evolução, Objetivo da Próxima Sessão, Orientações ao Responsável) e exibe apenas o campo **"Observação do Atendimento"** (`consultations.notes` / `consultation_series.notes`, migration 106).
- **`requires_observation`** — só importa quando `shows_observation = true`. `true` (default no banco) → "Observação do Atendimento" é obrigatória. `false` → opcional.
- Chips na listagem (`ConsultationStatusPage`): "Exibe observação" + "Observação obrigatória"/"Observação opcional" (só quando `shows_observation`).
- **Ação em lote no prontuário:** bloqueia atribuição em massa apenas quando `shows_observation && requires_observation` (observação individual seria obrigatória); quando `shows_observation && !requires_observation`, o lote é permitido normalmente.
- **PDFs de relatório** (Demonstrativo de Pagamento paciente/terapeuta): exibem a Observação do Atendimento como linha complementar apenas quando `shows_observation && requires_observation && notes` preenchido — ver seção "Relatórios PDF".

### Obrigatoriedade dos campos clínicos (`ConsultationFormModal`)

Quando o status selecionado **não** tem `shows_observation = true` **e não** tem `is_awaiting_outcome = true` (fluxo clínico normal, atendimento já ocorrido) e o atendimento é `event_type = 'SESSION'`:
- **"Objetivo Principal da Sessão"** e **"Relato da Sessão / Evolução"** são **sempre obrigatórios** (validação + `*` no label) — não depende mais do nome do status conter "realizada".
- **"Objetivo da Próxima Sessão"** é **sempre opcional**.
- Entrevistas (`event_type = 'INTERVIEW'`) não são bloqueadas por essa exigência.
- **`is_awaiting_outcome = true`** (migration 115 — ex.: "Agendada", "Confirmada") — **isenta** Objetivo/Relato da obrigatoriedade: o atendimento ainda não aconteceu, não faz sentido exigir relato de sessão para só corrigir um dado administrativo (ex.: horário) antes da data. Corrige um bug real: antes dessa flag, qualquer status "normal" (incluindo os de agendamento futuro) exigia Objetivo/Relato para qualquer salvamento, travando edições simples em atendimentos que ainda nem ocorreram. Pode ser marcada em vários status ao mesmo tempo (sem unicidade, diferente de `is_scheduling_default`).
- **Regra do Objetivo da Próxima Sessão:** ao salvar, se preenchido, `doReplicateObjective` propaga o texto como `mainObjective` do próximo atendimento agendado do mesmo paciente+terapeuta (busca por `is_awaiting_outcome`, não mais por texto); se vazio, não altera nada (nunca sobrescreve com string vazia, nunca bloqueia o salvamento).
- **Status inicial de novo atendimento** (`ConsultationFormModal`, `!isEdit`): prioriza o status com `is_scheduling_default = true`; se nenhum estiver configurado, cai no fallback antigo por texto (`name.includes('agendada')`) — mantém compatibilidade com ambientes que ainda não configuraram a flag.

## Reposição de Atendimentos

Quando um atendimento em edição recebe um status configurado com `requests_replacement_decision = true` (migration 112 — inicialmente ativado manualmente em "Falta do Terapeuta" e "Cancelada", nunca por nome), o `ConsultationFormModal` exige uma resposta explícita: **"Este atendimento terá reposição?"** (Sim/Não). A regra nunca depende do texto do status — só da flag.

- **Só se aplica em edição** (`isEdit === true`) e a `event_type === 'SESSION'` — criar um atendimento novo já com um desses status não pergunta sobre reposição.
- **Não** (`willHaveReplacement = false`): salva o atendimento normalmente, sem criar nada.
- **Sim** (`willHaveReplacement = true`): exibe a seção "Agendamento da Reposição" (Terapeuta, Data, Horário, Sala, Especialidade, Tipo de Atendimento, Terapeutas Participantes) pré-preenchida com os dados administrativos do original (paciente, terapeuta, especialidade, tipo, sala, participantes) — **exceto** data/horário, que ficam em branco e devem ser informados. Campos clínicos, Observação da falta/cancelamento, NF, faturamento e consumo pré-pago **nunca** são copiados.
- **Status inicial da reposição:** sempre o status com `is_scheduling_default = true` (migration 112) — nunca herda o status do original. Índice único parcial garante no máximo 1 status **ativo** com essa flag; se nenhum estiver configurado, o salvamento é bloqueado com mensagem clara.
- **Vínculo:** `replacement_for_consultation_id` (migration 113) é preenchido **só** no atendimento de reposição, apontando para o original. Índice único parcial garante **no máximo 1 reposição direta** por atendimento original — mas permite **cadeia** (`original → repl1 → repl2`, cada um aponta para um valor diferente), pois uma reposição também pode receber um status que solicita nova decisão de reposição.
- **Série:** a reposição nasce sempre via `addConsultation` (nunca `addConsultationSeries`), que não seta `series_id`/`series_original_date`/`is_series_exception` — portanto a reposição é sempre um atendimento avulso, e a série do original permanece intocada. O fluxo nunca passa por `proceedSave`/`doSave`/o diálogo "Apenas esta / Esta e as próximas".
- **Consistência (`DataContext.createConsultationReplacement`):** operação coordenada (não RPC) — cria a reposição primeiro via `addConsultation`; só em caso de sucesso atualiza o original (`updateConsultation` com o novo status + `willHaveReplacement=true`); se a atualização do original falhar, a reposição recém-criada é desfeita (`deleteConsultation`) — nunca fica um original marcado "terá reposição" sem que ela exista. Reaproveita 100% a lógica já existente de participantes (`consultation_therapists`), conflitos e pré-pago — nada duplicado em SQL.
- **Financeiro/pré-pago:** nenhuma regra paralela — a reposição só passa a consumir pacote pré-pago quando futuramente receber um status com `consumes_prepaid_session=true`, igual a qualquer atendimento. NF/faturamento nunca são copiados (nem fazem parte do payload de criação).
- **Decisão já existente:** se já há uma reposição vinculada (`consultations.find(c => c.replacementForConsultationId === original.id)`), a pergunta Sim/Não some e dá lugar a um card de resumo + botão "Abrir reposição" — impossível criar uma segunda reposição direta pela tela (e o índice único do banco garante isso mesmo por fora). Se a reposição vinculada for excluída depois, a pergunta reaparece automaticamente (o vínculo é sempre recalculado ao vivo, nunca lido de um cache separado).
- **Navegação:** prop `onNavigate(consultation)` no `ConsultationFormModal`, opcional — reaproveita o mesmo estado de visualização (`viewItem`/`viewConsultation`) já usado para a transição visualizar→editar em `AgendaPage.jsx`/`ConsultationsPage.jsx`/`MedicalRecordsPage.jsx`. Card "Ver atendimento original" aparece quando o registro aberto tem `replacementForConsultationId` preenchido.
- **Chips:** "Reposição" (cyan) no atendimento de reposição; "Reposição agendada" (teal) no original quando há vínculo. Sem chip "Sem reposição" persistente nos cards de lista (evita poluir a maioria dos cards de falta/cancelamento) — esse estado fica visível dentro do próprio modal.
- **Auditoria:** nenhuma chamada manual — os triggers genéricos de INSERT/UPDATE em `consultations` (migration 25/26/107) já cobrem a criação da reposição e a atualização do original.

## Gestão Financeira / Pacotes Pré-pagos

### Modalidades de Pagamento (`patient_specialties.payment_type`)

| Valor | Label | Campos usados |
|---|---|---|
| `POST_PER_SESSION` | Pós-pago por consulta | `patient_value`, `therapist_value` |
| `POST_MONTHLY` | Pós-pago mensal fixo | `monthly_patient_value`, `monthly_therapist_value` |
| `PREPAID_PACKAGE` | Pré-pago por pacote | `patient_value`, `therapist_value` (por sessão do pacote) |

- Configuração admin-only no `PatientFormModal` (seção de especialidades — cards)
- `companySettings.therapistDiscountPercent` → desconto sugerido ao preencher Valor Paciente
- `src/constants/paymentTypes.js` exporta `PAYMENT_TYPES`, `PAYMENT_TYPE_LABELS`, `PAYMENT_TYPE_OPTIONS`

### Tabelas do sistema pré-pago

| Tabela | Descrição |
|---|---|
| `patient_prepaid_packages` | Pacotes comprados — qty, valores, data, notas |
| `patient_prepaid_ledger` | Movimentações — CREDIT/DEBIT/ADJUSTMENT com `operation`, `created_by_name`, `consultation_id` |

### Operações do Ledger (`patient_prepaid_ledger.operation`)

| Valor | Origem | Tipo de entrada |
|---|---|---|
| `PACKAGE_PURCHASE` | Admin compra pacote | CREDIT (+N) |
| `CONSULTATION_ADD` | Nova consulta salva com status consumidor | DEBIT (-1) |
| `CONSULTATION_UPDATE` | Atualização de consulta que passou a ter status consumidor | DEBIT (-1) |
| `MANUAL_ADJUSTMENT` | Admin usa modal "Ajuste" | ADJUSTMENT (±N) |
| `AUTO_REVERSAL` | Status mudou para não-consumidor; ou consulta excluída; ou paciente/especialidade alterado | ADJUSTMENT (+1) |

- **Saldo** = soma de `sessions_quantity` em todos os registros (CREDIT=+N, DEBIT=-1, ADJUSTMENT=±N)
- **`created_by_name`** = snapshot do nome do responsável no momento do lançamento (via `therapists.name` onde `user_id = auth.uid()`)
- **`notes`** nos DEBITs automáticos contém: `Atendimento: DD/MM/YYYY às HH:MM | Terapeuta: X | Especialidade: Y | Status: Z`
- **Extrato** exibido em `PrepaidSection.jsx`:
  - **Desktop (md+):** tabela com colunas Data/Hora Registro | Tipo | Sessões | Responsável | Atendimento | Observação
  - **Mobile:** cards compactos empilhados
  - Coluna "Atendimento": resolvida via JOIN `consultations(id, date, time, specialty, consultation_status_id, therapist_id)` no `getPrepaidData`; fallback para snapshot em `notes` se consulta foi excluída
  - Coluna "Tipo": usa snapshot frozen do campo `notes` (regex `| Status: NomeDoStatus` para DEBIT; `Status alterado para: X` para REVERSAL). **Nunca usa o status live** — evita que o label mude quando o status da consulta for alterado futuramente
  - Observação: exibe `notes` apenas quando não é texto auto-gerado (oculta "Atendimento:..." e "Estorno automático...")

### Flag `consultations.prepaid_session_consumed`

- `true` = aquela consulta efetivamente debitou 1 sessão do pacote pré-pago
- Atualizado automaticamente por `handlePrepaidConsumption` no DataContext
- Nunca editável manualmente
- Exibido como chip read-only no `ConsultationFormModal`
- Backfill: migration 69 marca `true` para consultas que já possuem DEBIT no ledger
- Se consulta for excluída com `prepaid_session_consumed = true` → `deleteConsultation` insere estorno `AUTO_REVERSAL` automaticamente

### Princípio append-only do ledger

**CRÍTICO:** `patient_prepaid_ledger` é append-only — jamais fazer UPDATE ou upsert por `consultation_id`.

- `consultation_id` no ledger é **FK de rastreabilidade**, não chave única; uma mesma consulta pode ter múltiplas linhas (DEBIT, depois REVERSAL, depois DEBIT novamente)
- **Source of truth** para "a consulta está consumindo sessão agora" = `consultations.prepaid_session_consumed` (não uma query ao ledger)
- `handlePrepaidConsumption` recebe `oldConsumed` como parâmetro e implementa matriz de decisão:
  - `oldConsumed=false + newShouldConsume=true` → INSERT DEBIT (-1), seta `prepaid_session_consumed = true`
  - `oldConsumed=true + newShouldConsume=false` → INSERT REVERSAL (+1), seta `prepaid_session_consumed = false`
  - estados iguais → sem ação
- **`addConsultation`**: passa `oldConsumed: false` (nova consulta nunca consumiu); `await`s a chamada
- **`updateConsultation`**: lê `prepaid_session_consumed` do banco ANTES de aplicar o UPDATE principal → passa como `oldConsumed`; `await`s a chamada. Isso evita race condition onde a leitura dentro da função veria o valor desatualizado
- `handlePrepaidConsumption` **não lê** `prepaid_session_consumed` do banco internamente — usa apenas o `oldConsumed` recebido como parâmetro
- **Fix de audit duplicado:** `handlePrepaidConsumption` só executa o segundo UPDATE (`prepaid_session_consumed = false`) quando `effectiveOld = true` — evita UPDATE desnecessário (e log duplicado) quando o valor já é false. `effectiveOld = patientChanged ? false : oldConsumed`.

### Relatórios PDF com tipos de pagamento (`generateReportPDF.js`)

- `POST_PER_SESSION`: coluna Valor mostra valor por consulta; totalizado no rodapé
- `POST_MONTHLY`: coluna Valor mostra "Mensal"; total calculado por pares únicos (especialidade × mês) × `monthlyValue`
- `PREPAID_PACKAGE`: coluna Valor mostra "Pré-pago" (relatório do terapeuta usa `therapistValue` se definido)
- Rodapé com totais detalhados quando há mix de modalidades no período

## Consultas (`/admin/consultas`)

- Status Atendimento: filtra automáticos no formulário (só mostra manuais)
- Campos Horário (time) e Sala no formulário
- Card na listagem: Paciente, Especialidade, Status, Tipo / Data + Hora, Terapeuta, Sala
- Editar/excluir: visível apenas para o terapeuta responsável ou admin
- **Visibilidade para terapeutas:** lista inclui consultas onde o terapeuta é primário **ou** participante secundário em `consultation_therapists`
- **Filtro de mês:** botões Mês-2 / Mês-1 / Mês Atual / Mês+1 acima da barra de busca; `filterDateFrom`/`filterDateTo` com padrão = mês corrente. Filtro aplicado sobre `c.date` na listagem.
- **Toggle "Meus Atendimentos":** visível apenas para admin que também é terapeuta (`canFilterMine = isAdmin && !!user?.id`); padrão `false`; filtra consultas onde o admin é primário ou secundário. Terapeutas já têm filtro implícito — toggle não é exibido para eles.
- **Chips visuais no card:** chip indigo FiRepeat para série regular (`seriesId && !isSeriesException`); chip amber FiRepeat+`!` para ocorrência alterada individualmente (`seriesId && isSeriesException`); chip 👥 N (azul) com tooltip dos nomes para múltiplos terapeutas (`consultationTherapists.length > 1`); chip vermelho `⚠ Conflito` quando `(c.conflicts || []).length > 0`.
- **Campos obrigatórios quando status = "Realizada":** Objetivo da Sessão, Relato da Sessão / Evolução, Objetivo da Próxima Sessão
- **Seção Terapeutas Adicionais (ConsultationFormModal):** lista de terapeutas secundários com select de terapeuta + especialidade; visível para admin e terapeuta principal; read-only em modo visualização. Validações: sem duplicatas, sem mesmo que primário, sem múltiplos PREPAID_PACKAGE.
- **Permissões por perfil de terapeuta:**
  - `isAdminOrTeam = isAdmin || user?.belongsToTeam` — campo `belongs_to_team` no `therapists`
  - Campo Terapeuta (primário): editável apenas por `isAdminOrTeam`; terapeuta fora da equipe vê read-only (só pode salvar para si mesmo)
  - Terapeutas Adicionais: `canManageSecondary = isAdmin || (user?.belongsToTeam && user?.id === form.therapistId)`
  - Botão "Série": visível para `isAdminOrTeam` (admin OU membro da equipe); admin puro (`user.id = null`) também vê o botão
  - Validação: se há secundários, o primário deve ser da equipe (`belongsToTeam`)
  - Diálogo de escopo na edição de série: exibido para admin **ou** para o próprio terapeuta primário (`user?.id === initial.therapistId`)
- **Seção Nota Fiscal / Faturamento (ConsultationFormModal):** visível apenas em edição quando admin ou quando a consulta já tem NF. Admin pode editar Número da NF e Data de Emissão; terapeuta vê read-only. Exibe status anterior (antes do faturamento) quando `previous_status_before_invoice` está preenchido.
- **Sala:** obrigatória para `event_type === 'SESSION'` e para `event_type === 'INTERVIEW' && interviewFormat === 'PRESENTIAL'`; opcional para entrevistas remotas.
- **Tipo de Atendimento:** campo oculto quando `event_type === 'INTERVIEW'`; sem validação nesse caso.
- **`onEditRequest` prop:** quando definido, o rodapé em modo `readOnly` exibe botão "Editar" que invoca a callback — usado pela `AgendaPage` para transicionar do modal view-only para o formulário de edição.

### Entrevistas

- **`event_type`:** `SESSION` (padrão) ou `INTERVIEW`. Selecionável no `ConsultationFormModal` e `SeriesFormModal`.
- **`interview_format`:** `PRESENTIAL` ou `REMOTE` — exibido apenas quando `event_type === 'INTERVIEW'`.
- **`meeting_platform` / `meeting_link`:** campos opcionais para entrevistas remotas.
- **`interviewee_name`:** obrigatório quando `event_type === 'INTERVIEW'`; campo de texto livre para nome(s) do(s) entrevistado(s).
- **Paciente:** opcional para entrevistas (label muda para "Paciente (opcional)"; sem validação de campo vazio quando `event_type === 'INTERVIEW'`).
- **Impacto financeiro:** zero — entrevistas não afetam ledger pré-pago, faturamento nem demonstrativos. `filterConsultations` em `ReportsPage` exclui `event_type === 'INTERVIEW'` de ambos os tipos de relatório PDF.
- **Chips visuais (laranja):** chip "Entrevista" (`bg-orange-50 text-orange-700`); chip adicional "Remota" para `interview_format === 'REMOTE'`. Exibidos nos cards de `ConsultationsPage` e `AgendaPage`.
- **Título do card:** usa `intervieweeName` quando preenchido; cai para `patient.fullName` se não houver.
- **Conflitos:** entrevistas REMOTE são isentas de `ROOM_OVERLAP` e `THERAPIST_UNAVAILABLE_PARTIAL` (FLEX). Entrevistas PRESENTIAL seguem as mesmas regras de sessão.

## Pagamentos / Notas Fiscais (`/admin/pagamentos`)

- **Acesso:** admin only (`PaymentsPage.jsx`).
- **Filtros:** botões Mês-2 / Mês-1 / Mês Atual (padrão = mês corrente) + busca livre (NF ou nome do paciente) + status (ISSUED/PAID/CANCELLED/Todos) + período manual (dateFrom/dateTo). Container `max-w-5xl`.
- **StatusBadge:** ISSUED=azul, PAID=verde, CANCELLED=cinza.
- **InvoiceCard:** paciente, período/mês, total, status, número/data da NF; botões Ver detalhes / Marcar como Pago / Cancelar NF (Marcar Pago e Cancelar só para ISSUED).
- **InvoiceDetailModal:** snapshot completo — paciente, período, NF, total, lista de consultas (data/hora/especialidade/terapeuta/status/valor), data de geração.
- **Cancelar NF (`cancelPaymentInvoice`):** restaura `previous_status_before_invoice` em cada consulta, limpa `nf_number`/`nf_issue_date`, muda invoice para CANCELLED. Confirmação modal antes.
- **Marcar como Pago (`markInvoicePaid`):** busca status cujo nome contenha "pago" (case-insensitive), atualiza consultas e invoice para PAID. Confirmação modal antes.
- Estado local atualizado otimisticamente após ações de cancelar/pagar.
- **Exportação (botões no header):**
  - **PDF Resumo** — `generatePaymentSummaryPDF()`: tabela com todas as faturas não-canceladas filtradas (NF, Paciente, Período, Status, Emissão, Total) + total geral no rodapé; ordenadas da mais antiga para a mais nova por `created_at`.
  - **PDF Detalhado** — `generatePaymentDetailPDF()`: mesma listagem com linha de cabeçalho azul por fatura + tabela de atendimentos do snapshot; faturas canceladas excluídas.
  - **CSV** — `handleExportCSV()`: colunas NF, Paciente, Período, Status, Data Emissão, Total, Atendimentos, Data Geração; BOM UTF-8 para compatibilidade com Excel; separador `;`.
  - Todos os três respeitam os filtros ativos na tela; botões desabilitados se não houver faturas.
- **`src/utils/generatePaymentReportPDF.js`** — gerador dos dois PDFs; usa `autoTable(doc, opts)` (padrão funcional do projeto, não `doc.autoTable`).

## Agenda (`/admin/agenda`)

- Usa a tabela `consultations` (appointments não é usada)
- 6 colunas: Seg/Ter/Qua/Qui/Sex + Sáb-Dom; mobile: abas
- Card: `HH:MM - PrimeiroNome Ultimo` (ou `intervieweeName` para entrevistas) + sala em 10px
- Coluna Sáb-Dom: coluna única; day label (Sáb/Dom) embutido na primeira linha do card junto ao horário — sem linha separada.
- Legenda inferior exibe nome completo do terapeuta
- **Botão "Série" (`FiRepeat`):** visível apenas para admin (`isAdmin`). Terapeutas sem perfil admin não têm acesso a séries.
- **Toggle "Minha Agenda":** visível para qualquer usuário com `user.id` preenchido (`canFilterMine = !!user?.id`); padrão `true` para não-admin (terapeutas veem só os seus por padrão), `false` para admin. Ao ativar, `filterConsultation` exige que o usuário seja primário ou participante secundário (`consultationTherapists`).
- **Chips visuais nos cards de consulta:** desktop — `bg-white/25`; mobile — `bg-indigo-50`/`bg-amber-50`/`bg-blue-50`/`bg-orange-50`. Semântica: indigo = série, amber+`!` = ocorrência alterada, 👥 N = múltiplos terapeutas, vermelho `⚠` = conflito, laranja "Entrevista" = `event_type === 'INTERVIEW'`, laranja "Remota" = entrevista remota. Chips de série/múltiplos terapeutas/entrevista exibidos apenas quando `!isPrivate`; chip de conflito sempre visível.
- **Chips visuais nos BlockCards (bloqueios):** chip `⚠` vermelho pequeno quando `consultations.some(c => c.conflicts.some(cf => !cf.resolved && cf.calendarBlockId === block.id))`. Desktop: inline na linha de chips do BlockCard. Mobile: chip "⚠ Conflito" na linha de badges abaixo do tipo RIGID/FLEX.
- **Visualização rápida:** duplo-clique num card de consulta (desktop) ou toque simples (mobile) abre `ConsultationFormModal` com `readOnly=true` + `onEditRequest` que fecha o modal de visualização e abre o de edição. Mesmo comportamento para `BlockCard` via `CalendarBlockFormModal` com props `viewOnly=true` + `onEditRequest`. Estados: `viewItem` e `viewBlock` em `AgendaPage`.
- **`CalendarBlockFormModal` `viewOnly` prop:** desabilita todos os inputs; exibe rodapé simplificado com "Fechar" e "Editar" (quando `onEditRequest` definido); oculta seção de recorrência.

## CRM de Contatos (`/admin/contatos`)

- `ContactPage` grava em `contact_leads` via Supabase anon
- Status: `novo` (vermelho), `em_contato` (amarelo), `agendado` (azul), `convertido` (verde), `sem_interesse` (cinza)
- Dashboard: banner vermelho clicável quando há leads `novo`
- Sidebar: badge vermelho com contagem de `novo`
- **Campos adicionais do formulário público:** `patient_name` (nome do filho/paciente — opcional), `contact_reason` (motivo: Agendamento de avaliação / Informações sobre terapias / Valores e formas de pagamento / Convênios/reembolso / Dúvidas gerais / Outro), `referred_by` (quem indicou — só visível/gravado quando `how_found` = "Indicação médica" ou "Indicação de amigos/família")

## Auditoria de Acesso (`/admin/auditoria`)

- Triggers AFTER em todas as tabelas principais + tabelas de configuração → `fn_audit_log` SECURITY DEFINER
- **resource_name por tabela:**
  - `patients`, `guardians`, `therapists` → `full_name`
  - `consultations` → `"Paciente: X | Data/Hora: DD/MM/YYYY HH:MM | Especialidade: Y | Terapeuta: Z | Tipo: W | Sala: K | Status: S"` (migration 77; JOIN em patients, therapists, specialties, appointment_types, rooms, consultation_statuses; cada JOIN em bloco EXCEPTION individual; campos ausentes exibidos como `—`)
  - `consultation_series` → `"Paciente | Especialidade | Início: DD/MM/YYYY"` (migration 81)
  - `consultation_therapists` → `"Paciente | DD/MM/YYYY | Terapeuta"` (migration 81)
  - `medical_record_exams` → `"Paciente | Exames"`
  - `medical_record_medications` → `"Paciente | Medicamentos"`
  - `medical_record_conducts` → `"Paciente | Conduta"`
  - tabelas de config (specialties, payment_methods, diagnoses, etc.) → `name` ou `label`
  - demais → `date::TEXT` ou vazio
- **user_name:** coluna `user_name TEXT` em `audit_logs` — resolvida por `fn_audit_log` com prioridade: nome do terapeuta (via `therapists.name`) → `user_metadata.full_name` → `user_metadata.name` → email
- **VIEW** registrado via RPC `log_view_audit(resource_type, resource_id TEXT, resource_name)` — parametro resource_id e TEXT (nao UUID) para compatibilidade com PostgREST; GRANT para authenticated e anon
- **LOGIN** registrado via RPC `log_session_audit(p_type)` chamada pelo AuthContext — p_type: `login` (formulario) ou `sessao_retomada` (token salvo no browser); refreshes silenciosos de token nao sao logados
- `AuditPage`: só admin; filtros por ação, recurso, usuário (select dinâmico mostra nomes, filtra por email), data e texto (busca em resource_name)
- **Retenção em dois níveis:**
  - `audit_logs` → 90 dias (acesso pelo painel)
  - `audit_logs_history` → de 90 dias a 1 ano (arquivo; mesmo schema + `archived_at`)
  - Cron diário 03:00 UTC: `maintain_audit_logs()` SECURITY DEFINER move registros >90 dias para history e purga history >1 ano
  - pg_cron job: `maintain-audit-logs` (substitui `cleanup-audit-logs`)
## Contadores nas páginas de configuração

- **Especialidades:** `N paciente(s)` — conta `patients` onde `patient.specialties.some(s => s.key === specialtyKey)`
- **Formas de Pagamento:** `N paciente(s)` — conta `patients` com `paymentMethodId === pm.id`
- **Diagnósticos:** `N paciente(s)` — conta `patients` onde `conditionIds.includes(d.id)` OR `p.diagnosis === d.name` (inclui diagnóstico principal)
- **Status do Paciente:** `N paciente(s)` — conta `patients` com `statusId === status.id`
- **Tipos de Atendimento:** `N atendimento(s) (últimos 30 dias)` — conta `consultations` com `appointmentTypeId === type.id` e `date >= hoje-30d`
- **Status Atendimento:** `N atendimento(s) (últimos 30 dias)` — conta `consultations` com `consultationStatusId === status.id` e `date >= hoje-30d`
- **Salas:** `N atendimento(s) nos últimos 30 dias` — conta `consultations` com `roomId === room.id` e `date >= hoje-30d`

## Recorrência de Atendimentos

### Modelo de dados

- **`consultation_series`** — metadados da série; cada atendimento gerado tem `series_id` apontando para ela.
- **`consultations.series_id`** — FK para a série (nullable; NULL = atendimento avulso).
- **`consultations.series_original_date`** — data original planejada pela série; preservada mesmo se o atendimento for reagendado.
- **`consultations.is_series_exception`** — `true` quando o atendimento foi editado individualmente e não reflete mais os dados da série.

### Tipos de recorrência (`recurrence_type`)

| Valor | Termina quando |
|---|---|
| `by_count` | Após `session_count` ocorrências |
| `by_date` | Quando `date > end_date` |

- `recurrence_days` — array ISO weekday (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 7=Dom).
- Um dia único = recorrência semanal; múltiplos dias = duas ou mais vezes por semana.

### Regras de edição de série

- **"Apenas este atendimento"** — altera somente aquela ocorrência; marca `is_series_exception = true`.
- **"Este e os próximos"** — altera ocorrências com `date >= data_da_ocorrência_selecionada`; admin only na Fase 1.
- Atendimentos passados nunca são alterados em lote.
- Atendimentos com `nf_number` preenchido são protegidos de edição em lote.

### UX

- Criar série: modal separado `SeriesFormModal` (não embutido no `ConsultationFormModal`).
- Botão "Série" (`FiRepeat`) — visível apenas para **admin** (`isAdmin`) em **Agenda** e em **Atendimentos** (`ConsultationsPage`). Terapeutas sem perfil admin não veem o botão.
- Ao editar atendimento de série: o diálogo "Apenas esta / Esta e as próximas" é exibido apenas para admin (`canShowSeriesDialog = hasSeries && isAdmin`). Quando há mudança em campos estruturais (`time`, `roomId`, `appointmentTypeId`, `therapistId`, `specialty`). Alterações somente em campos de nota (Objetivo, Relato, Objetivo da Próxima) são salvas diretamente sem perguntar escopo — nota é sempre individual. Terapeutas salvam a consulta diretamente como exceção individual (`is_series_exception = true`) sem diálogo.
- Chip roxo "Consulta recorrente" exibido no `ConsultationFormModal` quando `initial.seriesId` presente.
- Exclusão da lista: se `seriesId` presente → modal com opções "Apenas este" / "Este e os próximos" (`seriesDeleteConfirm`).
- **Chips de recorrência nos cards (Agenda e ConsultationsPage):** indigo FiRepeat = série regular; amber FiRepeat+`!` = ocorrência alterada individualmente; 👥 N = múltiplos terapeutas com tooltip de nomes.

### `addConsultationSeries` (DataContext)

- Gera datas via `generateSeriesDates` (`src/utils/dateUtils.js`)
- Cria `consultation_series` (inclui `event_type`, `interview_format`, `meeting_platform`, `meeting_link`, `interviewee_name`) → bulk insert `consultations` (com `series_id` e mesmos campos de entrevista) → bulk insert `consultation_therapists` (terapeuta principal, `is_primary = true`) → fetch completo com `CONSULTATION_SELECT` → atualiza estado local
- **Chama `handlePrepaidConsumption`** para cada consulta gerada quando `status.consumesPrepaidSession === true` e a especialidade do paciente é `PREPAID_PACKAGE` e `eventType === 'SESSION'` — espelha o comportamento de `addConsultation`; passa `oldConsumed: false` (série nova nunca consumiu antes)
- Retorna `{ series, consultations, count }` ou `{ error }`

### `generateSeriesDates` (`src/utils/dateUtils.js`)

- Parâmetros: `{ recurrenceType, recurrenceDays, startDate, endDate, sessionCount }`
- Cap de 500 datas e 5 anos à frente de `startDate`
- Dias passados são incluídos (UI avisa mas não bloqueia)

## Detecção e Sinalização de Conflitos de Agenda

### Princípios

- **Conflitos são alertas, não bloqueios.** O usuário pode salvar mesmo com conflitos detectados (confirmação prévia).
- Duração fixa de `CONFLICT_DURATION = 50` minutos por atendimento para cálculo de sobreposição.
- Algoritmo de sobreposição: `startA < endB && endA > startB` (em minutos desde meia-noite).

### Tipos de conflito (`conflict_type`)

| Tipo | Descrição |
|---|---|
| `THERAPIST_OVERLAP` | Terapeuta já tem outro atendimento no mesmo horário |
| `ROOM_OVERLAP` | Sala já está ocupada no mesmo horário |
| `THERAPIST_UNAVAILABLE_TOTAL` | Terapeuta tem bloqueio rígido (RIGID) que cobre o horário |
| `THERAPIST_UNAVAILABLE_PARTIAL` | Terapeuta tem bloqueio flex (FLEX) que se sobrepõe |

- Conflitos cobrem o terapeuta primário **e** todos os secundários (`consultationTherapists`).
- Conflito de sala apenas quando a sala está definida em ambos os atendimentos **e** a sala não tem `allowsMultiplePatients = true` (migration 111) — salas de múltiplos pacientes nunca geram `ROOM_OVERLAP`, mas conflito de terapeuta e bloqueios continuam sendo avaliados normalmente.

### `conflictUtils.js` (`src/utils/conflictUtils.js`)

- `CONFLICT_DURATION` — constante 50 (minutos)
- `CONFLICT_LABELS` — mapa tipo → label legível em PT-BR
- `detectConflicts(input, allConsultations, calendarBlocks = [], rooms = [])` — retorna array de conflitos para um único atendimento; entrevistas REMOTE isentas de `ROOM_OVERLAP` e `THERAPIST_UNAVAILABLE_PARTIAL`; `rooms` usado para checar `allowsMultiplePatients` da sala do atendimento antes de gerar `ROOM_OVERLAP`
- `detectSeriesConflicts(seriesInput, dates, allConsultations, calendarBlocks = [], rooms = [])` — retorna `[{ date, conflicts[] }]` filtrado para datas com conflito; passa `eventType`, `interviewFormat` e `rooms` para cada chamada interna de `detectConflicts`
- `getCalendarBlockConflicts(block, consultations)` — retorna consultas em conflito com um bloqueio específico (não gera `ROOM_OVERLAP`, não usa `rooms`)
- Todo call-site de `detectConflicts`/`detectSeriesConflicts` (`ConsultationFormModal`, `SeriesFormModal`, `ConsultationsPage`, `AgendaPage`, `DataContext.rebuildRelatedConflicts`) passa `rooms` do `useData()`/state do provider — garante que a regra de sala múltipla vale em avulso, série, edição de ocorrência e reconstrução de conflitos relacionados.
- `buildConflictTooltip(conflicts, { therapists, rooms, patients, consultations, calendarBlocks })` — produz frases ricas em PT-BR com data DD/MM/YYYY, intervalo de horário, tipo do evento (Atendimento / Entrevista Presencial / Entrevista Remota), nome do paciente ou entrevistado, terapeuta; ex.: "⚠ Ana Paula já possui Atendimento de Helena em 22/05/2026 das 08:30 às 09:20."

### DataContext — novos valores e funções

- `calendarBlocks` — array de bloqueios ativos (não cancelados) carregado no `fetchAll`; disponível via `useData()`
- `persistConflicts(consultationId, conflicts[])` — chama RPC `persist_consultation_conflicts` (SECURITY DEFINER); substitui conflitos do atendimento atomicamente
- `rebuildRelatedConflicts(relatedIds, updatedConsultations, blocksOverride?)` — reprocessa conflitos de atendimentos afetados; `blocksOverride` permite passar o array de bloqueios atualizado sincronamente antes do React re-renderizar (evita race condition após setState)
- `addCalendarBlock(data)` — cria bloqueio avulso; após salvar, reconstrói conflitos das consultas afetadas
- `addCalendarBlockSeries(data)` — cria série de bloqueios via `generateSeriesDates`; reconstrói conflitos de todas as datas geradas
- `updateCalendarBlock(id, data)` — edita bloqueio individual; reconstrói conflitos das consultas na(s) data(s) afetada(s)
- `updateCalendarBlockSeriesFuture(seriesId, fromDate, data)` — edita bloqueios da série a partir de uma data; reconstrói conflitos de todas as datas afetadas
- `cancelCalendarBlock(id)` — soft-delete individual (`cancelled=true`); reconstrói conflitos das consultas na data do bloqueio
- `cancelCalendarBlockSeriesFuture(seriesId, fromDate)` — cancela bloqueios futuros da série; reconstrói conflitos
- `getCalendarBlockHistory(therapistId?)` — busca todos os bloqueios incluindo cancelados (sem filtro de `cancelled`); usado pelo `CalendarBlockHistoryModal`

### Fluxo de salvamento com conflitos

**Atendimento avulso (`ConsultationFormModal`):**
1. `handleSave` valida o formulário.
2. Detecta conflitos via `detectConflicts`.
3. Se conflitos → exibe bloco âmbar inline com lista + botões "Cancelar" / "Salvar mesmo assim".
4. Usuário confirma → `proceedSave(conflicts)` → segue para diálogo de série (se aplicável) → salva.

**Série (`SeriesFormModal`):**
1. `handleSave` detecta via `detectSeriesConflicts` por data.
2. Se conflitos → exibe bloco scrollável com conflitos por data + botões "Cancelar" / "Criar mesmo assim".
3. Usuário confirma → chama `addConsultationSeries` com `conflictsPerDate`.

### Chips visuais

- **`⚠ Conflito` em consultas** — chip vermelho nos cards de `ConsultationsPage` e `AgendaPage` quando `(c.conflicts || []).length > 0`.
- **`⚠` em bloqueios** — chip vermelho no `BlockCard` quando alguma consulta tem conflito com `calendarBlockId === block.id`.
- Chips de série/múltiplos terapeutas e de conflito coexistem na mesma linha de badges.

### Bloqueios de Agenda (`CalendarBlockFormModal`, `CalendarBlockHistoryModal`)

- Entidade independente — não está embutida no cadastro do terapeuta.
- Botão "Bloqueio" (`FiSlash`) no header da `AgendaPage`; abre `CalendarBlockFormModal`.
- Tipos: **RIGID** (cinza escuro — bloqueio forte, ex: aula, ausência) e **FLEX** (cinza médio — alerta, ex: reunião, home office).
- Suporta criação avulsa ou em série (reutiliza `generateSeriesDates`).
- Edição de série: diálogo de escopo "Apenas este" / "Este e os próximos".
- **Soft-delete**: cancelamento via `cancelled=true` (nunca DELETE físico); bloqueios cancelados não aparecem na agenda mas ficam no histórico.
- Ao criar/editar/cancelar, exibe aviso âmbar com nomes dos pacientes afetados **antes** de salvar.
- Após salvar, reconstrói automaticamente os conflitos das consultas afetadas (`rebuildRelatedConflicts`).
- `CalendarBlockHistoryModal`: listagem de todos os bloqueios (ativos + cancelados) com botões Editar e Cancelar por linha (cancelamento sempre individual, nunca em série). Filtros: busca por descrição/terapeuta, status (Todos/Ativo/Cancelado), tipo (Todos/Rígido/Flex), terapeuta (admin only), botões de mês Mês-2/Mês-1/Mês Atual/Mês+1 + intervalo de datas manual; padrão = mês corrente.
- Cards na Agenda: cinza escuro (RIGID) / cinza médio (FLEX), linha 2 exibe chip de cor do terapeuta + nome.
- Admin gerencia qualquer bloqueio; terapeuta gerencia apenas os próprios.

## Múltiplos Terapeutas por Atendimento

### Modelo de dados

- **`consultation_therapists`** — participantes de um atendimento; sempre existe exatamente 1 `is_primary = true`.
- **`consultations.therapist_id`** — mantido por compatibilidade; espelha o `therapist_id` do registro `is_primary = true`.
- **`consultations.specialty`** — mantido por compatibilidade; espelha a `specialty` do participante primário.
- `consultationTherapists[]` no app = todos os participantes mapeados de `consultation_therapists`.

### Regras

- O terapeuta principal define a cor do card na agenda e permanece em `consultations.therapist_id`.
- A especialidade de cada participante fica em `consultation_therapists.specialty`; impacta valor do paciente e cálculo do demonstrativo.
- Múltiplas especialidades `PREPAID_PACKAGE` no mesmo atendimento são bloqueadas na Fase 1 (UI impede).
- `handlePrepaidConsumption` opera apenas sobre `consultations.specialty` (especialidade principal) por enquanto.

### Status de implementação

- **Agenda:** ✅ filtro por terapeuta inclui participações em `consultation_therapists` (`AgendaPage.filterConsultation`).
- **Relatório por terapeuta:** ✅ busca inclui consultas onde o terapeuta é participante secundário; `effectiveSpecialty` resolve a especialidade correta para valor e label.
- **Demonstrativo:** ✅ terapeutas secundários expandidos como entradas adicionais de cobrança no PDF.
- **Pré-pago com múltiplas especialidades:** ⏳ pendente (Fase 6 — não implementada). UI ainda bloqueia múltiplos PREPAID_PACKAGE no mesmo atendimento.

## Atenção — SELECTs explícitos no DataContext

`CONSULTATION_SELECT` lista colunas explicitamente. Ao adicionar novas colunas ao banco, **sempre incluir no SELECT** correspondente.
Constantes: `PATIENT_SELECT` (inclui `patient_specialties(specialty, patient_value, therapist_value)`), `GUARDIAN_SELECT`, `CONSULTATION_SELECT` (inclui `event_type, interview_format, meeting_platform, meeting_link, interviewee_name`, `consultation_activities(...)`, `consultation_therapists(id, therapist_id, specialty, is_primary)` e `consultation_conflicts(id, conflict_type, related_consultation_id, therapist_id, room_id, calendar_block_id, conflict_date, start_time, end_time, description, resolved)`).

## Especialidades (tabela `specialties` no banco)

- Campos: `key` (identificador único, ex: `MUSICOTERAPIA`) e `label` (nome exibido)
- `SpecialtyFormModal` gera o `key` automaticamente a partir do `label`
- `key` aceita apenas letras maiúsculas, números e `_`

## Formas de Pagamento (`/admin/formapagamento`)

- Campo **Ordem** (`display_order`, migration 109) — numérico inteiro opcional; único quando preenchido (índice único parcial `WHERE display_order IS NOT NULL`, valores nulos podem se repetir). Validado no frontend (`PaymentMethodFormModal`: inteiro, checagem de duplicidade local) e garantido no banco; erro de unicidade (`23505`) é traduzido para mensagem em português (`paymentMethodOrderError` no DataContext) em vez do erro técnico do Postgres.
- **Ordenação:** `sortPaymentMethods` (`src/utils/paymentMethodUtils.js`) — registros com Ordem primeiro (crescente, desempate por nome), depois os sem Ordem (alfabético). Aplicada centralizadamente no DataContext (`fetchAll`, `addPaymentMethod`, `updatePaymentMethod`), então **todo** consumidor de `paymentMethods` via `useData()` já recebe a lista ordenada (cadastro/edição de paciente, Busca Avançada, listagem de Formas de Pagamento) sem precisar reordenar.
- Chip "Ordem N" exibido na listagem (`PaymentMethodsPage`) quando preenchido.

## Salas (`/admin/salas`)

- Flag **"Permite múltiplos pacientes simultaneamente"** (`allows_multiple_patients`, migration 111) — checkbox no `RoomFormModal`; chip azul "Múltiplos pacientes" na listagem quando ativo. Ver seção "Detecção e Sinalização de Conflitos de Agenda" para o efeito na detecção de `ROOM_OVERLAP`.

## Deploy

- **Vercel** — conectado ao GitHub (branch `main`), deploy automático no push
- `vercel.json` com rewrite `/* → /index.html` para SPA routing
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no Vercel
- Edge Functions (deploy individual):
  - `npx supabase functions deploy invite-therapist --project-ref ffkkgmikvsqhutftoajh`
  - `npx supabase functions deploy suggest-convenio --project-ref ffkkgmikvsqhutftoajh`
  - `npx supabase functions deploy dashboard-greeting --project-ref ffkkgmikvsqhutftoajh`

## Política de Senha Forte (ResetPasswordPage)

Regras validadas em tempo real: mínimo 8 chars, maiúscula, minúscula, número, caractere especial. Botão desabilitado até todas passarem.

## Dívida Técnica Conhecida — Duplicações entre Avulso e Série

Identificadas durante a implementação das migrations 108-111 (anamnese, ordem de forma de pagamento, flags de observação, sala múltipla) — documentadas, não refatoradas:

- `ConsultationFormModal.validate()` e `SeriesFormModal.validate()` implementam regras de terapeutas secundários (duplicata, sem múltiplos PREPAID_PACKAGE) em paralelo e de forma independente — risco de divergência se uma regra mudar em só um dos dois.
- O bloco de aviso de "Modalidade de Pagamento" (azul/âmbar, saldo pré-pago) é praticamente idêntico entre `ConsultationFormModal.jsx` e `SeriesFormModal.jsx` — copiado, não compartilhado.
- `applyFieldCleanup` (limpeza de campos clínicos vs. Observação conforme `shows_observation`) só existe em `ConsultationFormModal`; não há equivalente centralizado caso outro fluxo precise da mesma regra.
- `detectConflicts`/`detectSeriesConflicts` já são um bom exemplo de compartilhamento (ver `conflictUtils.js`) — usar como referência para uma futura extração de um hook `useConsultationFormShared({ patientId, specialty, therapistId })` cobrindo os pontos acima.
- A seção "Agendamento da Reposição" (Reposição de Atendimentos) reaproveita inline os mesmos `Select`s de terapeuta/especialidade/sala/tipo já usados em "Dados do Atendimento" no mesmo arquivo — candidato ao mesmo hook/fieldset compartilhado acima, se um terceiro fluxo similar aparecer.
- Existem 3 pontos com busca textual por `"agend"` no nome do status (`ConsultationFormModal.jsx` — status padrão de novo atendimento e `doReplicateObjective`; `DashboardPage.jsx` — `agendadaIds`) que **não** foram migrados para a nova flag explícita `is_scheduling_default` (migration 112) — ficaram fora do escopo da Reposição de Atendimentos por prudência (mudaria comportamento hoje estabelecido em telas não solicitadas). Migrá-los para a flag explícita é candidato de backlog natural, já que a flag existe e resolveria a fragilidade.