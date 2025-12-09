/**
 * 2つの数値を加算する
 * @param a - 1つ目の数値
 * @param b - 2つ目の数値
 * @returns 加算結果
 */
export function add(a: number, b: number): number {
  return a + b
}

/**
 * 文字列が日本語を含むかチェックする
 * @param text - チェック対象のテキスト
 * @returns 日本語を含む場合true
 */
export function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)
}
