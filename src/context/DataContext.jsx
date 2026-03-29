import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_PATIENTS } from '../data/mockPatients'
import { MOCK_GUARDIANS } from '../data/mockGuardians'
import { MOCK_APPOINTMENTS } from '../data/mockAppointments'
import { MOCK_CONSULTATIONS } from '../data/mockConsultations'
import { MOCK_THERAPISTS } from '../data/mockTherapists'
import { MOCK_SPECIALTIES_DATA } from '../data/mockSpecialties'
import { MOCK_PAYMENT_METHODS } from '../data/mockPaymentMethods'
import { MOCK_DIAGNOSES } from '../data/mockDiagnoses'
import { MOCK_PATIENT_STATUSES } from '../data/mockPatientStatuses'
import { MOCK_ROOMS } from '../data/mockRooms'
import { storageGet, storageSet, generateId } from '../utils/storageUtils'

const DataContext = createContext(null)

function seed(key, mockData) {
  const stored = storageGet(key)
  if (stored) return stored
  storageSet(key, mockData)
  return mockData
}

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

  useEffect(() => {
    setPatients(seed('patients', MOCK_PATIENTS))
    setGuardians(seed('guardians', MOCK_GUARDIANS))
    setAppointments(seed('appointments', MOCK_APPOINTMENTS))
    setConsultations(seed('consultations', MOCK_CONSULTATIONS))
    setTherapists(seed('therapists', MOCK_THERAPISTS))
    setSpecialtiesData(seed('specialties_data', MOCK_SPECIALTIES_DATA))
    setPaymentMethods(seed('payment_methods', MOCK_PAYMENT_METHODS))
    setDiagnoses(seed('diagnoses', MOCK_DIAGNOSES))
    setPatientStatuses(seed('patient_statuses', MOCK_PATIENT_STATUSES))
    setRooms(seed('rooms', MOCK_ROOMS))
  }, [])

  function persist(key, setter, newData) {
    storageSet(key, newData)
    setter(newData)
  }

  // --- Patients ---
  function addPatient(data) {
    const newItem = {
      ...data,
      id: generateId(),
      secondaryTherapistIds: data.secondaryTherapistIds || [],
      paymentMethodId: data.paymentMethodId || '',
      conditionIds: data.conditionIds || [],
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    persist('patients', setPatients, [...patients, newItem])
    return newItem
  }
  function updatePatient(id, updates) {
    const updated = patients.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    )
    persist('patients', setPatients, updated)
  }
  function deletePatient(id) {
    const updated = patients.map(p =>
      p.id === id ? { ...p, deleted: true, updatedAt: new Date().toISOString() } : p
    )
    persist('patients', setPatients, updated)
  }
  function restorePatient(id) {
    const updated = patients.map(p =>
      p.id === id ? { ...p, deleted: false, updatedAt: new Date().toISOString() } : p
    )
    persist('patients', setPatients, updated)
  }
  function getPatientById(id) {
    return patients.find(p => p.id === id)
  }

  // --- Guardians ---
  function addGuardian(data) {
    const newItem = { ...data, id: generateId(), patientIds: data.patientIds || [], active: true, createdAt: new Date().toISOString() }
    persist('guardians', setGuardians, [...guardians, newItem])
    return newItem
  }
  function updateGuardian(id, updates) {
    const updated = guardians.map(g => g.id === id ? { ...g, ...updates } : g)
    persist('guardians', setGuardians, updated)
  }
  function deleteGuardian(id) {
    const updated = guardians.map(g => g.id === id ? { ...g, active: false } : g)
    persist('guardians', setGuardians, updated)
  }
  function restoreGuardian(id) {
    const updated = guardians.map(g => g.id === id ? { ...g, active: true } : g)
    persist('guardians', setGuardians, updated)
  }
  function getGuardianById(id) {
    return guardians.find(g => g.id === id)
  }

  // --- Appointments ---
  function addAppointment(data) {
    const newItem = { ...data, id: generateId(), consultationId: null, createdAt: new Date().toISOString() }
    persist('appointments', setAppointments, [...appointments, newItem])
    return newItem
  }
  function updateAppointment(id, updates) {
    const updated = appointments.map(a => a.id === id ? { ...a, ...updates } : a)
    persist('appointments', setAppointments, updated)
  }
  function deleteAppointment(id) {
    persist('appointments', setAppointments, appointments.filter(a => a.id !== id))
  }

  // --- Consultations ---
  function addConsultation(data) {
    const newItem = { ...data, id: generateId(), createdAt: new Date().toISOString() }
    persist('consultations', setConsultations, [...consultations, newItem])
    if (data.appointmentId) {
      updateAppointment(data.appointmentId, { consultationId: newItem.id, status: 'completed' })
    }
    return newItem
  }
  function updateConsultation(id, updates) {
    const updated = consultations.map(c => c.id === id ? { ...c, ...updates } : c)
    persist('consultations', setConsultations, updated)
  }
  function deleteConsultation(id) {
    persist('consultations', setConsultations, consultations.filter(c => c.id !== id))
  }

  // --- Therapists ---
  function addTherapist(data) {
    const newItem = { ...data, id: generateId(), active: true }
    persist('therapists', setTherapists, [...therapists, newItem])
    return newItem
  }
  function updateTherapist(id, updates) {
    const updated = therapists.map(t => t.id === id ? { ...t, ...updates } : t)
    persist('therapists', setTherapists, updated)
  }
  function deleteTherapist(id) {
    const updated = therapists.map(t => t.id === id ? { ...t, active: false } : t)
    persist('therapists', setTherapists, updated)
  }
  function getTherapistById(id) { return therapists.find(t => t.id === id) }

  // --- Specialties Data ---
  function addSpecialtyData(data) {
    const newItem = { ...data, id: generateId(), active: true }
    persist('specialties_data', setSpecialtiesData, [...specialtiesData, newItem])
    return newItem
  }
  function updateSpecialtyData(id, updates) {
    const updated = specialtiesData.map(s => s.id === id ? { ...s, ...updates } : s)
    persist('specialties_data', setSpecialtiesData, updated)
  }

  // --- Payment Methods ---
  function addPaymentMethod(data) {
    const newItem = { ...data, id: generateId(), active: true }
    persist('payment_methods', setPaymentMethods, [...paymentMethods, newItem])
    return newItem
  }
  function updatePaymentMethod(id, updates) {
    const updated = paymentMethods.map(pm => pm.id === id ? { ...pm, ...updates } : pm)
    persist('payment_methods', setPaymentMethods, updated)
  }

  // --- Diagnoses ---
  function addDiagnosis(data) {
    const newItem = { ...data, id: generateId(), active: true }
    persist('diagnoses', setDiagnoses, [...diagnoses, newItem])
    return newItem
  }
  function updateDiagnosis(id, updates) {
    const updated = diagnoses.map(d => d.id === id ? { ...d, ...updates } : d)
    persist('diagnoses', setDiagnoses, updated)
  }

  // --- Patient Statuses ---
  function addPatientStatus(data) {
    const newItem = { ...data, id: generateId(), active: true }
    persist('patient_statuses', setPatientStatuses, [...patientStatuses, newItem])
    return newItem
  }
  function updatePatientStatus(id, updates) {
    const updated = patientStatuses.map(s => s.id === id ? { ...s, ...updates } : s)
    persist('patient_statuses', setPatientStatuses, updated)
  }

  // --- Rooms ---
  function addRoom(data) {
    const newItem = { ...data, id: generateId(), active: true }
    persist('rooms', setRooms, [...rooms, newItem])
    return newItem
  }
  function updateRoom(id, updates) {
    const updated = rooms.map(r => r.id === id ? { ...r, ...updates } : r)
    persist('rooms', setRooms, updated)
  }

  // Helper: get guardians linked to a patient (via guardian.patientIds)
  function getGuardiansForPatient(patientId) {
    return guardians.filter(g => g.active !== false && (g.patientIds || []).includes(patientId))
  }

  const value = {
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
