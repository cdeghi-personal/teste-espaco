import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  supabase,
  mapPatient, mapGuardian, mapTherapist, mapAppointment, mapConsultation,
  mapSpecialty, mapPaymentMethod, mapDiagnosis, mapPatientStatus, mapRoom,
  syncPatientRelations, syncGuardianPatients,
} from '../lib/supabase'

const DataContext = createContext(null)

// ─── Queries de fetch ─────────────────────────────────────────────────────────

const PATIENT_SELECT = `
  id, full_name, date_of_birth, sex, cpf, diagnosis, notes, deleted,
  status_id, payment_method_id, primary_therapist_id, created_at, updated_at,
  patient_specialties(specialty),
  patient_secondary_therapists(therapist_id),
  patient_conditions(diagnosis_id)
`

const GUARDIAN_SELECT = `
  id, full_name, relationship, phone, email, cpf, occupation, notes, active, created_at,
  patient_guardians(patient_id)
`

const CONSULTATION_SELECT = `
  id, patient_id, therapist_id, specialty, date, session_number,
  main_objective, evolution_notes, next_objectives, guardian_feedback,
  session_quality, created_at,
  consultation_activities(id, name, description, outcome, sort_order)
`

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }) {
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
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    const [
      patientsRes, guardiansRes, appointmentsRes, consultationsRes,
      therapistsRes, specialtiesRes, paymentRes, diagnosesRes, statusesRes, roomsRes,
    ] = await Promise.all([
      supabase.from('patients').select(PATIENT_SELECT).eq('deleted', false),
      supabase.from('guardians').select(GUARDIAN_SELECT),
      supabase.from('appointments').select('*').order('date').order('time'),
      supabase.from('consultations').select(CONSULTATION_SELECT).order('date', { ascending: false }),
      supabase.from('therapists').select('*').order('name'),
      supabase.from('specialties').select('*').order('label'),
      supabase.from('payment_methods').select('*').order('name'),
      supabase.from('diagnoses').select('*').order('name'),
      supabase.from('patient_statuses').select('*').order('name'),
      supabase.from('rooms').select('*').order('name'),
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
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Patients ───────────────────────────────────────────────────────────────

  async function addPatient(data) {
    const { data: inserted, error } = await supabase
      .from('patients')
      .insert({
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        sex: data.sex,
        cpf: data.cpf || null,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        status_id: data.statusId || null,
        payment_method_id: data.paymentMethodId || null,
        primary_therapist_id: data.therapistId || null,
      })
      .select(PATIENT_SELECT)
      .single()

    if (error) { console.error(error); return }

    await syncPatientRelations(inserted.id, {
      specialties: data.specialties || [],
      secondaryTherapistIds: data.secondaryTherapistIds || [],
      conditionIds: data.conditionIds || [],
    })

    const newPatient = mapPatient({
      ...inserted,
      patient_specialties: (data.specialties || []).map(s => ({ specialty: s })),
      patient_secondary_therapists: (data.secondaryTherapistIds || []).map(id => ({ therapist_id: id })),
      patient_conditions: (data.conditionIds || []).map(id => ({ diagnosis_id: id })),
    })
    setPatients(prev => [...prev, newPatient])
    return newPatient
  }

  async function updatePatient(id, data) {
    const update = {}
    if (data.fullName !== undefined) update.full_name = data.fullName
    if (data.dateOfBirth !== undefined) update.date_of_birth = data.dateOfBirth
    if (data.sex !== undefined) update.sex = data.sex
    if (data.cpf !== undefined) update.cpf = data.cpf || null
    if (data.diagnosis !== undefined) update.diagnosis = data.diagnosis || null
    if (data.notes !== undefined) update.notes = data.notes || null
    if (data.statusId !== undefined) update.status_id = data.statusId || null
    if (data.paymentMethodId !== undefined) update.payment_method_id = data.paymentMethodId || null
    if (data.therapistId !== undefined) update.primary_therapist_id = data.therapistId || null

    if (Object.keys(update).length) {
      update.updated_at = new Date().toISOString()
      await supabase.from('patients').update(update).eq('id', id)
    }

    await syncPatientRelations(id, {
      ...(data.specialties !== undefined && { specialties: data.specialties }),
      ...(data.secondaryTherapistIds !== undefined && { secondaryTherapistIds: data.secondaryTherapistIds }),
      ...(data.conditionIds !== undefined && { conditionIds: data.conditionIds }),
    })

    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
  }

  async function deletePatient(id) {
    await supabase.from('patients').update({ deleted: true }).eq('id', id)
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

  // ─── Guardians ──────────────────────────────────────────────────────────────

  async function addGuardian(data) {
    const { data: inserted, error } = await supabase
      .from('guardians')
      .insert({
        full_name: data.fullName,
        relationship: data.relationship,
        phone: data.phone || null,
        email: data.email || null,
        cpf: data.cpf || null,
        occupation: data.occupation || null,
        notes: data.notes || null,
        active: true,
      })
      .select()
      .single()

    if (error) { console.error(error); return }

    await syncGuardianPatients(inserted.id, data.patientIds || [])

    const newGuardian = mapGuardian({
      ...inserted,
      patient_guardians: (data.patientIds || []).map(pid => ({ patient_id: pid })),
    })
    setGuardians(prev => [...prev, newGuardian])
    return newGuardian
  }

  async function updateGuardian(id, data) {
    const update = {}
    if (data.fullName !== undefined) update.full_name = data.fullName
    if (data.relationship !== undefined) update.relationship = data.relationship
    if (data.phone !== undefined) update.phone = data.phone || null
    if (data.email !== undefined) update.email = data.email || null
    if (data.cpf !== undefined) update.cpf = data.cpf || null
    if (data.occupation !== undefined) update.occupation = data.occupation || null
    if (data.notes !== undefined) update.notes = data.notes || null
    if (data.active !== undefined) update.active = data.active

    if (Object.keys(update).length) {
      await supabase.from('guardians').update(update).eq('id', id)
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
        time: data.time,
        duration: data.duration || 50,
        status: data.status || 'scheduled',
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) { console.error(error); return }
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
    if (data.time !== undefined) update.time = data.time
    if (data.duration !== undefined) update.duration = data.duration
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

  async function addConsultation(data) {
    const { activities, appointmentId, ...rest } = data

    const { data: inserted, error } = await supabase
      .from('consultations')
      .insert({
        patient_id: rest.patientId,
        therapist_id: rest.therapistId,
        specialty: rest.specialty,
        date: rest.date,
        session_number: rest.sessionNumber || null,
        main_objective: rest.mainObjective || null,
        evolution_notes: rest.evolutionNotes || null,
        next_objectives: rest.nextObjectives || null,
        guardian_feedback: rest.guardianFeedback || null,
        session_quality: rest.sessionQuality || null,
      })
      .select()
      .single()

    if (error) { console.error(error); return }

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

    const newConsultation = { ...mapConsultation(inserted), activities: mappedActivities }
    setConsultations(prev => [newConsultation, ...prev])
    return newConsultation
  }

  async function updateConsultation(id, data) {
    const { activities, ...rest } = data
    const update = {}
    if (rest.patientId !== undefined) update.patient_id = rest.patientId
    if (rest.therapistId !== undefined) update.therapist_id = rest.therapistId
    if (rest.specialty !== undefined) update.specialty = rest.specialty
    if (rest.date !== undefined) update.date = rest.date
    if (rest.sessionNumber !== undefined) update.session_number = rest.sessionNumber
    if (rest.mainObjective !== undefined) update.main_objective = rest.mainObjective
    if (rest.evolutionNotes !== undefined) update.evolution_notes = rest.evolutionNotes
    if (rest.nextObjectives !== undefined) update.next_objectives = rest.nextObjectives
    if (rest.guardianFeedback !== undefined) update.guardian_feedback = rest.guardianFeedback
    if (rest.sessionQuality !== undefined) update.session_quality = rest.sessionQuality

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

    setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
  }

  async function deleteConsultation(id) {
    await supabase.from('consultations').delete().eq('id', id)
    setConsultations(prev => prev.filter(c => c.id !== id))
  }

  // ─── Therapists ─────────────────────────────────────────────────────────────

  async function addTherapist(data) {
    const { data: inserted, error } = await supabase
      .from('therapists')
      .insert({
        name: data.name,
        specialty: data.specialty,
        email: data.email || null,
        phone: data.phone || null,
        bio: data.bio || null,
        credential: data.credential || null,
        active: true,
      })
      .select()
      .single()

    if (error) { console.error(error); return }
    const newTherapist = mapTherapist(inserted)
    setTherapists(prev => [...prev, newTherapist])
    return newTherapist
  }

  async function updateTherapist(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.specialty !== undefined) update.specialty = data.specialty
    if (data.email !== undefined) update.email = data.email || null
    if (data.phone !== undefined) update.phone = data.phone || null
    if (data.bio !== undefined) update.bio = data.bio || null
    if (data.credential !== undefined) update.credential = data.credential || null
    if (data.active !== undefined) update.active = data.active

    await supabase.from('therapists').update(update).eq('id', id)
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
      .insert({ key: data.key, label: data.label, active: true })
      .select().single()
    if (error) { console.error(error); return }
    const item = mapSpecialty(inserted)
    setSpecialtiesData(prev => [...prev, item])
    return item
  }

  async function updateSpecialtyData(id, data) {
    const update = {}
    if (data.key !== undefined) update.key = data.key
    if (data.label !== undefined) update.label = data.label
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
    if (error) { console.error(error); return }
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
    if (error) { console.error(error); return }
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
    if (error) { console.error(error); return }
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
      .insert({ name: data.name, description: data.description || null, active: true })
      .select().single()
    if (error) { console.error(error); return }
    const item = mapRoom(inserted)
    setRooms(prev => [...prev, item])
    return item
  }

  async function updateRoom(id, data) {
    const update = {}
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description || null
    if (data.active !== undefined) update.active = data.active
    await supabase.from('rooms').update(update).eq('id', id)
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }

  // ─── Value ───────────────────────────────────────────────────────────────────

  const value = {
    isLoading,
    patients, addPatient, updatePatient, deletePatient, restorePatient, getPatientById,
    guardians, addGuardian, updateGuardian, deleteGuardian, restoreGuardian, getGuardianById, getGuardiansForPatient,
    appointments, addAppointment, updateAppointment, deleteAppointment,
    consultations, addConsultation, updateConsultation, deleteConsultation,
    therapists, addTherapist, updateTherapist, deleteTherapist, getTherapistById,
    specialtiesData, addSpecialtyData, updateSpecialtyData,
    paymentMethods, addPaymentMethod, updatePaymentMethod,
    diagnoses, addDiagnosis, updateDiagnosis,
    patientStatuses, addPatientStatus, updatePatientStatus,
    rooms, addRoom, updateRoom,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
