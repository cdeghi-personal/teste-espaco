export const ROUTES = {
  // Public
  HOME:     '/',
  ABOUT:    '/sobre',
  SERVICES: '/servicos',
  TEAM:     '/equipe',
  CONTACT:  '/contato',
  // Auth
  LOGIN:    '/login',
  // Admin
  DASHBOARD:        '/admin',
  AGENDA:           '/admin/agenda',
  PATIENTS:         '/admin/pacientes',
  PATIENT_DETAIL:   '/admin/pacientes/:id',
  GUARDIANS:        '/admin/responsaveis',
  CONSULTATIONS:    '/admin/consultas',
  MEDICAL_RECORDS:  '/admin/prontuario',
  // Admin - Cadastros
  THERAPISTS:           '/admin/terapeutas',
  SPECIALTIES_ADMIN:    '/admin/especialidades',
  PAYMENT_METHODS:      '/admin/formapagamento',
  DIAGNOSES:            '/admin/diagnostico',
  PATIENT_STATUS:       '/admin/statuspaciente',
  CONSULTATION_STATUS:  '/admin/statusconsulta',
  ROOMS:                '/admin/salas',
}
