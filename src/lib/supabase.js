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
    secondaryTherapistIds: [],
    conditionIds: (row.patient_conditions || []).map(r => r.diagnosis_id),
    specialties: (row.patient_specialties || []).map(r => r.specialty),
    externalTherapists: (row.patient_external_therapists || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(r => ({ id: r.id, name: r.name, specialty: r.specialty || '', phone: r.phone || '' })),
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
    email: row.email || '',
    cpf: row.cpf || '',
    occupation: row.occupation || '',
    notes: row.notes || '',
    neighborhood: row.neighborhood || '',
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
    therapistSpecialties: (row.therapist_specialties || []).map(s => ({
      specialty: s.specialty,
      credential: s.credential || '',
    })),
    active: row.active,
    createdAt: row.created_at,
  }
}

export function mapAppointment(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    therapistId: row.therapist_id,
    roomId: row.room_id,
    specialty: row.specialty,
    date: row.date,
    time: row.time,
    duration: row.duration,
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
    createdAt: row.created_at,
  }
}

export function mapConsultationStatus(row) {
  return { id: row.id, name: row.name, color: row.color, active: row.active, automatic: row.automatic || false }
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
  return { id: row.id, key: row.key, label: row.label, active: row.active }
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
  return { id: row.id, name: row.name, description: row.description || '', active: row.active }
}


// ─── Helpers para salvar relações de paciente ─────────────────────────────────

export async function syncPatientRelations(patientId, data) {
  const ops = []

  if (data.specialties !== undefined) {
    ops.push(
      supabase.from('patient_specialties').delete().eq('patient_id', patientId),
    )
    if (data.specialties.length) {
      ops.push(
        supabase.from('patient_specialties').insert(
          data.specialties.map(s => ({ patient_id: patientId, specialty: s }))
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
      valid.map(s => ({ therapist_id: therapistId, specialty: s.specialty, credential: s.credential || null }))
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
