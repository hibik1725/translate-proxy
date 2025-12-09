import { visit } from 'unist-util-visit'
import type { Root, Text, Element } from 'hast'
import { containsJapanese } from '../utils.js'

export interface TextNode {
  node: Text
  value: string
}

// 翻訳対象外のタグ
const EXCLUDE_TAGS = ['script', 'style', 'code', 'pre', 'noscript', 'svg', 'math']

/**
 * ASTから日本語テキストノードを抽出
 */
export function extractTexts(ast: Root): TextNode[] {
  const textNodes: TextNode[] = []

  visit(ast, 'text', (node: Text, _index, parent) => {
    const parentElement = parent as Element | null

    // 除外タグ内はスキップ
    if (parentElement && EXCLUDE_TAGS.includes(parentElement.tagName)) {
      return
    }

    const trimmed = node.value.trim()

    // 空文字、日本語を含まないテキストはスキップ
    if (!trimmed || !containsJapanese(trimmed)) {
      return
    }

    textNodes.push({
      node,
      value: trimmed,
    })
  })

  return textNodes
}
