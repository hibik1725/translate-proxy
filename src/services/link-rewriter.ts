/**
 * Link Rewriter Service
 * Rewrites internal links in HTML to include language prefix
 */

import type { Element, Root } from 'hast'
import type { SupportedLang } from './translate'

/**
 * Service for rewriting internal links to include language prefix.
 */
export class LinkRewriterService {
  /**
   * Executes the link rewriting operation.
   * @param hast - The HAST to rewrite links in
   * @param targetLang - The target language code to prefix links with
   * @returns The modified HAST with rewritten links
   */
  public execute(hast: Root, targetLang: SupportedLang): Root {
    this.rewriteLinks(hast, targetLang)
    return hast
  }

  /**
   * Recursively rewrites links in the HAST.
   * @param node - The current node to process
   * @param targetLang - The target language code
   */
  private rewriteLinks(node: Root | Element, targetLang: SupportedLang): void {
    if ('children' in node) {
      for (const child of node.children) {
        if (child.type === 'element') {
          this.processElement(child, targetLang)
          this.rewriteLinks(child, targetLang)
        }
      }
    }
  }

  /**
   * Processes a single element to rewrite its href attribute if applicable.
   * @param element - The element to process
   * @param targetLang - The target language code
   */
  private processElement(element: Element, targetLang: SupportedLang): void {
    // Only process anchor tags
    if (element.tagName !== 'a') {
      return
    }

    const href = element.properties?.href
    if (typeof href !== 'string') {
      return
    }

    const rewrittenHref = this.rewriteHref(href, targetLang)
    if (rewrittenHref !== href) {
      element.properties = element.properties || {}
      element.properties.href = rewrittenHref
    }
  }

  /**
   * Rewrites a single href value to include language prefix if it's an internal link.
   * @param href - The original href value
   * @param targetLang - The target language code
   * @returns The rewritten href or original if not applicable
   */
  private rewriteHref(href: string, targetLang: SupportedLang): string {
    // Don't rewrite external links (http://, https://, //, mailto:, tel:, etc.)
    if (this.isExternalLink(href)) {
      return href
    }

    // Don't rewrite anchor-only links
    if (href.startsWith('#')) {
      return href
    }

    // Don't rewrite links that already have a language prefix
    if (this.hasLanguagePrefix(href)) {
      return href
    }

    // Don't rewrite asset links (images, css, js, etc.)
    if (this.isAssetLink(href)) {
      return href
    }

    // Rewrite internal absolute paths
    if (href.startsWith('/')) {
      return `/${targetLang}${href}`
    }

    // For relative paths, prepend with language prefix
    // e.g., "about" -> "/en/about"
    return `/${targetLang}/${href}`
  }

  /**
   * Checks if a href is an external link.
   * @param href - The href to check
   * @returns True if it's an external link
   */
  private isExternalLink(href: string): boolean {
    return (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('//') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    )
  }

  /**
   * Checks if a href already has a language prefix.
   * @param href - The href to check
   * @returns True if it already has a language prefix
   */
  private hasLanguagePrefix(href: string): boolean {
    // Check for common language prefixes in the path
    return /^\/(?:en|ja|zh|ko|fr|de|es|pt|it|ru)\//i.test(href)
  }

  /**
   * Checks if a href points to an asset file.
   * @param href - The href to check
   * @returns True if it's an asset link
   */
  private isAssetLink(href: string): boolean {
    const assetExtensions = [
      '.css',
      '.js',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.svg',
      '.webp',
      '.ico',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
      '.pdf',
      '.mp4',
      '.webm',
      '.mp3',
      '.ogg',
    ]

    const lowercaseHref = href.toLowerCase()
    return assetExtensions.some((ext) => lowercaseHref.endsWith(ext))
  }
}
