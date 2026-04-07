import { SPECIALTIES, APPOINTMENT_STATUS, PATIENT_STATUS, SESSION_QUALITY } from '../../constants/specialties'
import { useData } from '../../context/DataContext'

function hexTextColor(hex) {
  if (!hex || hex.length < 7) return '#111827'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#111827' : '#ffffff'
}

export default function Badge({ specialty, status, patientStatus, quality, children, className = '' }) {
  const { specialtiesData } = useData()

  if (specialty) {
    const dynamic = specialtiesData?.find(s => s.key === specialty)
    if (dynamic?.color) {
      return (
        <span
          style={{ backgroundColor: dynamic.color, color: hexTextColor(dynamic.color) }}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
        >
          {dynamic.label || specialty}
        </span>
      )
    }
    const hardcoded = SPECIALTIES[specialty]
    if (hardcoded) {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hardcoded.color} ${className}`}>
          {hardcoded.label}
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${className}`}>
        {dynamic?.label || specialty}
      </span>
    )
  }
  if (status && APPOINTMENT_STATUS[status]) {
    const s = APPOINTMENT_STATUS[status]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color} ${className}`}>
        {s.label}
      </span>
    )
  }
  if (patientStatus && PATIENT_STATUS[patientStatus]) {
    const s = PATIENT_STATUS[patientStatus]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color} ${className}`}>
        {s.label}
      </span>
    )
  }
  if (quality && SESSION_QUALITY[quality]) {
    const s = SESSION_QUALITY[quality]
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color} ${className}`}>
        {s.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${className}`}>
      {children}
    </span>
  )
}
