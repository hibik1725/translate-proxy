/**
 * SEO Injector Service
 * Injects SEO-related tags into translated HTML
 */

import type { Element, Properties, Root } from 'hast'
import type { SupportedLang } from './translate'

/**
 * Options for SEO injection
 */
interface SeoInjectorOptions {
  /** Base URL of the origin site (e.g., https://picker-tf.com) */
  baseUrl: string
}

/**
 * Service for injecting SEO-related tags into translated HTML.
 */
export class SeoInjectorService {
  private readonly baseUrl: string

  /**
   * Creates a new SeoInjectorService instance.
   * @param options - Configuration options
   */
  constructor(options: SeoInjectorOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
  }

  /**
   * Executes the SEO injection operation.
   * @param hast - The HAST to inject SEO tags into
   * @param currentPath - The current page path (without language prefix)
   * @param targetLang - The target language code
   * @returns The modified HAST with SEO tags
   */
  public execute(
    hast: Root,
    currentPath: string,
    targetLang: SupportedLang,
  ): Root {
    const normalizedPath = this.normalizePath(currentPath)

    this.setHtmlLang(hast, targetLang)
    this.injectHeadTags(hast, normalizedPath, targetLang)

    return hast
  }

  /**
   * Normalizes the path to ensure it starts with a slash.
   * @param path - The path to normalize
   * @returns The normalized path
   */
  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`
  }

  /**
   * Sets the lang attribute on the html element.
   * @param hast - The HAST to modify
   * @param targetLang - The target language code
   */
  private setHtmlLang(hast: Root, targetLang: SupportedLang): void {
    const htmlElement = this.findElement(hast, 'html')
    if (htmlElement) {
      htmlElement.properties = htmlElement.properties || {}
      htmlElement.properties.lang = targetLang
    }
  }

  /**
   * Injects SEO tags into the head element.
   * @param hast - The HAST to modify
   * @param currentPath - The current page path
   * @param targetLang - The target language code
   */
  private injectHeadTags(
    hast: Root,
    currentPath: string,
    targetLang: SupportedLang,
  ): void {
    const headElement = this.findElement(hast, 'head')
    if (!headElement) {
      return
    }

    const seoTags = this.createSeoTags(currentPath, targetLang)

    // Remove existing hreflang and canonical tags
    headElement.children = headElement.children.filter((child) => {
      if (child.type !== 'element' || child.tagName !== 'link') {
        return true
      }
      const rel = child.properties?.rel
      const relArray = Array.isArray(rel) ? rel : [rel]
      return !relArray.includes('alternate') && !relArray.includes('canonical')
    })

    // Add new SEO tags at the beginning of head
    headElement.children.unshift(...seoTags)
  }

  /**
   * Creates the SEO link tags.
   * @param currentPath - The current page path
   * @param targetLang - The target language code
   * @returns Array of link elements
   */
  private createSeoTags(
    currentPath: string,
    targetLang: SupportedLang,
  ): Element[] {
    const jaUrl = `${this.baseUrl}${currentPath}`
    const targetUrl = `${this.baseUrl}/${targetLang}${currentPath}`

    const tags: Element[] = [
      // hreflang for Japanese (original)
      this.createLinkElement({
        rel: 'alternate',
        hreflang: 'ja',
        href: jaUrl,
      }),
      // hreflang for target language
      this.createLinkElement({
        rel: 'alternate',
        hreflang: targetLang,
        href: targetUrl,
      }),
      // x-default points to Japanese (original)
      this.createLinkElement({
        rel: 'alternate',
        hreflang: 'x-default',
        href: jaUrl,
      }),
      // canonical for the current language page
      this.createLinkElement({
        rel: 'canonical',
        href: targetUrl,
      }),
    ]

    return tags
  }

  /**
   * Creates a link element with the given properties.
   * @param properties - The properties for the link element
   * @returns The link element
   */
  private createLinkElement(properties: Properties): Element {
    return {
      type: 'element',
      tagName: 'link',
      properties,
      children: [],
    }
  }

  /**
   * Finds an element by tag name in the HAST.
   * @param node - The node to search in
   * @param tagName - The tag name to find
   * @returns The found element or undefined
   */
  private findElement(
    node: Root | Element,
    tagName: string,
  ): Element | undefined {
    if (node.type === 'element' && node.tagName === tagName) {
      return node
    }

    if ('children' in node) {
      for (const child of node.children) {
        if (child.type === 'element') {
          const found = this.findElement(child, tagName)
          if (found) {
            return found
          }
        }
      }
    }

    return undefined
  }
}
