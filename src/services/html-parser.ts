/**
 * HTML Parser Service
 * Parses HTML string into HAST (Hypertext Abstract Syntax Tree)
 */

import type { Root } from 'hast'
import { fromParse5 } from 'hast-util-from-parse5'
import { parse } from 'parse5'

/**
 * Service for parsing HTML into HAST.
 */
export class HtmlParserService {
  /**
   * Executes the HTML parsing operation.
   * @param html - The HTML string to parse
   * @returns The HAST representation of the HTML
   */
  public execute(html: string): Root {
    const parse5Tree = parse(html)
    const hast = fromParse5(parse5Tree)
    return hast as Root
  }
}
