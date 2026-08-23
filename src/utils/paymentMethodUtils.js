// Ordenação centralizada de Formas de Pagamento: registros com "Ordem" (displayOrder)
// preenchida vêm primeiro, em ordem crescente (desempate alfabético); os demais vêm
// depois, ordenados alfabeticamente.
export function sortPaymentMethods(list) {
  return [...list].sort((a, b) => {
    const aHas = a.displayOrder != null
    const bHas = b.displayOrder != null
    if (aHas && bHas) {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    }
    if (aHas !== bHas) return aHas ? -1 : 1
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  })
}
