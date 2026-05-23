export const CONFLICT_DURATION = 50 // minutos fixos por atendimento

export const CONFLICT_TYPES = {
  THERAPIST_OVERLAP:             'THERAPIST_OVERLAP',
  ROOM_OVERLAP:                  'ROOM_OVERLAP',
  THERAPIST_UNAVAILABLE_TOTAL:   'THERAPIST_UNAVAILABLE_TOTAL',
  THERAPIST_UNAVAILABLE_PARTIAL: 'THERAPIST_UNAVAILABLE_PARTIAL',
  BLOCK_OVERLAP:                 'BLOCK_OVERLAP',
}

export const CONFLICT_LABELS = {
  THERAPIST_OVERLAP:             'Conflito de terapeuta',
  ROOM_OVERLAP:                  'Conflito de sala',
  THERAPIST_UNAVAILABLE_TOTAL:   'Bloqueio rígido',
  THERAPIST_UNAVAILABLE_PARTIAL: 'Bloqueio flex',
  BLOCK_OVERLAP:                 'Bloqueios sobrepostos',
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
  const { id, date, time, therapistId, roomId, consultationTherapists = [], eventType, interviewFormat } = input
  if (!date || !time) return []
  const isRemoteInterview = eventType === 'INTERVIEW' && interviewFormat === 'REMOTE'

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
        const cf = {
          conflictType: CONFLICT_TYPES.THERAPIST_OVERLAP,
          relatedConsultationId: c.id,
          therapistId: tid,
          conflictDate: date,
          startTime: minutesToTime(startA),
          endTime: minutesToTime(endA),
          description: `Conflito com atendimento em ${c.time}`,
        }
        conflicts.push(cf)
        console.log('[CONFLICT_DETECT_DEBUG]', { sourceType: 'consultation', sourceId: id, targetType: 'consultation', targetId: c.id, conflictType: cf.conflictType, description: cf.description })
      }
    }

    // Conflito de sala (entrevistas remotas não ocupam sala)
    if (!isRemoteInterview && roomId && c.roomId && roomId === c.roomId) {
      const cf = {
        conflictType: CONFLICT_TYPES.ROOM_OVERLAP,
        relatedConsultationId: c.id,
        roomId,
        conflictDate: date,
        startTime: minutesToTime(startA),
        endTime: minutesToTime(endA),
        description: `Sala ocupada — outro atendimento em ${c.time}`,
      }
      conflicts.push(cf)
      console.log('[CONFLICT_DETECT_DEBUG]', { sourceType: 'consultation', sourceId: id, targetType: 'consultation', targetId: c.id, conflictType: cf.conflictType, description: cf.description })
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
    // Entrevista remota não conflita com bloqueio Flex
    if (isRemoteInterview && b.blockType === 'FLEX') continue
    const blockStart = timeToMinutes(b.startTime)
    const blockEnd   = timeToMinutes(b.endTime)
    if (blockStart === null || blockEnd === null) continue
    if (!hasTimeOverlap(startA, endA, blockStart, blockEnd)) continue

    const isRigid = b.blockType === 'RIGID'
    const cf = {
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
    }
    conflicts.push(cf)
    console.log('[CONFLICT_DETECT_DEBUG]', { sourceType: 'consultation', sourceId: id, targetType: 'block', targetId: b.id, conflictType: cf.conflictType, description: cf.description })
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
          eventType: seriesInput.eventType || 'SESSION',
          interviewFormat: seriesInput.interviewFormat || null,
          consultationTherapists: [],
        },
        allConsultations,
        calendarBlocks
      ),
    }))
    .filter(({ conflicts }) => conflicts.length > 0)
}

/**
 * Detecta conflitos para um bloqueio de agenda (perspectiva do bloqueio):
 * - bloqueio × atendimento (mesmo terapeuta, mesmo dia, horários sobrepostos)
 * - bloqueio × bloqueio   (mesmo terapeuta, mesmo dia, horários sobrepostos)
 */
export function getCalendarBlockConflicts(block, allConsultations, allBlocks = []) {
  if (!block.startTime || !block.endTime || block.cancelled) return []
  const bStart = timeToMinutes(block.startTime)
  const bEnd   = timeToMinutes(block.endTime)
  if (bStart === null || bEnd === null) return []

  const conflicts = []

  // 1. Conflito com atendimentos
  for (const c of allConsultations) {
    if (c.date !== block.date || !c.time) continue
    // Bloqueio Flex não conflita com entrevista remota
    if (block.blockType === 'FLEX' && c.eventType === 'INTERVIEW' && c.interviewFormat === 'REMOTE') continue
    const cStart = timeToMinutes(c.time)
    if (cStart === null) continue
    const cEnd = cStart + CONFLICT_DURATION
    if (!hasTimeOverlap(bStart, bEnd, cStart, cEnd)) continue

    const therapistIds = [
      c.therapistId,
      ...(c.consultationTherapists || []).map(ct => ct.therapistId),
    ].filter(Boolean)
    if (!therapistIds.includes(block.therapistId)) continue

    const conflictType = block.blockType === 'RIGID'
      ? CONFLICT_TYPES.THERAPIST_UNAVAILABLE_TOTAL
      : CONFLICT_TYPES.THERAPIST_UNAVAILABLE_PARTIAL

    const cf = {
      conflictType,
      relatedConsultationId: c.id,
      therapistId: block.therapistId,
      conflictDate: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      description: `Atendimento em conflito às ${c.time?.slice(0, 5)}`,
    }
    conflicts.push(cf)
    console.log('[CONFLICT_DETECT_DEBUG]', { sourceType: 'block', sourceId: block.id, targetType: 'consultation', targetId: c.id, conflictType: cf.conflictType, description: cf.description })
  }

  // 2. Conflito com outros bloqueios do mesmo terapeuta
  for (const other of allBlocks) {
    if (other.id === block.id || other.cancelled || other.date !== block.date) continue
    if (other.therapistId !== block.therapistId) continue
    const oStart = timeToMinutes(other.startTime)
    const oEnd   = timeToMinutes(other.endTime)
    if (oStart === null || oEnd === null) continue
    if (!hasTimeOverlap(bStart, bEnd, oStart, oEnd)) continue

    const cf = {
      conflictType: CONFLICT_TYPES.BLOCK_OVERLAP,
      relatedBlockId: other.id,
      therapistId: block.therapistId,
      conflictDate: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      description: `Sobreposição com bloqueio ${other.startTime?.slice(0, 5)}–${other.endTime?.slice(0, 5)}`,
    }
    conflicts.push(cf)
    console.log('[CONFLICT_DETECT_DEBUG]', { sourceType: 'block', sourceId: block.id, targetType: 'block', targetId: other.id, conflictType: cf.conflictType, description: cf.description })
  }

  return conflicts
}

function fmtDatePT(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

function fmtTimePT(time) {
  return time ? time.slice(0, 5) : '?'
}

function addMinutes(time, mins) {
  const t = timeToMinutes(time)
  if (t === null) return null
  return minutesToTime(t + mins)
}

function eventTypeLabel(c) {
  if (!c || c.eventType !== 'INTERVIEW') return 'Atendimento'
  return c.interviewFormat === 'REMOTE' ? 'Entrevista Remota' : 'Entrevista Presencial'
}

function consultationSubject(c, patients) {
  if (!c) return null
  if (c.intervieweeName) return c.intervieweeName
  const patient = patients.find(p => p.id === c.patientId)
  return patient?.fullName || null
}

/**
 * Constrói texto de tooltip rico para chips de conflito.
 * @param {array}  conflicts
 * @param {object} opts - { therapists[], rooms[], patients[], consultations[], calendarBlocks[] }
 */
export function buildConflictTooltip(conflicts, {
  therapists = [], rooms = [], patients = [], consultations = [], calendarBlocks = []
} = {}) {
  if (!conflicts || conflicts.length === 0) return ''

  const fT = id => therapists.find(t => t.id === id)
  const fR = id => rooms.find(r => r.id === id)
  const fC = id => consultations.find(c => c.id === id)
  const fB = id => calendarBlocks.find(b => b.id === id)

  return conflicts.map(cf => {
    const therapist = fT(cf.therapistId)
    const tName = therapist?.name || 'Terapeuta'
    const dateStr = fmtDatePT(cf.conflictDate)

    switch (cf.conflictType) {

      case CONFLICT_TYPES.THERAPIST_OVERLAP: {
        const relC = fC(cf.relatedConsultationId)
        const subject = consultationSubject(relC, patients)
        const relType = eventTypeLabel(relC)
        const relEnd = relC?.time ? addMinutes(relC.time, CONFLICT_DURATION) : null
        let msg = `⚠ ${tName} já possui ${relType}`
        if (subject) msg += ` de ${subject}`
        if (dateStr) msg += ` em ${dateStr}`
        if (relC?.time) msg += ` das ${fmtTimePT(relC.time)} às ${relEnd ? fmtTimePT(relEnd) : '?'}`
        return msg + '.'
      }

      case CONFLICT_TYPES.ROOM_OVERLAP: {
        const relC = fC(cf.relatedConsultationId)
        const subject = consultationSubject(relC, patients)
        const relTherapist = relC ? fT(relC.therapistId) : null
        const room = fR(cf.roomId)
        const relType = eventTypeLabel(relC)
        const relEnd = relC?.time ? addMinutes(relC.time, CONFLICT_DURATION) : null
        let msg = `⚠ Sala ${room?.name || '?'} ocupada: ${relType}`
        if (subject) msg += ` de ${subject}`
        if (relTherapist) msg += ` (${relTherapist.name})`
        if (dateStr) msg += ` em ${dateStr}`
        if (relC?.time) msg += ` das ${fmtTimePT(relC.time)} às ${relEnd ? fmtTimePT(relEnd) : '?'}`
        return msg + '.'
      }

      case CONFLICT_TYPES.THERAPIST_UNAVAILABLE_TOTAL:
      case CONFLICT_TYPES.THERAPIST_UNAVAILABLE_PARTIAL: {
        const isRigid = cf.conflictType === CONFLICT_TYPES.THERAPIST_UNAVAILABLE_TOTAL
        const blockLabel = isRigid ? 'Bloqueio Rígido' : 'Bloqueio Flex'

        if (cf.calendarBlockId) {
          // perspectiva do atendimento: mostra detalhes do bloqueio
          const blk = fB(cf.calendarBlockId)
          let msg = `⚠ ${tName} possui ${blockLabel}`
          if (dateStr) msg += ` em ${dateStr}`
          if (blk) msg += ` das ${fmtTimePT(blk.startTime)} às ${fmtTimePT(blk.endTime)}`
          if (blk?.description) msg += ` (${blk.description})`
          return msg + '.'
        }

        // perspectiva do bloqueio: mostra detalhes do atendimento conflitante
        const relC = fC(cf.relatedConsultationId)
        const subject = consultationSubject(relC, patients)
        const relType = eventTypeLabel(relC)
        const relEnd = relC?.time ? addMinutes(relC.time, CONFLICT_DURATION) : null
        let msg = `⚠ ${blockLabel} de ${tName} conflita com ${relType}`
        if (subject) msg += ` de ${subject}`
        if (dateStr) msg += ` em ${dateStr}`
        if (relC?.time) msg += ` das ${fmtTimePT(relC.time)} às ${relEnd ? fmtTimePT(relEnd) : '?'}`
        return msg + '.'
      }

      case CONFLICT_TYPES.BLOCK_OVERLAP: {
        const other = fB(cf.relatedBlockId)
        const otherLabel = other?.blockType === 'RIGID' ? 'Bloqueio Rígido' : 'Bloqueio Flex'
        let msg = `⚠ Bloqueio de ${tName} se sobrepõe a ${otherLabel}`
        if (dateStr) msg += ` em ${dateStr}`
        if (other) msg += ` das ${fmtTimePT(other.startTime)} às ${fmtTimePT(other.endTime)}`
        if (other?.description) msg += ` (${other.description})`
        return msg + '.'
      }

      default: {
        const room = fR(cf.roomId)
        const parts = [CONFLICT_LABELS[cf.conflictType] || cf.conflictType]
        if (therapist)      parts.push(`Terapeuta: ${therapist.name}`)
        if (room)           parts.push(`Sala: ${room.name}`)
        if (cf.description) parts.push(cf.description)
        return parts.join(' | ')
      }
    }
  }).join('\n')
}
