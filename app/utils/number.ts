/** Округление до двух знаков после запятой (частый кейс в таблицах баллов). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
