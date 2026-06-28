export function canDeleteCategory(transactionCount: number): boolean {
  return transactionCount === 0
}

export function canDeleteGroup(categoryTransactionCounts: number[]): boolean {
  return categoryTransactionCounts.every((count) => count === 0)
}

export function canEditItem(isSystem: boolean): boolean {
  return !isSystem
}

export function canArchiveItem(isSystem: boolean): boolean {
  return !isSystem
}
