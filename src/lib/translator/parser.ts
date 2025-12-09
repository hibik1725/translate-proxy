import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { toParse5 } from 'hast-util-to-parse5'
import type { Root } from 'hast'

/**
 * HTMLをHAST（Hypertext Abstract Syntax Tree）にパース
 */
export function parseHtml(html: string): Root {
  const parse5Tree = parse(html)
  return fromParse5(parse5Tree) as Root
}

/**
 * HASTをHTMLにシリアライズ
 */
export function serializeHtml(ast: Root): string {
  const parse5Tree = toParse5(ast) as DefaultTreeAdapterMap['parentNode']
  return serialize(parse5Tree)
}
