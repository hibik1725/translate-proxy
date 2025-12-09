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
    // Type assertion needed: hast-util-to-parse5 returns a parse5 Node type,
    // but serialize expects ParentNode. The conversion is safe because
    // we're serializing a Root HAST node which always becomes a Document.
    const parse5Tree = toParse5(hast) as ParentNode
    return serialize(parse5Tree)
  }
}
