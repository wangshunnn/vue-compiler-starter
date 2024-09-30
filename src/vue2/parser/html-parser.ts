/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import type { ASTAttr, CompilerOptions } from 'types2'
import { isNonPhrasingTag, makeMap, no, unicodeRegExp } from 'utils2'

// Regular Expressions for parsing tags and attributes
const attribute
  = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute
  = /^\s*((?:v-[\w-]+:|[@:#])\[[^=]+?\][^\s"'<>/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being passed as HTML comment when inlined in page
const comment = /^<!--/
const conditionalComment = /^<!\[/

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache: Record<any, RegExp> = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': '\'',
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
function shouldIgnoreFirstNewline(tag: string, html: string) {
  return tag && isIgnoreNewlineTag(tag) && html[0] === '\n'
}

function decodeAttr(value: string, shouldDecodeNewlines?: boolean) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  // @ts-expect-error ignore
  return value.replace(re, match => decodingMap[match])
}

export interface HTMLParserOptions extends CompilerOptions {
  start?: (
    /** 标签名，比如 div, text, .. */
    tag: string,
    /** 标签属性 */
    attrs: ASTAttr[],
    /** true 表示是自闭合标签，比如 <img/> */
    unary: boolean,
    /** 开始位置索引 */
    start: number,
    /** 结束位置索引 */
    end: number
  ) => void
  end?: (
    /** */
    tag: string,
    /** 开始位置索引 */
    start: number,
    /** 结束位置索引 */
    end: number
  ) => void
  chars?: (
    /** 文本内容 */
    text: string,
    /** 开始位置索引 */
    start?: number,
    /** 结束位置索引 */
    end?: number
  ) => void
  comment?: (
    /** 注释内容 */
    content: string,
    /** 开始位置索引 */
    start: number,
    /** 结束位置索引 */
    end: number
  ) => void
}

export function parseHTML(html: string, options: HTMLParserOptions) {
  const stack: any[] = []
  const expectHTML = options.expectHTML
  const isUnaryTag = options.isUnaryTag || no
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  let index: number = 0
  let last: string, lastTag: string

  // 测试日志用-循环次数
  // let num = 0

  // 从左到右遍历 html
  while (html) {
    // console.log(pico.bgGreen(' html-while '), lastTag!, ++num, pico.gray(html.replaceAll(' ', '#').replaceAll('\n', '@')))
    last = html

    // Make sure we're not in a plaintext content element like script/style
    /** 非 script/style 标签内容 */
    if (!lastTag! || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<')
      // console.log(pico.bgWhite(' html-while ') + pico.bgYellow(` ${textEnd} `))

      /** 1. `<` 打头 */
      if (textEnd === 0) {
        /** 1.1 Comment: 普通注释, `<!--` 打头 */
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->')

          if (commentEnd >= 0) {
            if (options.shouldKeepComment && options.comment) {
              options.comment(
                html.substring(4, commentEnd),
                index,
                index + commentEnd + 3,
              )
            }
            advance(commentEnd + 3)
            continue
          }
        }

        /** 1.2 Conditional Comment: 条件注释, `<![` 打头 */
        // https://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        /** 1.3 Doctype: <!DOCTYPE> 声明 */
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        /** 1.4 End tag: 结束标签 </xxx> */
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        /** 1.5 Start tag: 开始标签 <xxx>, 自闭合标签 <xxx/> */
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          // 匹配到标签则触发 start 钩子
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

      /** 2. 特判场景: 处理普通文本中的 < 符号 */
      let text, rest, next
      if (textEnd >= 0) {
        // 截取到以 < 开头
        rest = html.slice(textEnd)
        // 以下 while 循环:
        // 剩下的文本中如果以 < 开头不符合标签规范，那么就视为普通文本，继续截取
        while (
          !endTag.test(rest)
          && !startTagOpen.test(rest)
          && !comment.test(rest)
          && !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1)
          if (next < 0)
            break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
      }

      /** 3. 没有 < 符号，那么直接视为普通文本 */
      if (textEnd < 0) {
        text = html
      }

      // 有文本内容直接步进截取
      if (text) {
        advance(text.length)
      }

      // 前面匹配到文本那么触发 char 钩子
      if (options.chars && text) {
        options.chars(text, index - text.length, index)
      }
    }
    /**
     * script、style、textarea 标签里的内容
     * 可以完全看做文本，在本轮循环中和结束标签一起处理，
     * 并且触发 char 钩子
     */
    else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag
        = reCache[stackedTag]
        || (reCache[stackedTag] = new RegExp(
          `([\\s\\S]*?)(</${stackedTag}[^>]*>)`,
          'i',
        ))
      const rest = html.replace(reStackedTag, (all: any, text: string, endTag: any) => {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      options.chars?.(html)
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  /**
   * html: 在递归处理地过程中不断往后走（删除处理过的代码, html 越来越少）
   * index: 每次往后走就同步更新当前 html 开头在源代码中的索引位置, 越来越大
   */
  function advance(n: number) {
    index += n
    html = html.substring(n)
  }

  /**
   * 解析 开始标签/自闭合标签
   * 获取标签名称、标签属性 attrs
   * <template>
   * <div class='xx' >
   * <text class='xx' />
   */
  function parseStartTag() {
    // start: ['<div', 'div', index: 0, ...]
    const start = html.match(startTagOpen)
    if (start) {
      const match: any = {
        tagName: start[1],
        attrs: [],
        start: index,
      }
      // 去掉标签名, html 往后走: <div class='' .. -> class='' ..
      advance(start[0].length)
      let end: any, attr: any
      /**
       * 下面这段 while 用于处理 开始标签/自闭合标签 中的属性 attrs
       */
      while (
        !((end = html.match(startTagClose))) // 不是结束标签
        && (attr = html.match(dynamicArgAttribute) || html.match(attribute)) // 匹配到了标签属性
      ) {
        attr.start = index
        // 去掉属性后接着往后走
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
      // 匹配到了 开始标签/自闭合标签 的右侧尖括号 `>` 或者 `/>`
      if (end) {
        match.unarySlash = end[1]
        // 往后走
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  function handleStartTag(match: any) {
    const tagName = match.tagName
    // 非空则表示是自闭合标签
    const unarySlash = match.unarySlash

    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    const unary = isUnaryTag(tagName) || !!unarySlash

    const l = match.attrs.length
    const attrs: ASTAttr[] = Array.from({ length: l })
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines
        = tagName === 'a' && args[1] === 'href'
          ? options.shouldDecodeNewlinesForHref
          : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines),
      }
    }

    if (!unary) {
      stack.push({
        tag: tagName,
        lowerCasedTag: tagName.toLowerCase(),
        attrs,
        start: match.start,
        end: match.end,
      })
      lastTag = tagName
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  function parseEndTag(tagName?: any, start?: any, end?: any) {
    let pos, lowerCasedTagName
    if (start == null)
      start = index
    if (end == null)
      end = index

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    }
    else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    }
    else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    }
    else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
