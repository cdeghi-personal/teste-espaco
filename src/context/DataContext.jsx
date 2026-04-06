import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  supabase,
  mapPatient, mapGuardian, mapTherapist, mapAppointment, mapConsultation,
  mapSpecialty, mapPaymentMethod, mapDiagnosis, mapPatientStatus, mapRoom,
  mapConsultationStatus, mapAppointmentType, mapExam, mapMedication, mapConduct,
  syncPatientRelations, syncGuardianPatients,
  syncTherapistSpecialties, syncExternalTherapists,
} from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

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
  school_name, school_phone, school_address, school_neighborhood,
  school_city, school_state, school_zip, school_coordinator,
  doctor_insurance, doctor_name, doctor_specialty, doctor_phone,
  diagnosis, notes, deleted,
  status_id, payment_method_id, primary_therapist_id, created_at, updated_at,
  patient_specialties(specialty),
  patient_conditions(diagnosis_id),
  patient_external_therapists(id, name, specialty, phone, sort_order)
`

const GUARDIAN_SELECT = `
  id, full_name, relationship, phone, email, cpf, occupation, notes, active, created_at,
  patient_guardians(patient_id)
`

const CONSULTATION_SELECT = `
  id, patient_id, therapist_id, specialty, date, session_number,
  consultation_status_id, appointment_type_id,
  main_objective, evolution_notes, next_objectives, guardian_feedback,
  session_quality, created_at,
  consultation_activities(id, name, description, outcome, sort_order)
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
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    const [
      patientsRes, guardiansRes, appointmentsRes, consultationsRes,
      therapistsRes, specialtiesRes, paymentRes, diagnosesRes, statusesRes, roomsRes, consultStatusRes, apptTypesRes,
    ] = await Promise.all([
      supabase.from('patients').select(PATIENT_SELECT).eq('deleted', false),
      supabase.from('guardians').select(GUARDIAN_SELECT),
      supabase.from('appointments').select('*').order('date').order('time'),
      supabase.from('consultations').select(CONSULTATION_SELECT).order('date', { ascending: false }),
      supabase.from('therapists').select('*, therapist_specialties(specialty, credential)').order('name'),
      supabase.from('specialties').select('*').order('label'),
      supabase.from('payment_methods').select('*').order('name'),
      supabase.from('diagnoses').select('*').order('name'),
      supabase.from('patient_statuses').select('*').order('name'),
      supabase.from('rooms').select('*').order('name'),
      supabase.from('consultation_statuses').select('*').order('name'),
      supabase.from('appointment_types').select('*').order('name'),
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
        school_address: data.schoolAddress || null,
        school_neighborhood: data.schoolNeighborhood || null,
        school_city: data.schoolCity || null,
        school_state: data.schoolState || null,
        school_zip: data.schoolZip || null,
        school_coordinator: data.schoolCoordinator || null,
        doctor_insurance: data.doctorInsurance || null,
        doctor_name: data.doctorName || null,
        doctor_specialty: data.doctorSpecialty || null,
        doctor_phone: data.doctorPhone || null,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
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

    const newPatient = mapPatient({
      ...inserted,
      patient_specialties: (data.specialties || []).map(s => ({ specialty: s })),
      patient_conditions: (data.conditionIds || []).map(id => ({ diagnosis_id: id })),
      patient_external_therapists: (data.externalTherapists || []).map((t, i) => ({ ...t, sort_order: i })),
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
    if (data.schoolAddress !== undefined) update.school_address = data.schoolAddress || null
    if (data.schoolNeighborhood !== undefined) update.school_neighborhood = data.schoolNeighborhood || null
    if (data.schoolCity !== undefined) update.school_city = data.schoolCity || null
    if (data.schoolState !== undefined) update.school_state = data.schoolState || null
    if (data.schoolZip !== undefined) update.school_zip = data.schoolZip || null
    if (data.schoolCoordinator !== undefined) update.school_coordinator = data.schoolCoordinator || null
    if (data.doctorInsurance !== undefined) update.doctor_insurance = data.doctorInsurance || null
    if (data.doctorName !== undefined) update.doctor_name = data.doctorName || null
    if (data.doctorSpecialty !== undefined) update.doctor_specialty = data.doctorSpecialty || null
    if (data.doctorPhone !== undefined) update.doctor_phone = data.doctorPhone || null
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
      ...(data.conditionIds !== undefined && { conditionIds: data.conditionIds }),
    })
    if (data.externalTherapists !== undefined) {
      await syncExternalTherapists(id, data.externalTherapists)
    }

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

    if (error) return dbError(error, toast)

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
        consultation_status_id: rest.consultationStatusId || null,
        appointment_type_id: rest.appointmentTypeId || null,
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
    if (rest.consultationStatusId !== undefined) update.consultation_status_id = rest.consultationStatusId || null
    if (rest.appointmentTypeId !== undefined) update.appointment_type_id = rest.appointmentTypeId || null
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
    if (data.active !== undefined) update.active = data.active

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
      .insert({ key: data.key, label: data.label, active: true })
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
      .insert({ name: data.name, description: data.description || null, active: true })
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
    if (data.active !== undefined) update.active = data.active
    await supabase.from('rooms').update(update).eq('id', id)
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
  }

  // ─── Consultation Statuses ────────────────────────────────────────────────────

  async function addConsultationStatus(data) {
    const { data: inserted, error } = await supabase
      .from('consultation_statuses')
      .insert({ name: data.name, color: data.color || 'bg-gray-100 text-gray-700', active: true })
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
    const { data: existing } = await supabase
      .from('medical_records')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle()
    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from('medical_records')
      .insert({ patient_id: patientId, created_by: authUserId || null })
      .select('id').single()
    if (error) { dbError(error, toast); return null }
    return created.id
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
    consultationStatuses, addConsultationStatus, updateConsultationStatus,
    appointmentTypes, addAppointmentType, updateAppointmentType,
    // Medical Records
    getOrCreateMedicalRecord,
    getExams, addExam, updateExam, deleteExam,
    getMedications, addMedication, updateMedication, deleteMedication,
    getConducts, addConduct, updateConduct, deleteConduct,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
