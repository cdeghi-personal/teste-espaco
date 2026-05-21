import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Mappers: DB (snake_case) → App (camelCase) ──────────────────────────────

export function mapPatient(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    sex: row.sex,
    cpf: row.cpf || '',
    rg: row.rg || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
    indication: row.indication || '',
    schoolName: row.school_name || '',
    schoolPhone: row.school_phone || '',
    schoolAddress: row.school_address || '',
    schoolNeighborhood: row.school_neighborhood || '',
    schoolCity: row.school_city || '',
    schoolState: row.school_state || '',
    schoolZip: row.school_zip || '',
    schoolCoordinator: row.school_coordinator || '',
    doctorInsurance: row.doctor_insurance || '',
    doctorName: row.doctor_name || '',
    doctorSpecialty: row.doctor_specialty || '',
    doctorPhone: row.doctor_phone || '',
    diagnosis: row.diagnosis || '',
    notes: row.notes || '',
    statusId: row.status_id,
    paymentMethodId: row.payment_method_id,
    therapistId: row.primary_therapist_id,
    involvedTherapistIds: (row.patient_involved_therapists || []).map(r => r.therapist_id),
    conditionIds: (row.patient_conditions || []).map(r => r.diagnosis_id),
    specialties: (row.patient_specialties || []).map(r => ({
      key: r.specialty,
      patientValue: r.patient_value ?? null,
      therapistValue: r.therapist_value ?? null,
      paymentType: r.payment_type || 'POST_PER_SESSION',
      monthlyPatientValue: r.monthly_patient_value ?? null,
      monthlyTherapistValue: r.monthly_therapist_value ?? null,
      paymentNotes: r.payment_notes || '',
    })),
    externalTherapists: (row.patient_external_therapists || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(r => ({ id: r.id, name: r.name, specialty: r.specialty || '', phone: r.phone || '' })),
    needsConvenioReport: row.needs_convenio_report || false,
    deleted: row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapGuardian(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    relationship: row.relationship,
    phone: row.phone || '',
    phone2: row.phone2 || '',
    email: row.email || '',
    cpf: row.cpf || '',
    rg: row.rg || '',
    occupation: row.occupation || '',
    notes: row.notes || '',
    address: row.address || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    cep: row.cep || '',
    active: row.active,
    patientIds: (row.patient_guardians || []).map(r => r.patient_id),
    createdAt: row.created_at,
  }
}

export function mapTherapist(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    specialty: row.specialty,
    email: row.email || '',
    phone: row.phone || '',
    cpf: row.cpf || '',
    bio: row.bio || '',
    credential: row.credential || '',
    bank: row.bank || '',
    agency: row.agency || '',
    accountNumber: row.account_number || '',
    pixKey: row.pix_key || '',
    color: row.color || '',
    therapistSpecialties: (row.therapist_specialties || []).map(s => ({
      specialty: s.specialty,
      credential: s.credential || '',
      canBeRt: s.can_be_rt || false,
    })),
    belongsToTeam: row.belongs_to_team || false,
    active: row.active,
    createdAt: row.created_at,
  }
}

function addMinutes(timeStr, minutes) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + (minutes || 50)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function mapAppointment(row) {
  const startTime = row.time || ''
  const duration = row.duration || 50
  return {
    id: row.id,
    patientId: row.patient_id,
    therapistId: row.therapist_id,
    roomId: row.room_id,
    specialty: row.specialty,
    date: row.date,
    time: startTime,
    startTime,
    endTime: addMinutes(startTime, duration),
    duration,
    status: row.status,
    notes: row.notes || '',
    consultationId: row.consultation_id,
    createdAt: row.created_at,
  }
}

export function mapConsultation(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    therapistId: row.therapist_id,
    specialty: row.specialty,
    date: row.date,
    sessionNumber: row.session_number,
    consultationStatusId: row.consultation_status_id,
    appointmentTypeId: row.appointment_type_id,
    time: row.time || '',
    roomId: row.room_id || null,
    mainObjective: row.main_objective || '',
    evolutionNotes: row.evolution_notes || '',
    nextObjectives: row.next_objectives || '',
    guardianFeedback: row.guardian_feedback || '',
    sessionQuality: row.session_quality,
    activities: (row.consultation_activities || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(a => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        outcome: a.outcome,
      })),
    prepaidSessionConsumed: row.prepaid_session_consumed || false,
    nfNumber: row.nf_number || null,
    nfIssueDate: row.nf_issue_date || null,
    previousStatusBeforeInvoice: row.previous_status_before_invoice || null,
    // Série recorrente
    seriesId: row.series_id || null,
    seriesOriginalDate: row.series_original_date || null,
    isSeriesException: row.is_series_exception || false,
    // Terapeutas participantes (inclui o principal com isPrimary=true)
    consultationTherapists: (row.consultation_therapists || []).map(t => ({
      id: t.id,
      therapistId: t.therapist_id,
      specialty: t.specialty,
      isPrimary: t.is_primary || false,
    })),
    conflicts: (row.consultation_conflicts || [])
      .filter(c => !c.resolved)
      .map(c => ({
        id: c.id,
        conflictType: c.conflict_type,
        relatedConsultationId: c.related_consultation_id || null,
        therapistId: c.therapist_id || null,
        roomId: c.room_id || null,
        calendarBlockId: c.calendar_block_id || null,
        conflictDate: c.conflict_date,
        startTime: c.start_time,
        endTime: c.end_time,
        description: c.description || '',
      })),
    createdAt: row.created_at,
  }
}

export function mapConsultationSeries(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    primaryTherapistId: row.primary_therapist_id,
    specialty: row.specialty,
    appointmentTypeId: row.appointment_type_id,
    consultationStatusId: row.consultation_status_id,
    roomId: row.room_id || null,
    time: row.time || '',
    duration: row.duration || null,
    recurrenceType: row.recurrence_type,
    recurrenceDays: row.recurrence_days || [],
    startDate: row.start_date,
    endDate: row.end_date || null,
    sessionCount: row.session_count || null,
    active: row.active !== false,
    notes: row.notes || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapCalendarBlock(row) {
  return {
    id: row.id,
    seriesId: row.series_id || null,
    therapistId: row.therapist_id,
    blockType: row.block_type,
    description: row.description || '',
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    seriesOriginalDate: row.series_original_date || null,
    isSeriesException: row.is_series_exception || false,
    active: row.active !== false,
    cancelled: row.cancelled || false,
    cancelledAt: row.cancelled_at || null,
    cancelledBy: row.cancelled_by || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
  }
}

export function mapCalendarBlockSeries(row) {
  return {
    id: row.id,
    therapistId: row.therapist_id,
    blockType: row.block_type,
    description: row.description || '',
    startDate: row.start_date,
    endDate: row.end_date || null,
    recurrenceType: row.recurrence_type || null,
    recurrenceDays: row.recurrence_days || [],
    sessionCount: row.session_count || null,
    startTime: row.start_time,
    endTime: row.end_time,
    active: row.active !== false,
    cancelled: row.cancelled || false,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
  }
}

export function mapConsultationStatus(row) {
  return { id: row.id, name: row.name, color: row.color, active: row.active, automatic: row.automatic || false, consumesPrepaidSession: row.consumes_prepaid_session || false, requiresObjectiveNote: row.requires_objective_note || false }
}

export function mapAppointmentType(row) {
  return { id: row.id, name: row.name, active: row.active }
}

export function mapExam(row) {
  return {
    id: row.id,
    medicalRecordId: row.medical_record_id,
    description: row.description,
    examDate: row.exam_date || '',
    attachmentUrl: row.attachment_url || '',
    notes: row.notes || '',
    createdAt: row.created_at,
  }
}

export function mapMedication(row) {
  return {
    id: row.id,
    medicalRecordId: row.medical_record_id,
    medication: row.medication,
    registrationDate: row.registration_date,
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at,
  }
}

export function mapConduct(row) {
  return {
    id: row.id,
    medicalRecordId: row.medical_record_id,
    therapistId: row.therapist_id,
    therapistName: row.therapist?.name || '',
    specialty: row.specialty || '',
    conduct: row.conduct || '',
    objective: row.objective || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    status: row.status,
    createdAt: row.created_at,
  }
}

export function mapSpecialty(row) {
  return { id: row.id, key: row.key, label: row.label, color: row.color || '', active: row.active }
}

export function mapPaymentMethod(row) {
  return { id: row.id, name: row.name, active: row.active }
}

export function mapDiagnosis(row) {
  return { id: row.id, name: row.name, active: row.active }
}

export function mapPatientStatus(row) {
  return { id: row.id, name: row.name, color: row.color, active: row.active }
}

export function mapRoom(row) {
  return { id: row.id, name: row.name, description: row.description || '', color: row.color || '', active: row.active }
}


// ─── Helpers para salvar relações de paciente ─────────────────────────────────

export async function syncPatientRelations(patientId, data) {
  const ops = []
  const toNum = v => { const n = parseFloat(v); return (v === '' || v == null || isNaN(n)) ? null : n }
  const VALID_PT = ['POST_PER_SESSION', 'POST_MONTHLY', 'PREPAID_PACKAGE', 'PAY_PER_SESSION']

  if (data.specialties !== undefined) {
    ops.push(
      supabase.from('patient_specialties').delete().eq('patient_id', patientId),
    )
    if (data.specialties.length) {
      ops.push(
        supabase.from('patient_specialties').insert(
          data.specialties.map(s => ({
            patient_id: patientId,
            specialty: s.key ?? s,
            patient_value: toNum(s.patientValue),
            therapist_value: toNum(s.therapistValue),
            payment_type: VALID_PT.includes(s.paymentType) ? s.paymentType : 'POST_PER_SESSION',
            monthly_patient_value: toNum(s.monthlyPatientValue),
            monthly_therapist_value: toNum(s.monthlyTherapistValue),
            payment_notes: s.paymentNotes || null,
          }))
        )
      )
    }
  }

  if (data.conditionIds !== undefined) {
    ops.push(
      supabase.from('patient_conditions').delete().eq('patient_id', patientId)
    )
    if (data.conditionIds.length) {
      ops.push(
        supabase.from('patient_conditions').insert(
          data.conditionIds.map(did => ({ patient_id: patientId, diagnosis_id: did }))
        )
      )
    }
  }

  for (const op of ops) await op
}

export async function syncGuardianPatients(guardianId, patientIds = []) {
  await supabase.from('patient_guardians').delete().eq('guardian_id', guardianId)
  if (patientIds.length) {
    await supabase.from('patient_guardians').insert(
      patientIds.map(pid => ({ guardian_id: guardianId, patient_id: pid }))
    )
  }
}

export async function syncTherapistSpecialties(therapistId, specialties = []) {
  await supabase.from('therapist_specialties').delete().eq('therapist_id', therapistId)
  const valid = specialties.filter(s => s.specialty)
  if (valid.length) {
    await supabase.from('therapist_specialties').insert(
      valid.map(s => ({
        therapist_id: therapistId,
        specialty: s.specialty,
        credential: s.credential || null,
        can_be_rt: s.canBeRt || false,
      }))
    )
  }
}

export async function syncInvolvedTherapists(patientId, therapistIds = []) {
  await supabase.from('patient_involved_therapists').delete().eq('patient_id', patientId)
  if (therapistIds.length) {
    await supabase.from('patient_involved_therapists').insert(
      therapistIds.map(tid => ({ patient_id: patientId, therapist_id: tid }))
    )
  }
}

export async function syncExternalTherapists(patientId, externalTherapists = []) {
  await supabase.from('patient_external_therapists').delete().eq('patient_id', patientId)
  const valid = externalTherapists.filter(t => t.name?.trim())
  if (valid.length) {
    await supabase.from('patient_external_therapists').insert(
      valid.map((t, i) => ({
        patient_id: patientId,
        name: t.name.trim(),
        specialty: t.specialty || null,
        phone: t.phone || null,
        sort_order: i,
      }))
    )
  }
}
