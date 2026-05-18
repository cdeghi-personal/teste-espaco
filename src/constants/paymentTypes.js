export const PAYMENT_TYPES = {
  POST_PER_SESSION: 'POST_PER_SESSION',
  POST_MONTHLY: 'POST_MONTHLY',
  PREPAID_PACKAGE: 'PREPAID_PACKAGE',
  PAY_PER_SESSION: 'PAY_PER_SESSION',
}

export const PAYMENT_TYPE_LABELS = {
  POST_PER_SESSION: 'Pós-pago por consulta',
  POST_MONTHLY: 'Pós-pago mensal fixo',
  PREPAID_PACKAGE: 'Pré-pago por pacote',
  PAY_PER_SESSION: 'Por Sessão',
}

export const PAYMENT_TYPE_OPTIONS = [
  { value: 'POST_PER_SESSION', label: 'Pós-pago por consulta' },
  { value: 'POST_MONTHLY', label: 'Pós-pago mensal fixo' },
  { value: 'PREPAID_PACKAGE', label: 'Pré-pago por pacote' },
  { value: 'PAY_PER_SESSION', label: 'Por Sessão' },
]
