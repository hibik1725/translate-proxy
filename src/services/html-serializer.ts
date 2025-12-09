/**
 * HTML Serializer Service
 * Converts HAST back to HTML string
 */

import type { Root } from 'hast'
import { toParse5 } from 'hast-util-to-parse5'
import { type DefaultTreeAdapterMap, serialize } from 'parse5'

type ParentNode = DefaultTreeAdapterMap['parentNode']

/**
 * Service for serializing HAST to HTML string.
 */
export class HtmlSerializerService {
  /**
   * Executes the HTML serialization operation.
   * @param hast - The HAST to serialize
   * @returns The HTML string
   */
  public execute(hast: Root): string {
    const parse5Tree = toParse5(hast) as ParentNode
    return serialize(parse5Tree)
  }
}
