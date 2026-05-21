export const CONFLICT_DURATION = 50 // minutos fixos por atendimento

export const CONFLICT_TYPES = {
  THERAPIST_OVERLAP:           'THERAPIST_OVERLAP',
  ROOM_OVERLAP:                'ROOM_OVERLAP',
  THERAPIST_UNAVAILABLE_TOTAL: 'THERAPIST_UNAVAILABLE_TOTAL',
  THERAPIST_UNAVAILABLE_PARTIAL: 'THERAPIST_UNAVAILABLE_PARTIAL',
}

export const CONFLICT_LABELS = {
  THERAPIST_OVERLAP:             'Conflito de terapeuta',
  ROOM_OVERLAP:                  'Conflito de sala',
  THERAPIST_UNAVAILABLE_TOTAL:   'Bloqueio rígido',
  THERAPIST_UNAVAILABLE_PARTIAL: 'Bloqueio flex',
}

function timeToMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

/**
 * Detecta conflitos para um atendimento contra todos os atendimentos carregados.
 * @param {object} input - { id, date, time, therapistId, roomId, consultationTherapists[] }
 * @param {array}  allConsultations - todos os atendimentos do DataContext
 * @param {array}  calendarBlocks - bloqueios de agenda do DataContext
 * @returns {array} conflitos detectados
 */
export function detectConflicts(input, allConsultations, calendarBlocks = []) {
  const { id, date, time, therapistId, roomId, consultationTherapists = [] } = input
  if (!date || !time) return []

  const startA = timeToMinutes(time)
  if (startA === null) return []
  const endA = startA + CONFLICT_DURATION

  const allTherapistIds = [
    therapistId,
    ...consultationTherapists
      .filter(ct => !ct.isPrimary && ct.therapistId)
      .map(ct => ct.therapistId),
  ].filter(Boolean)

  const conflicts = []

  // ── 1. Overlap com outros atendimentos ──────────────────────────────────────
  const sameDayConsultations = allConsultations.filter(c =>
    c.id !== id && c.date === date && c.time
  )

  for (const c of sameDayConsultations) {
    const startB = timeToMinutes(c.time)
    if (startB === null) continue
    const endB = startB + CONFLICT_DURATION
    if (!hasTimeOverlap(startA, endA, startB, endB)) continue

    const cTherapistIds = [
      c.therapistId,
      ...(c.consultationTherapists || [])
        .filter(ct => !ct.isPrimary && ct.therapistId)
        .map(ct => ct.therapistId),
    ].filter(Boolean)

    // Conflito de terapeuta
    for (const tid of allTherapistIds) {
      if (cTherapistIds.includes(tid)) {
        conflicts.push({
          conflictType: CONFLICT_TYPES.THERAPIST_OVERLAP,
          relatedConsultationId: c.id,
          therapistId: tid,
          conflictDate: date,
          startTime: minutesToTime(startA),
          endTime: minutesToTime(endA),
          description: `Conflito com atendimento em ${c.time}`,
        })
      }
    }

    // Conflito de sala
    if (roomId && c.roomId && roomId === c.roomId) {
      conflicts.push({
        conflictType: CONFLICT_TYPES.ROOM_OVERLAP,
        relatedConsultationId: c.id,
        roomId,
        conflictDate: date,
        startTime: minutesToTime(startA),
        endTime: minutesToTime(endA),
        description: `Sala ocupada — outro atendimento em ${c.time}`,
      })
    }
  }

  // ── 2. Bloqueio de agenda do terapeuta ──────────────────────────────────────
  const sameDayBlocks = calendarBlocks.filter(b =>
    b.date === date &&
    !b.cancelled &&
    b.active !== false &&
    allTherapistIds.includes(b.therapistId)
  )

  for (const b of sameDayBlocks) {
    const blockStart = timeToMinutes(b.startTime)
    const blockEnd   = timeToMinutes(b.endTime)
    if (blockStart === null || blockEnd === null) continue
    if (!hasTimeOverlap(startA, endA, blockStart, blockEnd)) continue

    const isRigid = b.blockType === 'RIGID'
    conflicts.push({
      conflictType: isRigid
        ? CONFLICT_TYPES.THERAPIST_UNAVAILABLE_TOTAL
        : CONFLICT_TYPES.THERAPIST_UNAVAILABLE_PARTIAL,
      therapistId: b.therapistId,
      calendarBlockId: b.id,
      conflictDate: date,
      startTime: minutesToTime(startA),
      endTime: minutesToTime(endA),
      description: b.description
        ? `${isRigid ? 'Bloqueio rígido' : 'Bloqueio flex'}: ${b.description}`
        : (isRigid
            ? 'Terapeuta com bloqueio rígido neste horário'
            : 'Terapeuta com bloqueio flex neste horário'),
    })
  }

  return conflicts
}

/**
 * Detecta conflitos para cada data de uma série.
 * @returns {array} [{date, conflicts[]}] — só datas com conflito
 */
export function detectSeriesConflicts(seriesInput, dates, allConsultations, calendarBlocks = []) {
  return dates
    .map(date => ({
      date,
      conflicts: detectConflicts(
        {
          id: null,
          date,
          time: seriesInput.time,
          therapistId: seriesInput.primaryTherapistId,
          roomId: seriesInput.roomId || null,
          consultationTherapists: [],
        },
        allConsultations,
        calendarBlocks
      ),
    }))
    .filter(({ conflicts }) => conflicts.length > 0)
}
