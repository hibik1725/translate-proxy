import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'
import type { TextNode } from './extractor.js'

/**
 * テキストノードに翻訳結果を差し替え
 */
export function replaceTexts(
  textNodes: TextNode[],
  translations: Map<string, string>
): void {
  for (const { node, value } of textNodes) {
    const translated = translations.get(value)
    if (translated) {
      // 元のテキストの前後の空白を保持
      const leadingSpace = node.value.match(/^\s*/)?.[0] || ''
      const trailingSpace = node.value.match(/\s*$/)?.[0] || ''
      node.value = leadingSpace + translated + trailingSpace
    }
  }
}

/**
 * 内部リンクに言語プレフィックスを追加
 */
export function rewriteInternalLinks(ast: Root, lang: string): void {
  visit(ast, 'element', (node: Element) => {
    if (node.tagName === 'a' && node.properties?.href) {
      const href = String(node.properties.href)

      // 内部リンク（/で始まる相対パス）のみ対象
      if (href.startsWith('/') && !href.startsWith('//')) {
        // 既に言語プレフィックスがある場合はスキップ
        if (!href.match(/^\/(en|zh|ko)\//)) {
          node.properties.href = `/${lang}${href}`
        }
      }
    }
  })
}

/**
 * html要素にlang属性を設定
 */
export function setLangAttribute(ast: Root, lang: string): void {
  visit(ast, 'element', (node: Element) => {
    if (node.tagName === 'html') {
      node.properties = node.properties || {}
      node.properties.lang = lang
    }
  })
}
