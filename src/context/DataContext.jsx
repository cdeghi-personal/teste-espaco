import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  supabase,
  mapPatient, mapGuardian, mapTherapist, mapAppointment, mapConsultation, mapConsultationSeries,
  mapCalendarBlock, mapCalendarBlockSeries,
  mapSpecialty, mapPaymentMethod, mapDiagnosis, mapPatientStatus, mapRoom,
  mapConsultationStatus, mapAppointmentType, mapExam, mapMedication, mapConduct,
  syncPatientRelations, syncGuardianPatients,
  syncTherapistSpecialties, syncExternalTherapists, syncInvolvedTherapists,
} from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { generateSeriesDates } from '../utils/dateUtils'
import { detectConflicts } from '../utils/conflictUtils'

function dbError(error, toast) {
  const msg = error?.message || 'Erro ao salvar. Tente novamente.'
  console.error('[DataContext]', error)
  if (toast) toast.show(msg)
  return { error: msg }
}

const DataContext = createContext(null)

// ─── Queries de fetch ─────────────────────────────────────────────────────────

const PATIENT_SELECT = `
  id, full_name, date_of_birth, sex, cpf, rg, phone, email,
  address, neighborhood, city, state, zip_code, indication,
  school_name, school_phone, school_coordinator,
  doctor_insurance, doctor_name, doctor_specialty, doctor_phone,
  diagnosis, notes, deleted, needs_convenio_report,
  status_id, payment_method_id, primary_therapist_id, created_at, updated_at,
  patient_specialties(specialty, patient_value, therapist_value, payment_type, monthly_patient_value, monthly_therapist_value, payment_notes),
  patient_conditions(diagnosis_id),
  patient_external_therapists(id, name, specialty, phone, sort_order),
  patient_involved_therapists(therapist_id)
`

// Fallback para quando a migração 12 ainda não foi aplicada
const PATIENT_SELECT_FALLBACK = `
  id, full_name, date_of_birth, sex, cpf, rg, phone, email,
  address, neighborhood, city, state, zip_code, indication,
  school_name, school_phone, school_coordinator,
  doctor_insurance, doctor_name, doctor_specialty, doctor_phone,
  diagnosis, notes, deleted, needs_convenio_report,
  status_id, payment_method_id, primary_therapist_id, created_at, updated_at,
  patient_specialties(specialty, patient_value, therapist_value, payment_type, monthly_patient_value, monthly_therapist_value, payment_notes),
  patient_conditions(diagnosis_id),
  patient_external_therapists(id, name, specialty, phone, sort_order)
`

const GUARDIAN_SELECT = `
  id, full_name, relationship, phone, phone2, email, cpf, rg, occupation, notes,
  address, neighborhood, city, state, cep, active, created_at, is_financial_responsible,
  patient_guardians(patient_id)
`

const CONSULTATION_SELECT = `
  id, patient_id, therapist_id, specialty, date, time, room_id, session_number,
  consultation_status_id, appointment_type_id, prepaid_session_consumed,
  nf_number, nf_issue_date, previous_status_before_invoice,
  series_id, series_original_date, is_series_exception,
  event_type, interview_format, meeting_platform, meeting_link, interviewee_name,
  main_objective, evolution_notes, next_objectives, guardian_feedback,
  session_quality, created_at,
  consultation_activities(id, name, description, outcome, sort_order),
  consultation_therapists(id, therapist_id, specialty, is_primary),
  consultation_conflicts!consultation_id(id, conflict_type, related_consultation_id, therapist_id, room_id, calendar_block_id, conflict_date, start_time, end_time, description, resolved)
`

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }) {
  const toast = useToast()
  const [patients, setPatients] = useState([])
  const [guardians, setGuardians] = useState([])
  const [appointments, setAppointments] = useState([])
  const [consultations, setConsultations] = useState([])
  const [therapists, setTherapists] = useState([])
  const [specialtiesData, setSpecialtiesData] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [patientStatuses, setPatientStatuses] = useState([])
  const [rooms, setRooms] = useState([])
  const [consultationStatuses, setConsultationStatuses] = useState([])
  const [appointmentTypes, setAppointmentTypes] = useState([])
  const [ageRanges, setAgeRanges] = useState([])
  const [companySettings, setCompanySettings] = useState({ razaoSocial: '', cnpj: '', aiSystemPrompt: '', cnes: '', therapistDiscountPercent: 0 })
  const [calendarBlocks, setCalendarBlocks] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    // Janela de 12 meses passados + 12 meses futuros para limitar o volume carregado em memória
    // e contornar o max_rows=1000 do PostgREST sem precisar buscar toda a base.
    const _now = new Date()
    const _from = new Date(_now); _from.setMonth(_from.getMonth() - 12)
    const _to   = new Date(_now); _to.setMonth(_to.getMonth() + 12)
    const _consultDateFrom = _from.toISOString().slice(0, 10)
    const _consultDateTo   = _to.toISOString().slice(0, 10)

    const [
      patientsRes, guardiansRes, appointmentsRes, consultationsRes,
      therapistsRes, specialtiesRes, paymentRes, diagnosesRes, statusesRes, roomsRes, consultStatusRes, apptTypesRes, ageRangesRes, companyRes, calendarBlocksRes,
    ] = await Promise.all([
      supabase.from('patients').select(PATIENT_SELECT).eq('deleted', false).then(res => {
        // Se a query falhar (ex: tabela patient_involved_therapists ainda não existe),
        // tenta sem a relação para não quebrar o carregamento
        if (res.error) {
          return supabase.from('patients').select(PATIENT_SELECT_FALLBACK).eq('deleted', false)
        }
        return res
      }),
      supabase.from('guardians').select(GUARDIAN_SELECT),
      supabase.from('appointments').select('*').order('date').order('time'),
      supabase.from('consultations')
        .select(CONSULTATION_SELECT)
        .gte('date', _consultDateFrom)
        .lte('date', _consultDateTo)
        .order('date', { ascending: false })
        .limit(3000)
        .then(res => {
          if (res.error) {
            const SELECT_FALLBACK = CONSULTATION_SELECT
              .replace(/,\s*consultation_conflicts[^(]*\([^)]*\)/, '')
            return supabase.from('consultations')
              .select(SELECT_FALLBACK)
              .gte('date', _consultDateFrom)
              .lte('date', _consultDateTo)
              .order('date', { ascending: false })
              .limit(3000)
          }
          return res
        }),
      supabase.from('therapists').select('*, therapist_specialties(specialty, credential, can_be_rt)').order('name'),
      supabase.from('specialties').select('*').order('label'),
      supabase.from('payment_methods').select('*').order('name'),
      supabase.from('diagnoses').select('*').order('name'),
      supabase.from('patient_statuses').select('*').order('name'),
      supabase.from('rooms').select('*').order('name'),
      supabase.from('consultation_statuses').select('*').order('name'),
      supabase.from('appointment_types').select('*').order('name'),
      supabase.from('age_ranges').select('*').order('min_age'),
      supabase.from('company_settings').select('razao_social, cnpj, ai_system_prompt, cnes, therapist_discount_percent').eq('id', 1).maybeSingle(),
      supabase.from('calendar_blocks').select('*').eq('cancelled', false).order('date', { ascending: false }),
    ])

    setPatients((patientsRes.data || []).map(mapPatient))
    setGuardians((guardiansRes.data || []).map(mapGuardian))
    setAppointments((appointmentsRes.data || []).map(mapAppointment))
    setConsultations((consultationsRes.data || []).map(mapConsultation))
    setTherapists((therapistsRes.data || []).map(mapTherapist))
    setSpecialtiesData((specialtiesRes.data || []).map(mapSpecialty))
    setPaymentMethods((paymentRes.data || []).map(mapPaymentMethod))
    setDiagnoses((diagnosesRes.data || []).map(mapDiagnosis))
    setPatientStatuses((statusesRes.data || []).map(mapPatientStatus))
    setRooms((roomsRes.data || []).map(mapRoom))
    setConsultationStatuses((consultStatusRes.data || []).map(mapConsultationStatus))
    setAppointmentTypes((apptTypesRes.data || []).map(mapAppointmentType))
    setAgeRanges((ageRangesRes.data || []).map(r => ({
      id: r.id, name: r.name, minAge: r.min_age, maxAge: r.max_age, color: r.color,
    })))
    if (companyRes.data) {
      setCompanySettings({
        razaoSocial: companyRes.data.razao_social || '',
        cnpj: companyRes.data.cnpj || '',
        aiSystemPrompt: companyRes.data.ai_system_prompt || '',
        cnes: companyRes.data.cnes || '',
        therapistDiscountPercent: companyRes.data.therapist_discount_percent ?? 0,
      })
    }
    setCalendarBlocks((calendarBlocksRes.data || []).map(mapCalendarBlock))
    setIsLoading(false)
  }, [])

  // Aguarda a sessão ser restaurada pelo Supabase (async no v2) antes de buscar dados.
  // INITIAL_SESSION = sessão restaurada do localStorage no reload
  // SIGNED_IN = login acabou de acontecer
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        fetchAll()
      }
    })
    return () => subscription.unsubscribe()
  }, [fetchAll])

  // ─── Conflict helpers ────────────────────────────────────────────────────────

  async function persistConflicts(consultationId, conflicts) {
    if (!consultationId || !conflicts) return
    try {
      await supabase.rpc('persist_consultation_conflicts', {
        p_consultation_id: consultationId,
        p_conflicts: JSON.stringify(conflicts.map(c => ({
          conflict_type: c.conflictType,
          related_consultation_id: c.relatedConsultationId || null,
          therapist_id: c.therapistId || null,
          room_id: c.roomId || null,
          calendar_block_id: c.calendarBlockId || null,
          conflict_date: c.conflictDate,
          start_time: c.startTime,
          end_time: c.endTime,
          description: c.description || null,
        }))),
      })
    } catch (err) {
      console.warn('[persistConflicts]', err)
    }
  }

  async function rebuildRelatedConflicts(relatedIds, updatedConsultations, blocksOverride) {
    const effectiveBlocks = blocksOverride !== undefined ? blocksOverride : calendarBlocks
    for (const relatedId of relatedIds) {
      const relatedC = updatedConsultations.find(c => c.id === relatedId)
      if (!relatedC) continue
      const relatedConflicts = detectConflicts(
        { id: relatedC.id, date: relatedC.date, time: relatedC.time, therapistId: relatedC.therapistId, roomId: relatedC.roomId, consultationTherapists: relatedC.consultationTherapists || [] },
        updatedConsultations,
        effectiveBlocks
      )
      await persistConflicts(relatedId, relatedConflicts)
      setConsultations(prev => prev.map(c => c.id === relatedId ? { ...c, conflicts: relatedConflicts } : c))
    }
  }

  // ─── Patients ───────────────────────────────────────────────────────────────

  async function addPatient(data) {
    const { data: inserted, error } = await supabase
      .from('patients')
      .insert({
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        sex: data.sex,
        cpf: data.cpf || null,
        rg: data.rg || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zipCode || null,
        indication: data.indication || null,
        school_name: data.schoolName || null,
        school_phone: data.schoolPhone || null,
        school_coordinator: data.schoolCoordinator || null,
        doctor_insurance: data.doctorInsurance || null,
        doctor_name: data.doctorName || null,
        doctor_specialty: data.doctorSpecialty || null,
        doctor_phone: data.doctorPhone || null,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        needs_convenio_report: data.needsConvenioReport || false,
        status_id: data.statusId || null,
        payment_method_id: data.paymentMethodId || null,
        primary_therapist_id: data.therapistId || null,
      })
      .select(PATIENT_SELECT)
      .single()

    if (error) return dbError(error, toast)

    await syncPatientRelations(inserted.id, {
      specialties: data.specialties || [],
      conditionIds: data.conditionIds || [],
    })
    await syncExternalTherapists(inserted.id, data.externalTherapists || [])
    await syncInvolvedTherapists(inserted.id, data.involvedTherapistIds || [])

    const newPatient = mapPatient({
      ...inserted,
      patient_specialties: (data.specialties || []).map(s => ({
        specialty: s.key ?? s,
        patient_value: s.patientValue ?? null,
        therapist_value: s.therapistValue ?? null,
        payment_type: s.paymentType || 'POST_PER_SESSION',
        monthly_patient_value: s.monthlyPatientValue ?? null,
        monthly_therapist_value: s.monthlyTherapistValue ?? null,
        payment_notes: s.paymentNotes || null,
      })),
      patient_conditions: (data.conditionIds || []).map(id => ({ diagnosis_id: id })),
      patient_external_therapists: (data.externalTherapists || []).map((t, i) => ({ ...t, sort_order: i })),
      patient_involved_therapists: (data.involvedTherapistIds || []).map(tid => ({ therapist_id: tid })),
    })
    setPatients(prev => [...prev, newPatient])
    return newPatient
  }

  async function recordPaymentHistoryIfChanged(patientId, oldSpecs, newSpecs) {
    const { data: { session } } = await supabase.auth.getSession()
    const changedBy = session?.user?.id || null
    const toNum = v => (v != null && v !== '') ? parseFloat(v) : null
    const rows = []
    for (const n of newSpecs) {
      const o = oldSpecs.find(x => x.key === n.key)
      const changed = !o ||
        (o.paymentType || 'POST_PER_SESSION') !== (n.paymentType || 'POST_PER_SESSION') ||
        String(o.patientValue ?? '') !== String(n.patientValue ?? '') ||
        String(o.therapistValue ?? '') !== String(n.therapistValue ?? '') ||
        String(o.monthlyPatientValue ?? '') !== String(n.monthlyPatientValue ?? '') ||
        String(o.monthlyTherapistValue ?? '') !== String(n.monthlyTherapistValue ?? '')
      if (changed) {
        rows.push({
          patient_id: patientId,
          specialty: n.key,
          old_payment_type: o?.paymentType || null,
          new_payment_type: n.paymentType || 'POST_PER_SESSION',
          old_patient_value: toNum(o?.patientValue),
          new_patient_value: toNum(n.patientValue),
          old_therapist_value: toNum(o?.therapistValue),
          new_therapist_value: toNum(n.therapistValue),
          old_monthly_patient_value: toNum(o?.monthlyPatientValue),
          new_monthly_patient_value: toNum(n.monthlyPatientValue),
          old_monthly_therapist_value: toNum(o?.monthlyTherapistValue),
          new_monthly_therapist_value: toNum(n.monthlyTherapistValue),
          changed_by: changedBy,
        })
      }
    }
    if (rows.length) {
      await supabase.from('patient_specialty_payment_history').insert(rows)
    }
  }

  async function updatePatient(id, data) {
    const update = {}
    if (data.fullName !== undefined) update.full_name = data.fullName
    if (data.dateOfBirth !== undefined) update.date_of_birth = data.dateOfBirth
    if (data.sex !== undefined) update.sex = data.sex
    if (data.cpf !== undefined) update.cpf = data.cpf || null
    if (data.rg !== undefined) update.rg = data.rg || null
    if (data.phone !== undefined) update.phone = data.phone || null
    if (data.email !== undefined) update.email = data.email || null
    if (data.address !== undefined) update.address = data.address || null
    if (data.neighborhood !== undefined) update.neighborhood = data.neighborhood || null
    if (data.city !== undefined) update.city = data.city || null
    if (data.state !== undefined) update.state = data.state || null
    if (data.zipCode !== undefined) update.zip_code = data.zipCode || null
    if (data.indication !== undefined) update.indication = data.indication || null
    if (data.schoolName !== undefined) update.school_name = data.schoolName || null
    if (data.schoolPhone !== undefined) update.school_phone = data.schoolPhone || null
    if (data.schoolCoordinator !== undefined) update.school_coordinator = data.schoolCoordinator || null
    if (data.doctorInsurance !== undefined) update.doctor_insurance = data.doctorInsurance || null
    if (data.doctorName !== undefined) update.doctor_name = data.doctorName || null
    if (data.doctorSpecialty !== undefined) update.doctor_specialty = data.doctorSpecialty || null
    if (data.doctorPhone !== undefined) update.doctor_phone = data.doctorPhone || null
    if (data.diagnosis !== undefined) update.diagnosis = data.diagnosis || null
    if (data.notes !== undefined) update.notes = data.notes || null
    if (data.needsConvenioReport !== undefined) update.needs_convenio_report = data.needsConvenioReport
    if (data.statusId !== undefined) update.status_id = data.statusId || null
    if (data.paymentMethodId !== undefined) update.payment_method_id = data.paymentMethodId || null
    if (data.therapistId !== undefined) update.primary_therapist_id = data.therapistId || null

    if (Object.keys(update).length) {
      update.updated_at = new Date().toISOString()
      const { error: updateError } = await supabase.from('patients').update(update).eq('id', id)
      if (updateError) throw new Error(updateError.message)
    }

    if (data.specialties !== undefined) {
      const current = patients.find(p => p.id === id)
      await recordPaymentHistoryIfChanged(id, current?.specialties || [], data.specialties)
    }

    await syncPatientRelations(id, {
      ...(data.specialties !== undefined && { specialties: data.specialties }),
      ...(data.conditionIds !== undefined && { conditionIds: data.conditionIds }),
    })
    if (data.externalTherapists !== undefined) {
      await syncExternalTherapists(id, data.externalTherapists)
    }
    if (data.involvedTherapistIds !== undefined) {
      await syncInvolvedTherapists(id, data.involvedTherapistIds)
    }

    // Re-read from DB after all sync operations to guarantee state reflects DB truth.
    const { data: fresh, error: freshError } = await supabase.from('patients').select(PATIENT_SELECT).eq('id', id).single()
    if (fresh && !freshError) {
      setPatients(prev => prev.map(p => p.id === id ? mapPatient(fresh) : p))
    } else {
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
    }
  }

  async function deletePatient(id) {
    const { data, error } = await supabase.rpc('admin_soft_delete_patient', { p_patient_id: id })
    if (error) { toast.show(error.message, 'error'); return { error: error.message } }
    if (data?.error) { toast.show(data.error, 'error'); return { error: data.error } }
    setPatients(prev => prev.filter(p => p.id !== id))
  }

  async function restorePatient(id) {
    await supabase.from('patients').update({ deleted: false }).eq('id', id)
    // Refetch para trazer de volta
    const { data } = await supabase.from('patients').select(PATIENT_SELECT).eq('id', id).single()
    if (data) setPatients(prev => [...prev, mapPatient(data)])
  }

  function getPatientById(id) {
    return patients.find(p => p.id === id)
  }

  async function fetchInactivePatients() {
    const { data } = await supabase
      .from('patients')
      .select(PATIENT_SELECT)
      .eq('deleted', true)
      .order('full_name')
    return (data || []).map(mapPatient)
  }

  // ─── Guardians ──────────────────────────────────────────────────────────────

  async function addGuardian(data) {
    // Gera UUID no frontend para evitar RETURNING * que falha na RLS de SELECT
    // (guardian recém criado não tem pacientes ainda, SELECT policy não passa)
    const newId = crypto.randomUUID()
    const { error } = await supabase
      .from('guardians')
      .insert({
        id: newId,
        full_name: data.fullName,
        relationship: data.relationship,
        phone: data.phone || null,
        phone2: data.phone2 || null,
        email: data.email || null,
        cpf: data.cpf || null,
        rg: data.rg || null,
        occupation: data.occupation || null,
        notes: data.notes || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        cep: data.cep || null,
        active: true,
        is_financial_responsible: data.isFinancialResponsible || false,
      })

    if (error) return dbError(error, toast)

    // Vincula pacientes; agora a SELECT policy já passa pois o guardian tem pacientes
    await syncGuardianPatients(newId, data.patientIds || [])

    const { data: fetched } = await supabase
      .from('guardians')
      .select(GUARDIAN_SELECT)
      .eq('id', newId)
      .single()

    const newGuardian = mapGuardian(fetched || { id: newId, ...data, patient_guardians: (data.patientIds || []).map(pid => ({ patient_id: pid })) })
    setGuardians(prev => [...prev, newGuardian])
    return newGuardian
  }

  async function updateGuardian(id, data) {
    const update = {}
    if (data.fullName !== undefined) update.full_name = data.fullName
    if (data.relationship !== undefined) update.relationship = data.relationship
    if (data.phone !== undefined) update.phone = data.phone || null
    if (data.phone2 !== undefined) update.phone2 = data.phone2 || null
    if (data.email !== undefined) update.email = data.email || null
    if (data.cpf !== undefined) update.cpf = data.cpf || null
    if (data.rg !== undefined) update.rg = data.rg || null
    if (data.occupation !== undefined) update.occupation = data.occupation || null
    if (data.notes !== undefined) update.notes = data.notes || null
    if (data.address !== undefined) update.address = data.address || null
    if (data.neighborhood !== undefined) update.neighborhood = data.neighborhood || null
    if (data.city !== undefined) update.city = data.city || null
    if (data.state !== undefined) update.state = data.state || null
    if (data.cep !== undefined) update.cep = data.cep || null
    if (data.active !== undefined) update.active = data.active
    if (data.isFinancialResponsible !== undefined) update.is_financial_responsible = data.isFinancialResponsible

    if (Object.keys(update).length) {
      const { error } = await supabase.from('guardians').update(update).eq('id', id)
      if (error) return dbError(error, toast)
    }

    if (data.patientIds !== undefined) {
      await syncGuardianPatients(id, data.patientIds)
    }

    setGuardians(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
  }

  async function deleteGuardian(id) {
    await supabase.from('guardians').update({ active: false }).eq('id', id)
    setGuardians(prev => prev.map(g => g.id === id ? { ...g, active: false } : g))
  }

  async function restoreGuardian(id) {
    await supabase.from('guardians').update({ active: true }).eq('id', id)
    setGuardians(prev => prev.map(g => g.id === id ? { ...g, active: true } : g))
  }

  function getGuardianById(id) {
    return guardians.find(g => g.id === id)
  }

  function getGuardiansForPatient(patientId) {
    return guardians.filter(g => g.active !== false && (g.patientIds || []).includes(patientId))
  }

  // ─── Appointments ───────────────────────────────────────────────────────────

  async function addAppointment(data) {
    const { data: inserted, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: data.patientId,
        therapist_id: data.therapistId,
        room_id: data.roomId || null,
        specialty: data.specialty,
        date: data.date,
        time: data.startTime || data.time,
        duration: (() => {
          if (data.startTime && data.endTime) {
            const [sh, sm] = data.startTime.split(':').map(Number)
            const [eh, em] = data.endTime.split(':').map(Number)
            const d = (eh * 60 + em) - (sh * 60 + sm)
            return d > 0 ? d : 50
          }
          return data.duration || 50
        })(),
        status: data.status || 'scheduled',
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) return dbError(error, toast)
    const newAppt = mapAppointment(inserted)
    setAppointments(prev => [...prev, newAppt])
    return newAppt
  }

  async function updateAppointment(id, data) {
    const update = {}
    if (data.patientId !== undefined) update.patient_id = data.patientId
    if (data.therapistId !== undefined) update.therapist_id = data.therapistId
    if (data.roomId !== undefined) update.room_id = data.roomId || null
    if (data.specialty !== undefined) update.specialty = data.specialty
    if (data.date !== undefined) update.date = data.date
    if (data.startTime !== undefined) update.time = data.startTime
    else if (data.time !== undefined) update.time = data.time
    if (data.startTime !== undefined && data.endTime !== undefined) {
      const [sh, sm] = data.startTime.split(':').map(Number)
      const [eh, em] = data.endTime.split(':').map(Number)
      const d = (eh * 60 + em) - (sh * 60 + sm)
      update.duration = d > 0 ? d : 50
    } else if (data.duration !== undefined) update.duration = data.duration
    if (data.status !== undefined) update.status = data.status
    if (data.notes !== undefined) update.notes = data.notes || null
    if (data.consultationId !== undefined) update.consultation_id = data.consultationId

    await supabase.from('appointments').update(update).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
  }

  async function deleteAppointment(id) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  // ─── Consultations ──────────────────────────────────────────────────────────

  // operation: 'CONSULTATION_ADD' | 'CONSULTATION_UPDATE'
  // oldConsumed MUST be read from DB BEFORE the main consultation update is applied by the caller
  async function handlePrepaidConsumption(consultationId, {
    oldConsumed,
    oldPatientId, oldSpecialty,
    newPatientId, newSpecialty, newStatusId,
    operation, date, time, therapistName, statusName,
  }) {
    const { data: { session } } = await supabase.auth.getSession()
    const createdBy = session?.user?.id || null
    const resolvedTherapist = therapists.find(t => t.userId === createdBy)
    const createdByName = resolvedTherapist?.name || null

    const fmtD = d => d ? d.split('-').reverse().join('/') : ''
    const atendNotes = `Atendimento: ${fmtD(date)}${time ? ' às ' + time.slice(0, 5) : ''} | Terapeuta: ${therapistName || '—'} | Especialidade: ${newSpecialty} | Status: ${statusName || '—'}`

    // Se paciente/especialidade mudou, estornar consumo anterior (se havia)
    const patientChanged = oldPatientId && (oldPatientId !== newPatientId || oldSpecialty !== newSpecialty)
    if (patientChanged && oldConsumed) {
      const { error: revErr } = await supabase.from('patient_prepaid_ledger').insert({
        patient_id: oldPatientId, specialty: oldSpecialty,
        consultation_id: consultationId, entry_type: 'ADJUSTMENT',
        sessions_quantity: 1, operation: 'AUTO_REVERSAL',
        notes: 'Estorno automático - Paciente/especialidade alterado',
        created_by: createdBy, created_by_name: createdByName,
      })
      if (revErr) {
        console.error('[PrepaidConsumption] INSERT AUTO_REVERSAL (patientChanged) error:', revErr)
        toast.show(`Erro ao estornar sessão pré-paga: ${revErr.message}`)
        return
      }
      await supabase.from('consultations').update({ prepaid_session_consumed: false }).eq('id', consultationId)
      setConsultations(prev => prev.map(c => c.id === consultationId ? { ...c, prepaidSessionConsumed: false } : c))
    }

    // Verificar se novo paciente+especialidade é pré-pago
    const patient = patients.find(p => p.id === newPatientId)
    if (!patient) return
    const patientSpec = (patient.specialties || []).find(s => s.key === newSpecialty)
    if (!patientSpec || patientSpec.paymentType !== 'PREPAID_PACKAGE') {
      if (patientChanged && oldConsumed) return // já estornou acima
      const effectiveOld = patientChanged ? false : oldConsumed
      if (effectiveOld) {
        await supabase.from('consultations').update({ prepaid_session_consumed: false }).eq('id', consultationId)
        setConsultations(prev => prev.map(c => c.id === consultationId ? { ...c, prepaidSessionConsumed: false } : c))
      }
      return
    }

    const status = consultationStatuses.find(s => s.id === newStatusId)
    const newShouldConsume = status?.consumesPrepaidSession === true
    // após mudança de paciente/especialidade, o estado já foi revertido acima
    const effectiveConsumed = patientChanged ? false : oldConsumed

    console.log('[PrepaidConsumption]', {
      consultationId, operation,
      oldConsumed, newShouldConsume, effectiveConsumed,
      patientChanged, statusName,
      ledgerAction: !effectiveConsumed && newShouldConsume ? 'DEBIT -1'
        : effectiveConsumed && !newShouldConsume ? 'REVERSAL +1'
        : 'no-op',
    })

    // Matriz de decisão append-only — nunca atualiza/reutiliza registros existentes do ledger
    if (!effectiveConsumed && newShouldConsume) {
      const { error: debitErr } = await supabase.from('patient_prepaid_ledger').insert({
        patient_id: newPatientId, specialty: newSpecialty,
        consultation_id: consultationId, entry_type: 'DEBIT',
        sessions_quantity: -1, operation,
        notes: atendNotes,
        created_by: createdBy, created_by_name: createdByName,
      })
      if (debitErr) {
        console.error('[PrepaidConsumption] INSERT DEBIT error:', debitErr)
        toast.show(`Erro ao debitar sessão pré-paga: ${debitErr.message}`)
        return
      }
      await supabase.from('consultations').update({ prepaid_session_consumed: true }).eq('id', consultationId)
      setConsultations(prev => prev.map(c => c.id === consultationId ? { ...c, prepaidSessionConsumed: true } : c))
    } else if (effectiveConsumed && !newShouldConsume) {
      const { error: revErr2 } = await supabase.from('patient_prepaid_ledger').insert({
        patient_id: newPatientId, specialty: newSpecialty,
        consultation_id: consultationId, entry_type: 'ADJUSTMENT',
        sessions_quantity: 1, operation: 'AUTO_REVERSAL',
        notes: `Estorno automático - Status alterado para: ${statusName || '—'}`,
        created_by: createdBy, created_by_name: createdByName,
      })
      if (revErr2) {
        console.error('[PrepaidConsumption] INSERT AUTO_REVERSAL error:', revErr2)
        toast.show(`Erro ao estornar sessão pré-paga: ${revErr2.message}`)
        return
      }
      await supabase.from('consultations').update({ prepaid_session_consumed: false }).eq('id', consultationId)
      setConsultations(prev => prev.map(c => c.id === consultationId ? { ...c, prepaidSessionConsumed: false } : c))
    }
    // effectiveConsumed === newShouldConsume → sem ação
  }

  async function addConsultation(data) {
    const { activities, appointmentId, secondaryTherapists, conflicts = [], ...rest } = data

    // Validação de segurança: terapeuta fora da equipe não pode registrar para outro terapeuta
    const { data: { session: _sess } } = await supabase.auth.getSession()
    const callerTherapist = therapists.find(t => t.userId === _sess?.user?.id)
    if (callerTherapist && !callerTherapist.belongsToTeam) {
      if (rest.therapistId && rest.therapistId !== callerTherapist.id) {
        return { error: 'Você não tem permissão para registrar atendimentos em nome de outro terapeuta.' }
      }
      if (secondaryTherapists?.length > 0) {
        return { error: 'Terapeutas fora da equipe não podem adicionar participantes adicionais ao atendimento.' }
      }
    }

    const { data: inserted, error } = await supabase
      .from('consultations')
      .insert({
        patient_id: rest.patientId || null,
        therapist_id: rest.therapistId,
        specialty: rest.specialty,
        date: rest.date,
        session_number: rest.sessionNumber || null,
        consultation_status_id: rest.consultationStatusId || null,
        appointment_type_id: rest.appointmentTypeId || null,
        time: rest.time || null,
        room_id: rest.roomId || null,
        event_type: rest.eventType || 'SESSION',
        interview_format: rest.interviewFormat || null,
        meeting_platform: rest.meetingPlatform || null,
        meeting_link: rest.meetingLink || null,
        interviewee_name: rest.intervieweeName || null,
        main_objective: rest.mainObjective || null,
        evolution_notes: rest.evolutionNotes || null,
        next_objectives: rest.nextObjectives || null,
        guardian_feedback: rest.guardianFeedback || null,
        session_quality: rest.sessionQuality || null,
      })
      .select()
      .single()

    if (error) return dbError(error, toast)

    let mappedActivities = []
    if (activities?.length) {
      const { data: acts } = await supabase
        .from('consultation_activities')
        .insert(
          activities.map((a, i) => ({
            consultation_id: inserted.id,
            name: a.name,
            description: a.description || null,
            outcome: a.outcome,
            sort_order: i,
          }))
        )
        .select()
      mappedActivities = (acts || []).map(a => ({
        id: a.id, name: a.name, description: a.description || '', outcome: a.outcome,
      }))
    }

    if (appointmentId) {
      await updateAppointment(appointmentId, { consultationId: inserted.id, status: 'completed' })
    }

    // Insere participation: terapeuta principal + secundários
    const ctRows = [
      { consultation_id: inserted.id, therapist_id: rest.therapistId, specialty: rest.specialty, is_primary: true },
      ...(secondaryTherapists || []).filter(t => t.therapistId && t.specialty).map(t => ({
        consultation_id: inserted.id, therapist_id: t.therapistId, specialty: t.specialty, is_primary: false,
      })),
    ]
    const { error: ctErr } = await supabase.from('consultation_therapists').insert(ctRows)
    if (ctErr) console.error('[addConsultation] consultation_therapists error:', ctErr)

    const localCTs = ctRows.map((ct, i) => ({
      id: `local-${i}`, therapistId: ct.therapist_id, specialty: ct.specialty, isPrimary: ct.is_primary,
    }))
    const newConsultation = { ...mapConsultation(inserted), activities: mappedActivities, consultationTherapists: localCTs, conflicts }
    setConsultations(prev => [newConsultation, ...prev])

    // Persiste conflitos e recalcula os relacionados
    await persistConflicts(inserted.id, conflicts)
    const relatedIds = [...new Set(conflicts.filter(c => c.relatedConsultationId).map(c => c.relatedConsultationId))]
    if (relatedIds.length > 0) {
      const updatedAll = [newConsultation, ...consultations]
      await rebuildRelatedConflicts(relatedIds, updatedAll)
    }

    if (rest.consultationStatusId && rest.eventType !== 'INTERVIEW') {
      const status = consultationStatuses.find(s => s.id === rest.consultationStatusId)
      const therapist = therapists.find(t => t.id === rest.therapistId)
      await handlePrepaidConsumption(inserted.id, {
        oldConsumed: false, // nova consulta, nunca consumiu
        newPatientId: rest.patientId, newSpecialty: rest.specialty,
        newStatusId: rest.consultationStatusId,
        operation: 'CONSULTATION_ADD',
        date: rest.date, time: rest.time,
        therapistName: therapist?.name, statusName: status?.name,
      })
    }
    return newConsultation
  }

  async function updateConsultation(id, data) {
    const { activities, secondaryTherapists, conflicts, ...rest } = data

    // Validação de segurança: terapeuta fora da equipe não pode alterar para outro terapeuta
    const { data: { session: _sessUpd } } = await supabase.auth.getSession()
    const callerTherapistUpd = therapists.find(t => t.userId === _sessUpd?.user?.id)
    if (callerTherapistUpd && !callerTherapistUpd.belongsToTeam) {
      if (rest.therapistId && rest.therapistId !== callerTherapistUpd.id) {
        return { error: 'Você não tem permissão para alterar o terapeuta principal para outro profissional.' }
      }
      if (secondaryTherapists?.length > 0) {
        return { error: 'Terapeutas fora da equipe não podem adicionar participantes adicionais ao atendimento.' }
      }
    }

    // Captura estado existente e oldConsumed ANTES do update para garantir leitura consistente
    const existing = consultations.find(c => c.id === id)
    let oldConsumed = false
    if (rest.consultationStatusId !== undefined && existing) {
      const { data: oldRow } = await supabase
        .from('consultations')
        .select('prepaid_session_consumed')
        .eq('id', id)
        .maybeSingle()
      oldConsumed = oldRow?.prepaid_session_consumed || false
    }

    const update = {}
    if (rest.patientId !== undefined) update.patient_id = rest.patientId || null
    if (rest.therapistId !== undefined) update.therapist_id = rest.therapistId
    if (rest.specialty !== undefined) update.specialty = rest.specialty
    if (rest.date !== undefined) update.date = rest.date
    if (rest.time !== undefined) update.time = rest.time || null
    if (rest.roomId !== undefined) update.room_id = rest.roomId || null
    if (rest.eventType !== undefined) update.event_type = rest.eventType || 'SESSION'
    if (rest.interviewFormat !== undefined) update.interview_format = rest.interviewFormat || null
    if (rest.meetingPlatform !== undefined) update.meeting_platform = rest.meetingPlatform || null
    if (rest.meetingLink !== undefined) update.meeting_link = rest.meetingLink || null
    if (rest.intervieweeName !== undefined) update.interviewee_name = rest.intervieweeName || null
    if (rest.sessionNumber !== undefined) update.session_number = rest.sessionNumber
    if (rest.consultationStatusId !== undefined) update.consultation_status_id = rest.consultationStatusId || null
    if (rest.appointmentTypeId !== undefined) update.appointment_type_id = rest.appointmentTypeId || null
    if (rest.mainObjective !== undefined) update.main_objective = rest.mainObjective
    if (rest.evolutionNotes !== undefined) update.evolution_notes = rest.evolutionNotes
    if (rest.nextObjectives !== undefined) update.next_objectives = rest.nextObjectives
    if (rest.guardianFeedback !== undefined) update.guardian_feedback = rest.guardianFeedback
    if (rest.sessionQuality !== undefined) update.session_quality = rest.sessionQuality
    if (rest.nfNumber !== undefined) update.nf_number = rest.nfNumber || null
    if (rest.nfIssueDate !== undefined) update.nf_issue_date = rest.nfIssueDate || null
    if (rest.isSeriesException !== undefined) update.is_series_exception = rest.isSeriesException

    if (Object.keys(update).length) {
      await supabase.from('consultations').update(update).eq('id', id)
    }

    if (activities !== undefined) {
      await supabase.from('consultation_activities').delete().eq('consultation_id', id)
      if (activities.length) {
        await supabase.from('consultation_activities').insert(
          activities.map((a, i) => ({
            consultation_id: id,
            name: a.name,
            description: a.description || null,
            outcome: a.outcome,
            sort_order: i,
          }))
        )
      }
    }

    // Sincroniza consultation_therapists quando terapeuta/especialidade/secundários mudam
    let newConsultationTherapists
    const shouldSyncCT = secondaryTherapists !== undefined || rest.therapistId !== undefined || rest.specialty !== undefined
    if (shouldSyncCT && existing) {
      const newPrimaryId = rest.therapistId || existing.therapistId
      const newSpecialty = rest.specialty || existing.specialty
      const secondaries = secondaryTherapists !== undefined
        ? secondaryTherapists.filter(t => t.therapistId && t.specialty)
        : (existing.consultationTherapists || []).filter(t => !t.isPrimary)
      const ctRows = [
        { consultation_id: id, therapist_id: newPrimaryId, specialty: newSpecialty, is_primary: true },
        ...secondaries.map(t => ({ consultation_id: id, therapist_id: t.therapistId, specialty: t.specialty, is_primary: false })),
      ]
      await supabase.from('consultation_therapists').delete().eq('consultation_id', id)
      if (ctRows.length) await supabase.from('consultation_therapists').insert(ctRows)
      newConsultationTherapists = ctRows.map((ct, i) => ({
        id: `local-ct-${i}`, therapistId: ct.therapist_id, specialty: ct.specialty, isPrimary: ct.is_primary,
      }))
    }

    setConsultations(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, ...rest }
      if (activities !== undefined) updated.activities = activities
      if (newConsultationTherapists !== undefined) updated.consultationTherapists = newConsultationTherapists
      if (conflicts !== undefined) updated.conflicts = conflicts
      return updated
    }))

    // Persiste conflitos recalculados
    if (conflicts !== undefined) {
      await persistConflicts(id, conflicts)
      // Recalcula relacionados (antigos + novos)
      const oldRelated = (existing?.conflicts || []).filter(c => c.relatedConsultationId).map(c => c.relatedConsultationId)
      const newRelated = (conflicts || []).filter(c => c.relatedConsultationId).map(c => c.relatedConsultationId)
      const allRelated = [...new Set([...oldRelated, ...newRelated])]
      if (allRelated.length > 0) {
        const updatedAll = consultations.map(c => c.id === id ? { ...c, ...rest, conflicts } : c)
        await rebuildRelatedConflicts(allRelated, updatedAll)
      }
    }

    const resolvedEventType = rest.eventType !== undefined ? rest.eventType : (existing?.eventType || 'SESSION')
    if (rest.consultationStatusId !== undefined && existing && resolvedEventType !== 'INTERVIEW') {
      const newPatientId = rest.patientId || existing.patientId
      const newSpecialty = rest.specialty || existing.specialty
      const status = consultationStatuses.find(s => s.id === rest.consultationStatusId)
      const therapist = therapists.find(t => t.id === (rest.therapistId || existing.therapistId))
      await handlePrepaidConsumption(id, {
        oldConsumed, // lido do banco ANTES do update acima
        oldPatientId: existing.patientId, oldSpecialty: existing.specialty,
        newPatientId, newSpecialty,
        newStatusId: rest.consultationStatusId,
        operation: 'CONSULTATION_UPDATE',
        date: rest.date || existing.date, time: rest.time || existing.time,
        therapistName: therapist?.name, statusName: status?.name,
      })
    }
  }

  async function deleteConsultation(id) {
    const existing = consultations.find(c => c.id === id)
    if (existing?.prepaidSessionConsumed) {
      const { data: { session } } = await supabase.auth.getSession()
      const createdBy = session?.user?.id || null
      const resolvedTherapist = therapists.find(t => t.userId === createdBy)
      await supabase.from('patient_prepaid_ledger').insert({
        patient_id: existing.patientId, specialty: existing.specialty,
        consultation_id: id, entry_type: 'ADJUSTMENT',
        sessions_quantity: 1, operation: 'AUTO_REVERSAL',
        notes: 'Estorno automático - Atendimento excluído',
        created_by: createdBy, created_by_name: resolvedTherapist?.name || null,
      })
    }
    await supabase.from('consultations').delete().eq('id', id)
    const reverseRelated = consultations
      .filter(c => c.id !== id && (c.conflicts || []).some(cf => cf.relatedConsultationId === id))
      .map(c => c.id)
    setConsultations(prev => prev.filter(c => c.id !== id))
    if (reverseRelated.length > 0) {
      const updatedAll = consultations.filter(c => c.id !== id)
      await rebuildRelatedConflicts(reverseRelated, updatedAll)
    }
  }

  // ─── Therapists ─────────────────────────────────────────────────────────────

  async function addTherapist(data) {
    const primarySpec = (data.therapistSpecialties || []).find(s => s.specialty)
    const { data: inserted, error } = await supabase
      .from('therapists')
      .insert({
        name: data.name,
        specialty: primarySpec?.specialty || data.specialty || '',
        email: data.email || null,
        phone: data.phone || null,
        cpf: data.cpf || null,
        bio: data.bio || null,
        credential: primarySpec?.credential || null,
        bank: data.bank || null,
        agency: data.agency || null,
        account_number: data.accountNumber || null,
        pix_key: data.pixKey || null,
        color: data.color || null,
        belongs_to_team: data.belongsToTeam || false,
        active: true,
      })
      .select()
      .single()

    if (error) return dbError(error, toast)
    await syncTherapistSpecialties(inserted.id, data.therapistSpecialties || [])
    const newTherapist = mapTherapist({
      ...inserted,
      therapist_specialties: data.therapistSpecialties || [],
    })
    setTherapists(prev => [...prev, newTherapist])
    return newTherapist
  }

  async function updateTherapist(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.email !== undefined) update.email = data.email || null
    if (data.phone !== undefined) update.phone = data.phone || null
    if (data.cpf !== undefined) update.cpf = data.cpf || null
    if (data.bio !== undefined) update.bio = data.bio || null
    if (data.bank !== undefined) update.bank = data.bank || null
    if (data.agency !== undefined) update.agency = data.agency || null
    if (data.accountNumber !== undefined) update.account_number = data.accountNumber || null
    if (data.pixKey !== undefined) update.pix_key = data.pixKey || null
    if (data.color !== undefined) update.color = data.color || null
    if (data.active !== undefined) update.active = data.active
    if (data.belongsToTeam !== undefined) update.belongs_to_team = data.belongsToTeam

    // Update primary specialty from first in list
    if (data.therapistSpecialties !== undefined) {
      const primarySpec = data.therapistSpecialties.find(s => s.specialty)
      if (primarySpec) {
        update.specialty = primarySpec.specialty
        update.credential = primarySpec.credential || null
      }
      await syncTherapistSpecialties(id, data.therapistSpecialties)
    }

    if (Object.keys(update).length) {
      await supabase.from('therapists').update(update).eq('id', id)
    }
    setTherapists(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
  }

  async function deleteTherapist(id) {
    await supabase.from('therapists').update({ active: false }).eq('id', id)
    setTherapists(prev => prev.map(t => t.id === id ? { ...t, active: false } : t))
  }

  function getTherapistById(id) {
    return therapists.find(t => t.id === id)
  }

  // ─── Specialties ────────────────────────────────────────────────────────────

  async function addSpecialtyData(data) {
    const { data: inserted, error } = await supabase
      .from('specialties')
      .insert({ key: data.key, label: data.label, color: data.color || null, active: true })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapSpecialty(inserted)
    setSpecialtiesData(prev => [...prev, item])
    return item
  }

  async function updateSpecialtyData(id, data) {
    const update = {}
    if (data.key !== undefined) update.key = data.key
    if (data.label !== undefined) update.label = data.label
    if (data.color !== undefined) update.color = data.color || null
    if (data.active !== undefined) update.active = data.active
    await supabase.from('specialties').update(update).eq('id', id)
    setSpecialtiesData(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
  }

  // ─── Payment Methods ─────────────────────────────────────────────────────────

  async function addPaymentMethod(data) {
    const { data: inserted, error } = await supabase
      .from('payment_methods')
      .insert({ name: data.name, active: true })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapPaymentMethod(inserted)
    setPaymentMethods(prev => [...prev, item])
    return item
  }

  async function updatePaymentMethod(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.active !== undefined) update.active = data.active
    await supabase.from('payment_methods').update(update).eq('id', id)
    setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, ...data } : pm))
  }

  // ─── Diagnoses ───────────────────────────────────────────────────────────────

  async function addDiagnosis(data) {
    const { data: inserted, error } = await supabase
      .from('diagnoses')
      .insert({ name: data.name, active: true })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapDiagnosis(inserted)
    setDiagnoses(prev => [...prev, item])
    return item
  }

  async function updateDiagnosis(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.active !== undefined) update.active = data.active
    await supabase.from('diagnoses').update(update).eq('id', id)
    setDiagnoses(prev => prev.map(d => d.id === id ? { ...d, ...data } : d))
  }

  // ─── Patient Statuses ────────────────────────────────────────────────────────

  async function addPatientStatus(data) {
    const { data: inserted, error } = await supabase
      .from('patient_statuses')
      .insert({ name: data.name, color: data.color || 'bg-gray-100 text-gray-700', active: true })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapPatientStatus(inserted)
    setPatientStatuses(prev => [...prev, item])
    return item
  }

  async function updatePatientStatus(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.color !== undefined) update.color = data.color
    if (data.active !== undefined) update.active = data.active
    await supabase.from('patient_statuses').update(update).eq('id', id)
    setPatientStatuses(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
  }

  // ─── Rooms ───────────────────────────────────────────────────────────────────

  async function addRoom(data) {
    const { data: inserted, error } = await supabase
      .from('rooms')
      .insert({ name: data.name, description: data.description || null, color: data.color || null, active: true })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapRoom(inserted)
    setRooms(prev => [...prev, item])
    return item
  }

  async function updateRoom(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description || null
    if (data.color !== undefined) update.color = data.color || null
    if (data.active !== undefined) update.active = data.active
    await supabase.from('rooms').update(update).eq('id', id)
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }

  // ─── Consultation Statuses ────────────────────────────────────────────────────

  async function addConsultationStatus(data) {
    const { data: inserted, error } = await supabase
      .from('consultation_statuses')
      .insert({ name: data.name, color: data.color || 'bg-gray-100 text-gray-700', active: true, automatic: data.automatic || false, consumes_prepaid_session: data.consumesPrepaidSession || false, requires_objective_note: data.requiresObjectiveNote || false })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapConsultationStatus(inserted)
    setConsultationStatuses(prev => [...prev, item])
    return item
  }

  async function updateConsultationStatus(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.color !== undefined) update.color = data.color
    if (data.active !== undefined) update.active = data.active
    if (data.automatic !== undefined) update.automatic = data.automatic
    if (data.consumesPrepaidSession !== undefined) update.consumes_prepaid_session = data.consumesPrepaidSession
    if (data.requiresObjectiveNote !== undefined) update.requires_objective_note = data.requiresObjectiveNote
    await supabase.from('consultation_statuses').update(update).eq('id', id)
    setConsultationStatuses(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
  }

  // ─── Appointment Types ────────────────────────────────────────────────────────

  async function addAppointmentType(data) {
    const { data: inserted, error } = await supabase
      .from('appointment_types')
      .insert({ name: data.name, active: true })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapAppointmentType(inserted)
    setAppointmentTypes(prev => [...prev, item])
    return item
  }

  async function updateAppointmentType(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.active !== undefined) update.active = data.active
    await supabase.from('appointment_types').update(update).eq('id', id)
    setAppointmentTypes(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
  }

  // ─── Medical Records ──────────────────────────────────────────────────────────

  async function getOrCreateMedicalRecord(patientId, authUserId) {
    const fields = 'id, therapeutic_project_description, therapeutic_project_notes'
    const { data: existing } = await supabase
      .from('medical_records')
      .select(fields)
      .eq('patient_id', patientId)
      .maybeSingle()
    if (existing) return {
      id: existing.id,
      therapeuticProjectDescription: existing.therapeutic_project_description || '',
      therapeuticProjectNotes: existing.therapeutic_project_notes || '',
    }

    const { data: created, error } = await supabase
      .from('medical_records')
      .insert({ patient_id: patientId, created_by: authUserId || null })
      .select(fields).single()
    if (error) { dbError(error, toast); return null }
    return {
      id: created.id,
      therapeuticProjectDescription: created.therapeutic_project_description || '',
      therapeuticProjectNotes: created.therapeutic_project_notes || '',
    }
  }

  async function updateTherapeuticProject(medicalRecordId, { description, notes }) {
    const { error } = await supabase
      .from('medical_records')
      .update({
        therapeutic_project_description: description || null,
        therapeutic_project_notes: notes || null,
      })
      .eq('id', medicalRecordId)
    if (error) return dbError(error, toast)
    return { description, notes }
  }

  async function getExams(medicalRecordId) {
    const { data, error } = await supabase
      .from('medical_record_exams')
      .select('*')
      .eq('medical_record_id', medicalRecordId)
      .order('created_at')
    if (error) return dbError(error, toast)
    return (data || []).map(mapExam)
  }

  async function addExam(medicalRecordId, data) {
    const { data: inserted, error } = await supabase
      .from('medical_record_exams')
      .insert({
        medical_record_id: medicalRecordId,
        description: data.description,
        exam_date: data.examDate || null,
        attachment_url: data.attachmentUrl || null,
        notes: data.notes || null,
      })
      .select().single()
    if (error) return dbError(error, toast)
    return mapExam(inserted)
  }

  async function updateExam(id, data) {
    const update = {}
    if (data.description !== undefined) update.description = data.description
    if (data.examDate !== undefined) update.exam_date = data.examDate || null
    if (data.attachmentUrl !== undefined) update.attachment_url = data.attachmentUrl || null
    if (data.notes !== undefined) update.notes = data.notes || null
    update.updated_at = new Date().toISOString()
    await supabase.from('medical_record_exams').update(update).eq('id', id)
  }

  async function deleteExam(id) {
    await supabase.from('medical_record_exams').delete().eq('id', id)
  }

  async function getMedications(medicalRecordId) {
    const { data, error } = await supabase
      .from('medical_record_medications')
      .select('*')
      .eq('medical_record_id', medicalRecordId)
      .order('created_at')
    if (error) return dbError(error, toast)
    return (data || []).map(mapMedication)
  }

  async function addMedication(medicalRecordId, data) {
    const { data: inserted, error } = await supabase
      .from('medical_record_medications')
      .insert({
        medical_record_id: medicalRecordId,
        medication: data.medication,
        registration_date: data.registrationDate || new Date().toISOString().slice(0, 10),
        status: data.status || 'ativa',
        notes: data.notes || null,
      })
      .select().single()
    if (error) return dbError(error, toast)
    return mapMedication(inserted)
  }

  async function updateMedication(id, data) {
    const update = {}
    if (data.medication !== undefined) update.medication = data.medication
    if (data.registrationDate !== undefined) update.registration_date = data.registrationDate
    if (data.status !== undefined) update.status = data.status
    if (data.notes !== undefined) update.notes = data.notes || null
    update.updated_at = new Date().toISOString()
    await supabase.from('medical_record_medications').update(update).eq('id', id)
  }

  async function deleteMedication(id) {
    await supabase.from('medical_record_medications').delete().eq('id', id)
  }

  async function getConducts(medicalRecordId) {
    const { data, error } = await supabase
      .from('medical_record_conducts')
      .select('*, therapist:therapist_id(name)')
      .eq('medical_record_id', medicalRecordId)
      .order('created_at')
    if (error) return dbError(error, toast)
    return (data || []).map(mapConduct)
  }

  async function addConduct(medicalRecordId, data) {
    const { data: inserted, error } = await supabase
      .from('medical_record_conducts')
      .insert({
        medical_record_id: medicalRecordId,
        therapist_id: data.therapistId || null,
        specialty: data.specialty || null,
        conduct: data.conduct || null,
        objective: data.objective || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        status: data.status || 'nao_iniciada',
      })
      .select('*, therapist:therapist_id(name)').single()
    if (error) return dbError(error, toast)
    return mapConduct(inserted)
  }

  async function updateConduct(id, data) {
    const update = {}
    if (data.therapistId !== undefined) update.therapist_id = data.therapistId || null
    if (data.specialty !== undefined) update.specialty = data.specialty || null
    if (data.conduct !== undefined) update.conduct = data.conduct || null
    if (data.objective !== undefined) update.objective = data.objective || null
    if (data.startDate !== undefined) update.start_date = data.startDate || null
    if (data.endDate !== undefined) update.end_date = data.endDate || null
    if (data.status !== undefined) update.status = data.status
    update.updated_at = new Date().toISOString()
    await supabase.from('medical_record_conducts').update(update).eq('id', id)
  }

  async function deleteConduct(id) {
    await supabase.from('medical_record_conducts').delete().eq('id', id)
  }

  // ─── Age Ranges ──────────────────────────────────────────────────────────────

  function mapAgeRange(r) {
    return { id: r.id, name: r.name, minAge: r.min_age, maxAge: r.max_age, color: r.color }
  }

  async function addAgeRange(data) {
    const { data: inserted, error } = await supabase
      .from('age_ranges')
      .insert({ name: data.name, min_age: data.minAge, max_age: data.maxAge, color: data.color || '#3b82f6' })
      .select().single()
    if (error) return dbError(error, toast)
    const item = mapAgeRange(inserted)
    setAgeRanges(prev => [...prev, item].sort((a, b) => a.minAge - b.minAge))
    return item
  }

  async function updateAgeRange(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.minAge !== undefined) update.min_age = data.minAge
    if (data.maxAge !== undefined) update.max_age = data.maxAge
    if (data.color !== undefined) update.color = data.color
    update.updated_at = new Date().toISOString()
    await supabase.from('age_ranges').update(update).eq('id', id)
    setAgeRanges(prev => prev.map(r => r.id === id ? { ...r, ...data } : r).sort((a, b) => a.minAge - b.minAge))
  }

  async function deleteAgeRange(id) {
    await supabase.from('age_ranges').delete().eq('id', id)
    setAgeRanges(prev => prev.filter(r => r.id !== id))
  }

  // ─── Prepaid Packages & Ledger ───────────────────────────────────────────────

  async function addPrepaidPackage(patientId, specialty, data) {
    const { data: { session } } = await supabase.auth.getSession()
    const createdBy = session?.user?.id || null
    const resolvedTherapist = therapists.find(t => t.userId === createdBy)
    const createdByName = resolvedTherapist?.name || null
    const { data: pkg, error } = await supabase
      .from('patient_prepaid_packages')
      .insert({
        patient_id: patientId, specialty,
        sessions_quantity: data.sessionsQuantity,
        patient_value_per_session: data.patientValuePerSession ?? null,
        therapist_value_per_session: data.therapistValuePerSession ?? null,
        total_paid: data.totalPaid ?? null,
        notes: data.notes || null,
        purchased_at: data.purchasedAt || new Date().toISOString().slice(0, 10),
        created_by: createdBy,
      })
      .select().single()
    if (error) return dbError(error, toast)
    await supabase.from('patient_prepaid_ledger').insert({
      patient_id: patientId, specialty,
      package_id: pkg.id, entry_type: 'CREDIT',
      sessions_quantity: data.sessionsQuantity,
      operation: 'PACKAGE_PURCHASE',
      notes: data.notes || null,
      created_by: createdBy, created_by_name: createdByName,
    })
    return pkg
  }

  async function getPrepaidData(patientId, specialty) {
    const [packagesRes, ledgerRes] = await Promise.all([
      supabase.from('patient_prepaid_packages')
        .select('*')
        .eq('patient_id', patientId)
        .eq('specialty', specialty)
        .order('purchased_at', { ascending: false }),
      supabase.from('patient_prepaid_ledger')
        .select('*, consultations(id, date, time, specialty, consultation_status_id, therapist_id)')
        .eq('patient_id', patientId)
        .eq('specialty', specialty)
        .order('created_at', { ascending: true }),
    ])
    const packages = packagesRes.data || []
    const ledger = ledgerRes.data || []
    const balance = ledger.reduce((sum, e) => sum + (e.sessions_quantity || 0), 0)
    return { packages, ledger: [...ledger].reverse(), balance }
  }

  async function addLedgerAdjustment(patientId, specialty, sessionsQty, notes) {
    const { data: { session } } = await supabase.auth.getSession()
    const createdBy = session?.user?.id || null
    const resolvedTherapist = therapists.find(t => t.userId === createdBy)
    const { error } = await supabase.from('patient_prepaid_ledger').insert({
      patient_id: patientId, specialty,
      entry_type: 'ADJUSTMENT',
      sessions_quantity: sessionsQty,
      operation: 'MANUAL_ADJUSTMENT',
      notes: notes || null,
      created_by: createdBy,
      created_by_name: resolvedTherapist?.name || null,
    })
    if (error) return dbError(error, toast)
    return {}
  }

  // ─── Company Settings ────────────────────────────────────────────────────────

  async function updateCompanySettings(data) {
    const { error } = await supabase
      .from('company_settings')
      .update({
        razao_social: data.razaoSocial || null,
        cnpj: data.cnpj || null,
        ai_system_prompt: data.aiSystemPrompt || null,
        cnes: data.cnes || null,
        therapist_discount_percent: data.therapistDiscountPercent ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    if (error) return dbError(error, toast)
    setCompanySettings({
      razaoSocial: data.razaoSocial || '',
      cnpj: data.cnpj || '',
      aiSystemPrompt: data.aiSystemPrompt || '',
      cnes: data.cnes || '',
      therapistDiscountPercent: data.therapistDiscountPercent ?? 0,
    })
    return {}
  }

  // ─── Payment Demonstratives ──────────────────────────────────────────────────

  // Atualiza status de consultas em lote SEM acionar handlePrepaidConsumption.
  // Usado exclusivamente no fluxo de faturamento (Demonstrativo Definitivo).
  // Atualiza status de consultas em lote SEM acionar handlePrepaidConsumption.
  // Também salva previous_status_before_invoice e campos NF quando fornecidos.
  async function batchFaturarConsultations(ids, statusId, { nfNumber, nfDate } = {}) {
    if (!ids?.length) return

    // Lê status atual ANTES de sobrescrever para salvar previous_status_before_invoice
    const { data: existing } = await supabase
      .from('consultations')
      .select('id, consultation_status_id, previous_status_before_invoice')
      .in('id', ids)

    // Salva o status anterior individualmente para quem ainda não tem
    const needsPrev = (existing || []).filter(c => !c.previous_status_before_invoice && c.consultation_status_id)
    if (needsPrev.length) {
      await Promise.all(needsPrev.map(c =>
        supabase.from('consultations')
          .update({ previous_status_before_invoice: c.consultation_status_id })
          .eq('id', c.id)
      ))
    }

    // Aplica status + campos NF
    const update = { consultation_status_id: statusId }
    if (nfNumber) update.nf_number = nfNumber
    if (nfDate)   update.nf_issue_date = nfDate

    const { error } = await supabase.from('consultations').update(update).in('id', ids)
    if (error) throw new Error(error.message)

    setConsultations(prev => prev.map(c => {
      if (!ids.includes(c.id)) return c
      const prev_status = existing?.find(e => e.id === c.id)?.consultation_status_id || null
      return {
        ...c,
        consultationStatusId: statusId,
        nfNumber: nfNumber || c.nfNumber,
        nfIssueDate: nfDate || c.nfIssueDate,
        previousStatusBeforeInvoice: c.previousStatusBeforeInvoice || prev_status,
      }
    }))
  }

  async function createPaymentInvoice(data) {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: inserted, error } = await supabase
      .from('payment_invoices')
      .insert({
        nf_number:                data.nfNumber || null,
        patient_id:               data.patientId,
        nf_issue_date:            data.nfDate || null,
        total_amount:             data.totalAmount || null,
        payment_demonstrative_id: data.demonstrativoId || null,
        consultation_ids:         data.consultationIds || [],
        snapshot:                 data.snapshot || null,
        created_by:               session?.user?.id || null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return inserted
  }

  async function getPaymentInvoices({ patientId, status, nfNumber, dateFrom, dateTo, search } = {}) {
    let q = supabase
      .from('payment_invoices')
      .select('*, patients(full_name)')
      .order('created_at', { ascending: false })
    if (patientId)  q = q.eq('patient_id', patientId)
    if (status)     q = q.eq('status', status)
    if (nfNumber)   q = q.ilike('nf_number', `%${nfNumber}%`)
    if (dateFrom)   q = q.gte('nf_issue_date', dateFrom)
    if (dateTo)     q = q.lte('nf_issue_date', dateTo)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = data || []
    if (search) {
      const s = search.toLowerCase()
      return rows.filter(r =>
        r.nf_number?.toLowerCase().includes(s) ||
        r.patients?.full_name?.toLowerCase().includes(s)
      )
    }
    return rows
  }

  async function cancelPaymentInvoice(invoiceId, consultationIds) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null

    // Restaura status anterior + limpa campos NF
    if (consultationIds?.length) {
      const { data: rows } = await supabase
        .from('consultations')
        .select('id, previous_status_before_invoice')
        .in('id', consultationIds)

      await Promise.all(consultationIds.map(id => {
        const row = rows?.find(r => r.id === id)
        const upd = { nf_number: null, nf_issue_date: null }
        if (row?.previous_status_before_invoice) {
          upd.consultation_status_id = row.previous_status_before_invoice
        }
        return supabase.from('consultations').update(upd).eq('id', id)
      }))

      const prevMap = Object.fromEntries((rows || []).map(r => [r.id, r.previous_status_before_invoice]))
      setConsultations(prev => prev.map(c => {
        if (!consultationIds.includes(c.id)) return c
        return {
          ...c,
          nfNumber: null,
          nfIssueDate: null,
          consultationStatusId: prevMap[c.id] || c.consultationStatusId,
        }
      }))
    }

    const { error } = await supabase
      .from('payment_invoices')
      .update({
        status:       'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', invoiceId)
    if (error) throw new Error(error.message)
  }

  async function markInvoicePaid(invoiceId, consultationIds, paidStatusId) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null

    if (consultationIds?.length && paidStatusId) {
      const { error: cErr } = await supabase
        .from('consultations')
        .update({ consultation_status_id: paidStatusId })
        .in('id', consultationIds)
      if (cErr) throw new Error(cErr.message)
      setConsultations(prev => prev.map(c =>
        consultationIds.includes(c.id) ? { ...c, consultationStatusId: paidStatusId } : c
      ))
    }

    const { error } = await supabase
      .from('payment_invoices')
      .update({
        status:    'PAID',
        paid_at:   new Date().toISOString(),
        paid_by:   userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
    if (error) throw new Error(error.message)
  }

  async function addPaymentDemonstrativo(data) {
    const { data: { session } } = await supabase.auth.getSession()
    const formDataWithTotal = {
      ...(data.formData || {}),
      ...(data.totalAmount != null ? { totalAmount: data.totalAmount } : {}),
    }
    const { data: inserted, error } = await supabase
      .from('payment_demonstratives')
      .insert({
        patient_id:       data.patientId,
        period_start:     data.periodStart,
        period_end:       data.periodEnd,
        mes_label:        data.mesLabel,
        nf_number:        data.nfNumber || null,
        nf_date:          data.nfDate || null,
        consultation_ids: data.consultationIds || [],
        form_data:        Object.keys(formDataWithTotal).length ? formDataWithTotal : null,
        created_by:       session?.user?.id || null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return inserted
  }

  async function getPaymentDemonstrativos(patientId) {
    const { data, error } = await supabase
      .from('payment_demonstratives')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  }

  // ─── Consultation Series ─────────────────────────────────────────────────────

  async function addConsultationSeries(data) {
    const {
      patientId, primaryTherapistId, specialty,
      consultationStatusId, appointmentTypeId, roomId,
      time, recurrenceType, recurrenceDays, startDate, endDate, sessionCount, notes,
      eventType, interviewFormat, meetingPlatform, meetingLink, intervieweeName,
      conflictsPerDate = [],
    } = data

    const { data: { session } } = await supabase.auth.getSession()
    const createdBy = session?.user?.id || null

    // Validação de segurança: terapeuta fora da equipe só pode criar série para si mesmo
    const callerTherapistSeries = therapists.find(t => t.userId === createdBy)
    if (callerTherapistSeries && !callerTherapistSeries.belongsToTeam) {
      if (primaryTherapistId && primaryTherapistId !== callerTherapistSeries.id) {
        return { error: 'Você não tem permissão para criar séries em nome de outro terapeuta.' }
      }
    }

    // 1. Gera datas das ocorrências
    const dates = generateSeriesDates({ recurrenceType, recurrenceDays, startDate, endDate, sessionCount })
    if (dates.length === 0) return { error: 'Nenhuma data gerada com os parâmetros informados.' }

    // 2. Cria o registro da série
    const { data: series, error: seriesErr } = await supabase
      .from('consultation_series')
      .insert({
        patient_id:             patientId,
        primary_therapist_id:   primaryTherapistId,
        specialty,
        appointment_type_id:    appointmentTypeId || null,
        consultation_status_id: consultationStatusId || null,
        room_id:                roomId || null,
        time:                   time || null,
        event_type:             eventType || 'SESSION',
        interview_format:       interviewFormat || null,
        meeting_platform:       meetingPlatform || null,
        meeting_link:           meetingLink || null,
        interviewee_name:       intervieweeName || null,
        recurrence_type:        recurrenceType,
        recurrence_days:        recurrenceDays,
        start_date:             startDate,
        end_date:               endDate || null,
        session_count:          sessionCount || null,
        notes:                  notes || null,
        created_by:             createdBy,
      })
      .select()
      .single()
    if (seriesErr) return dbError(seriesErr, toast)
    if (!series?.id) return dbError({ message: 'Série criada mas não foi possível recuperar o registro. Verifique as permissões de acesso.' }, toast)

    // 3. Bulk insert das consultas
    const consultationRows = dates.map(date => ({
      patient_id:             patientId,
      therapist_id:           primaryTherapistId,
      specialty,
      date,
      time:                   time || null,
      room_id:                roomId || null,
      event_type:             eventType || 'SESSION',
      interview_format:       interviewFormat || null,
      meeting_platform:       meetingPlatform || null,
      meeting_link:           meetingLink || null,
      interviewee_name:       intervieweeName || null,
      consultation_status_id: consultationStatusId || null,
      appointment_type_id:    appointmentTypeId || null,
      series_id:              series.id,
      series_original_date:   date,
      is_series_exception:    false,
    }))

    const { error: consultErr } = await supabase
      .from('consultations')
      .insert(consultationRows)
    if (consultErr) {
      await supabase.from('consultation_series').delete().eq('id', series.id)
      return dbError(consultErr, toast)
    }
    // Busca IDs via series_id (evita depender do RETURNING, sujeito a RLS instável em bulk insert)
    const { data: insertedIds, error: fetchIdsErr } = await supabase
      .from('consultations')
      .select('id')
      .eq('series_id', series.id)
    if (fetchIdsErr || !insertedIds || insertedIds.length === 0) {
      await supabase.from('consultation_series').delete().eq('id', series.id)
      return dbError(
        fetchIdsErr || { message: `0 atendimentos criados de ${dates.length} esperados.` },
        toast
      )
    }

    // 4. Bulk insert de participation (terapeuta principal em cada consulta)
    const { error: ctErr } = await supabase
      .from('consultation_therapists')
      .insert(insertedIds.map(c => ({
        consultation_id: c.id,
        therapist_id:    primaryTherapistId,
        specialty,
        is_primary:      true,
      })))
    if (ctErr) console.error('[addConsultationSeries] consultation_therapists error:', ctErr)

    // 5. Busca registros completos para atualizar estado local
    let fullRes = await supabase
      .from('consultations')
      .select(CONSULTATION_SELECT)
      .in('id', insertedIds.map(c => c.id))
      .order('date', { ascending: true })
    if (fullRes.error) {
      // Fallback sem JOINs complexos (mesmo padrão do fetchAll)
      fullRes = await supabase
        .from('consultations')
        .select(CONSULTATION_SELECT.replace(/,\s*consultation_conflicts[^(]*\([^)]*\)/, ''))
        .in('id', insertedIds.map(c => c.id))
        .order('date', { ascending: true })
    }
    const mapped = (fullRes.data || []).map(mapConsultation)
    setConsultations(prev => [...mapped, ...prev])

    // 6. Consome sessões pré-pagas se o status da série exige (espelha comportamento de addConsultation)
    if (consultationStatusId && patientId && specialty && (eventType || 'SESSION') === 'SESSION') {
      const patient = patients.find(p => p.id === patientId)
      const patSpec = (patient?.specialties || []).find(s => s.key === specialty)
      if (patSpec?.paymentType === 'PREPAID_PACKAGE') {
        const status = consultationStatuses.find(s => s.id === consultationStatusId)
        if (status?.consumesPrepaidSession) {
          const primaryTherapist = therapists.find(t => t.id === primaryTherapistId)
          for (const consult of mapped) {
            await handlePrepaidConsumption(consult.id, {
              oldConsumed: false,
              newPatientId: patientId,
              newSpecialty: specialty,
              newStatusId: consultationStatusId,
              operation: 'CONSULTATION_ADD',
              date: consult.date,
              time: consult.time || time,
              therapistName: primaryTherapist?.name || '',
              statusName: status.name,
            })
          }
        }
      }
    }

    // Persiste conflitos por data se fornecidos
    if (conflictsPerDate.length > 0) {
      await Promise.all(insertedIds.map((row, i) => {
        const date = dates[i]
        const entry = conflictsPerDate.find(e => e.date === date)
        return entry?.conflicts?.length > 0 ? persistConflicts(row.id, entry.conflicts) : Promise.resolve()
      }))
    }

    return { series: mapConsultationSeries(series), consultations: mapped, count: mapped.length }
  }

  // Atualiza campos estruturais das consultas futuras da série (não faturadas).
  // Nunca altera status, campos clínicos ou NF — mantém ledger intacto.
  async function updateConsultationSeries(seriesId, fromDate, data) {
    // Terapeuta fora da equipe só atualiza ocorrências onde é o terapeuta principal
    const { data: { session: _sessUS } } = await supabase.auth.getSession()
    const callerUS = therapists.find(t => t.userId === _sessUS?.user?.id)
    const isNonTeam = callerUS && !callerUS.belongsToTeam

    const update = {}
    if (data.time !== undefined) update.time = data.time || null
    if (data.roomId !== undefined) update.room_id = data.roomId || null
    if (data.appointmentTypeId !== undefined) update.appointment_type_id = data.appointmentTypeId || null
    if (data.therapistId !== undefined) update.therapist_id = data.therapistId || null
    if (data.specialty !== undefined) update.specialty = data.specialty

    if (Object.keys(update).length) {
      let q = supabase
        .from('consultations')
        .update(update)
        .eq('series_id', seriesId)
        .gt('date', fromDate)
        .is('nf_number', null)
        .eq('is_series_exception', false)
      if (isNonTeam) q = q.eq('therapist_id', callerUS.id)
      const { error } = await q
      if (error) { toast.show(error.message); return { error: error.message } }
    }

    // Atualiza metadados da série
    const seriesUpd = {}
    if (data.time !== undefined) seriesUpd.time = data.time || null
    if (data.roomId !== undefined) seriesUpd.room_id = data.roomId || null
    if (data.appointmentTypeId !== undefined) seriesUpd.appointment_type_id = data.appointmentTypeId || null
    if (data.therapistId !== undefined) seriesUpd.primary_therapist_id = data.therapistId || null
    if (data.specialty !== undefined) seriesUpd.specialty = data.specialty
    if (Object.keys(seriesUpd).length) {
      seriesUpd.updated_at = new Date().toISOString()
      await supabase.from('consultation_series').update(seriesUpd).eq('id', seriesId)
    }

    setConsultations(prev => prev.map(c => {
      if (c.seriesId !== seriesId || c.date <= fromDate || c.nfNumber || c.isSeriesException) return c
      if (isNonTeam && c.therapistId !== callerUS.id) return c
      const patch = {}
      if (data.time !== undefined) patch.time = data.time
      if (data.roomId !== undefined) patch.roomId = data.roomId
      if (data.appointmentTypeId !== undefined) patch.appointmentTypeId = data.appointmentTypeId
      if (data.therapistId !== undefined) patch.therapistId = data.therapistId
      if (data.specialty !== undefined) patch.specialty = data.specialty
      return { ...c, ...patch }
    }))
  }

  // Exclui consultas futuras da série não faturadas, com estorno de pré-pago.
  async function deleteConsultationSeries(seriesId, fromDate) {
    const { data: targets, error: fetchErr } = await supabase
      .from('consultations')
      .select('id, patient_id, specialty, prepaid_session_consumed')
      .eq('series_id', seriesId)
      .gte('date', fromDate)
      .is('nf_number', null)
    if (fetchErr) { toast.show(fetchErr.message); return }
    if (!targets?.length) return

    const ids = targets.map(c => c.id)
    const { data: { session } } = await supabase.auth.getSession()
    const createdBy = session?.user?.id || null
    const resolvedTherapist = therapists.find(t => t.userId === createdBy)

    const consumed = targets.filter(c => c.prepaid_session_consumed)
    if (consumed.length) {
      await Promise.all(consumed.map(c =>
        supabase.from('patient_prepaid_ledger').insert({
          patient_id: c.patient_id, specialty: c.specialty,
          consultation_id: c.id, entry_type: 'ADJUSTMENT',
          sessions_quantity: 1, operation: 'AUTO_REVERSAL',
          notes: 'Estorno automático - Atendimento excluído (série)',
          created_by: createdBy, created_by_name: resolvedTherapist?.name || null,
        })
      ))
    }

    const { error } = await supabase.from('consultations').delete().in('id', ids)
    if (error) { toast.show(error.message); return }
    setConsultations(prev => prev.filter(c => !ids.includes(c.id)))
  }

  // ─── Calendar Blocks ────────────────────────────────────────────────────────

  async function addCalendarBlock(data) {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: inserted, error } = await supabase
      .from('calendar_blocks')
      .insert({
        therapist_id: data.therapistId,
        block_type:   data.blockType,
        description:  data.description || null,
        date:         data.date,
        start_time:   data.startTime,
        end_time:     data.endTime,
        created_by:   session?.user?.id || null,
      })
      .select('*')
      .single()
    if (error) return dbError(error, toast)
    const mapped = mapCalendarBlock(inserted)
    const updatedBlocks = [mapped, ...calendarBlocks]
    setCalendarBlocks(updatedBlocks)
    const affected = consultations.filter(c =>
      c.date === mapped.date && c.time &&
      [c.therapistId, ...(c.consultationTherapists || []).map(ct => ct.therapistId)].includes(mapped.therapistId)
    )
    if (affected.length > 0) {
      await rebuildRelatedConflicts(affected.map(c => c.id), consultations, updatedBlocks)
    }
    return mapped
  }

  async function addCalendarBlockSeries(data) {
    const { data: { session } } = await supabase.auth.getSession()

    // 1. Generate dates
    const dates = generateSeriesDates({
      recurrenceType: data.recurrenceType,
      recurrenceDays: data.recurrenceDays,
      startDate: data.startDate,
      endDate: data.endDate,
      sessionCount: data.sessionCount,
    })
    if (!dates || dates.length === 0) return { error: 'Nenhuma data gerada com os parâmetros informados.' }

    // 2. Create series record
    const { data: series, error: seriesErr } = await supabase
      .from('calendar_block_series')
      .insert({
        therapist_id:     data.therapistId,
        block_type:       data.blockType,
        description:      data.description || null,
        start_date:       data.startDate,
        end_date:         data.endDate || null,
        recurrence_type:  data.recurrenceType,
        recurrence_days:  data.recurrenceDays,
        session_count:    data.sessionCount || null,
        start_time:       data.startTime,
        end_time:         data.endTime,
        created_by:       session?.user?.id || null,
      })
      .select('*')
      .single()
    if (seriesErr) return dbError(seriesErr, toast)

    // 3. Bulk insert blocks
    const blocks = dates.map(date => ({
      series_id:            series.id,
      therapist_id:         data.therapistId,
      block_type:           data.blockType,
      description:          data.description || null,
      date,
      start_time:           data.startTime,
      end_time:             data.endTime,
      series_original_date: date,
      created_by:           session?.user?.id || null,
    }))
    const { data: inserted, error: blocksErr } = await supabase
      .from('calendar_blocks')
      .insert(blocks)
      .select('*')
    if (blocksErr) return dbError(blocksErr, toast)

    const mapped = (inserted || []).map(mapCalendarBlock)
    const updatedBlocks = [...mapped, ...calendarBlocks]
    setCalendarBlocks(updatedBlocks)
    const affectedDates = new Set(mapped.map(b => b.date))
    const affected = consultations.filter(c =>
      affectedDates.has(c.date) && c.time &&
      [c.therapistId, ...(c.consultationTherapists || []).map(ct => ct.therapistId)].includes(data.therapistId)
    )
    if (affected.length > 0) {
      await rebuildRelatedConflicts(affected.map(c => c.id), consultations, updatedBlocks)
    }
    return { series: mapCalendarBlockSeries(series), blocks: mapped, count: mapped.length }
  }

  async function updateCalendarBlock(id, data) {
    const update = {}
    if (data.blockType !== undefined)        update.block_type          = data.blockType
    if (data.description !== undefined)      update.description         = data.description || null
    if (data.date !== undefined)             update.date                = data.date
    if (data.startTime !== undefined)        update.start_time          = data.startTime
    if (data.endTime !== undefined)          update.end_time            = data.endTime
    if (data.isSeriesException !== undefined) update.is_series_exception = data.isSeriesException
    update.updated_at = new Date().toISOString()
    const { error } = await supabase.from('calendar_blocks').update(update).eq('id', id)
    if (error) return dbError(error, toast)
    const existing = calendarBlocks.find(b => b.id === id)
    const updatedBlocks = calendarBlocks.map(b => b.id === id ? { ...b, ...data } : b)
    setCalendarBlocks(updatedBlocks)
    if (existing) {
      const dates = new Set([data.date || existing.date, existing.date].filter(Boolean))
      const affected = consultations.filter(c =>
        dates.has(c.date) && c.time &&
        [c.therapistId, ...(c.consultationTherapists || []).map(ct => ct.therapistId)].includes(existing.therapistId)
      )
      if (affected.length > 0) {
        await rebuildRelatedConflicts(affected.map(c => c.id), consultations, updatedBlocks)
      }
    }
  }

  async function updateCalendarBlockSeriesFuture(seriesId, fromDate, data) {
    const update = {}
    if (data.blockType !== undefined)   update.block_type   = data.blockType
    if (data.description !== undefined) update.description  = data.description || null
    if (data.startTime !== undefined)   update.start_time   = data.startTime
    if (data.endTime !== undefined)     update.end_time     = data.endTime
    update.updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('calendar_blocks')
      .update(update)
      .eq('series_id', seriesId)
      .gte('date', fromDate)
      .eq('cancelled', false)
    if (error) return dbError(error, toast)
    const seriesBlocks = calendarBlocks.filter(b => b.seriesId === seriesId && b.date >= fromDate && !b.cancelled)
    const updatedBlocks = calendarBlocks.map(b =>
      b.seriesId === seriesId && b.date >= fromDate && !b.cancelled ? { ...b, ...data } : b
    )
    setCalendarBlocks(updatedBlocks)
    const affectedDates = new Set(seriesBlocks.map(b => b.date))
    const therapistId = seriesBlocks[0]?.therapistId
    if (therapistId && affectedDates.size > 0) {
      const affected = consultations.filter(c =>
        affectedDates.has(c.date) && c.time &&
        [c.therapistId, ...(c.consultationTherapists || []).map(ct => ct.therapistId)].includes(therapistId)
      )
      if (affected.length > 0) {
        await rebuildRelatedConflicts(affected.map(c => c.id), consultations, updatedBlocks)
      }
    }
  }

  async function cancelCalendarBlock(id) {
    const { data: { session } } = await supabase.auth.getSession()
    const now = new Date().toISOString()
    const block = calendarBlocks.find(b => b.id === id)
    const { error } = await supabase
      .from('calendar_blocks')
      .update({ cancelled: true, cancelled_at: now, cancelled_by: session?.user?.id || null, updated_at: now })
      .eq('id', id)
    if (error) return dbError(error, toast)
    const updatedBlocks = calendarBlocks.filter(b => b.id !== id)
    setCalendarBlocks(updatedBlocks)
    if (block) {
      const affected = consultations.filter(c =>
        c.date === block.date && c.time &&
        [c.therapistId, ...(c.consultationTherapists || []).map(ct => ct.therapistId)].includes(block.therapistId)
      )
      if (affected.length > 0) {
        await rebuildRelatedConflicts(affected.map(c => c.id), consultations, updatedBlocks)
      }
    }
  }

  async function cancelCalendarBlockSeriesFuture(seriesId, fromDate) {
    const { data: { session } } = await supabase.auth.getSession()
    const now = new Date().toISOString()
    const today = new Date().toISOString().slice(0, 10)
    const cutoff = fromDate > today ? fromDate : today
    const toCancel = calendarBlocks.filter(b => b.seriesId === seriesId && b.date >= cutoff && !b.cancelled)
    const { error } = await supabase
      .from('calendar_blocks')
      .update({ cancelled: true, cancelled_at: now, cancelled_by: session?.user?.id || null, updated_at: now })
      .eq('series_id', seriesId)
      .gte('date', cutoff)
      .eq('cancelled', false)
    if (error) return dbError(error, toast)
    const updatedBlocks = calendarBlocks.filter(b => !(b.seriesId === seriesId && b.date >= cutoff && !b.cancelled))
    setCalendarBlocks(updatedBlocks)
    const affectedDates = new Set(toCancel.map(b => b.date))
    const therapistId = toCancel[0]?.therapistId
    if (therapistId && affectedDates.size > 0) {
      const affected = consultations.filter(c =>
        affectedDates.has(c.date) && c.time &&
        [c.therapistId, ...(c.consultationTherapists || []).map(ct => ct.therapistId)].includes(therapistId)
      )
      if (affected.length > 0) {
        await rebuildRelatedConflicts(affected.map(c => c.id), consultations, updatedBlocks)
      }
    }
  }

  async function getCalendarBlockHistory(therapistId) {
    const query = therapistId
      ? supabase.from('calendar_blocks').select('*').eq('therapist_id', therapistId).order('date', { ascending: false })
      : supabase.from('calendar_blocks').select('*').order('date', { ascending: false })
    const { data, error } = await query
    if (error) { console.error(error); return [] }
    return (data || []).map(mapCalendarBlock)
  }

  // ─── Audit Log ───────────────────────────────────────────────────────────────

  async function logAudit(action, resourceType, resourceId, resourceName = '') {
    try {
      await supabase.rpc('log_view_audit', {
        p_resource_type: resourceType,
        p_resource_id:   resourceId || null,
        p_resource_name: resourceName || '',
      })
    } catch {
      // silently fail — erros de auditoria nao devem quebrar a UI
    }
  }

  // ─── Patient Cleanup ────────────────────────────────────────────────────────

  async function getPatientCleanupSummary(patientId) {
    const { data, error } = await supabase.rpc('get_patient_cleanup_summary', { p_patient_id: patientId })
    if (error) return { error: error.message }
    if (data?.error) return { error: data.error }
    return data
  }

  async function cleanupInactivePatientData(patientId) {
    const { data, error } = await supabase.rpc('cleanup_inactive_patient_data', {
      p_patient_id: patientId,
      p_confirm: 'LIMPAR',
    })
    if (error) return { error: error.message }
    if (data?.error) return { error: data.error }
    setPatients(prev => prev.filter(p => p.id !== patientId))
    setConsultations(prev => prev.filter(c => c.patientId !== patientId))
    return data
  }

  // ─── Value ───────────────────────────────────────────────────────────────────

  const value = {
    isLoading,
    patients, addPatient, updatePatient, deletePatient, restorePatient, getPatientById, fetchInactivePatients,
    guardians, addGuardian, updateGuardian, deleteGuardian, restoreGuardian, getGuardianById, getGuardiansForPatient,
    appointments, addAppointment, updateAppointment, deleteAppointment,
    consultations, addConsultation, updateConsultation, deleteConsultation, addConsultationSeries, updateConsultationSeries, deleteConsultationSeries,
    therapists, addTherapist, updateTherapist, deleteTherapist, getTherapistById,
    specialtiesData, addSpecialtyData, updateSpecialtyData,
    paymentMethods, addPaymentMethod, updatePaymentMethod,
    diagnoses, addDiagnosis, updateDiagnosis,
    patientStatuses, addPatientStatus, updatePatientStatus,
    rooms, addRoom, updateRoom,
    consultationStatuses, addConsultationStatus, updateConsultationStatus,
    appointmentTypes, addAppointmentType, updateAppointmentType,
    ageRanges, addAgeRange, updateAgeRange, deleteAgeRange,
    // Medical Records
    getOrCreateMedicalRecord, updateTherapeuticProject,
    getExams, addExam, updateExam, deleteExam,
    getMedications, addMedication, updateMedication, deleteMedication,
    getConducts, addConduct, updateConduct, deleteConduct,
    logAudit,
    companySettings, updateCompanySettings,
    addPrepaidPackage, getPrepaidData, addLedgerAdjustment,
    batchFaturarConsultations, addPaymentDemonstrativo, getPaymentDemonstrativos,
    createPaymentInvoice, getPaymentInvoices, cancelPaymentInvoice, markInvoicePaid,
    calendarBlocks, addCalendarBlock, addCalendarBlockSeries, updateCalendarBlock, updateCalendarBlockSeriesFuture, cancelCalendarBlock, cancelCalendarBlockSeriesFuture, getCalendarBlockHistory,
    getPatientCleanupSummary, cleanupInactivePatientData,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
