export function calcAdjustmentAmount(bankBalance: number, appBalance: number): number {
  return Math.round((bankBalance - appBalance) * 100) / 100
}

export function isBalanced(bankBalance: number, appBalance: number): boolean {
  return calcAdjustmentAmount(bankBalance, appBalance) === 0
}
