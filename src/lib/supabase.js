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
    diagnosis: row.diagnosis || '',
    notes: row.notes || '',
    statusId: row.status_id,
    paymentMethodId: row.payment_method_id,
    therapistId: row.primary_therapist_id,
    secondaryTherapistIds: (row.patient_secondary_therapists || []).map(r => r.therapist_id),
    conditionIds: (row.patient_conditions || []).map(r => r.diagnosis_id),
    specialties: (row.patient_specialties || []).map(r => r.specialty),
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
    bio: row.bio || '',
    credential: row.credential || '',
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

  if (data.secondaryTherapistIds !== undefined) {
    ops.push(
      supabase.from('patient_secondary_therapists').delete().eq('patient_id', patientId)
    )
    if (data.secondaryTherapistIds.length) {
      ops.push(
        supabase.from('patient_secondary_therapists').insert(
          data.secondaryTherapistIds.map(tid => ({ patient_id: patientId, therapist_id: tid }))
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
