import { createContext, useContext, useLayoutEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface ChatMarkdownProps {
  content: string
  animate?: boolean
}

type SeenStore = {
  keys: Set<string>
  order: number
}

const AnimateContext = createContext(false)
const SeenContext = createContext<SeenStore | null>(null)

function useFadeClass(tag: string) {
  const animate = useContext(AnimateContext)
  const seen = useContext(SeenContext)
  const idx = seen ? seen.order++ : -1
  const key = `${tag}:${idx}`
  const isNew = Boolean(seen && animate && idx >= 0 && !seen.keys.has(key))

  useLayoutEffect(() => {
    if (isNew && seen) {
      seen.keys.add(key)
    }
  }, [isNew, key, seen])

  return isNew ? 'sse-chunk-in' : ''
}

function fade(tag: keyof HTMLElementTagNameMap, baseClass: string) {
  const Comp = (props: any) => <FadeTag tag={tag} baseClass={baseClass} {...props} />
  Comp.displayName = `Markdown.${tag}`
  return Comp
}

function MarkdownCode({ node: _node, className, children, ...props }: any) {
  const fadeClass = useFadeClass('code')
  const isBlock = Boolean(className) || String(children).includes('\n')
  if (isBlock) {
    return (
      <code className={`font-mono text-slate-100 ${className || ''}`.trim()} {...props}>
        {children}
      </code>
    )
  }

  return (
    <code
      className={`rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[13px] text-primary ${fadeClass}`.trim()}
      {...props}
    >
      {children}
    </code>
  )
}

function FadeTag({
  tag,
  baseClass,
  node: _node,
  className,
  children,
  ...props
}: any) {
  const Tag = tag as keyof HTMLElementTagNameMap
  const fadeClass = useFadeClass(tag)
  return (
    <Tag className={`${baseClass} ${className || ''} ${fadeClass}`.trim()} {...props}>
      {children}
    </Tag>
  )
}

const markdownComponents: Components = {
  p: fade('p', 'my-2 leading-7 text-gray-700'),
  h1: fade('h1', 'text-[22px] font-bold text-gray-900 mt-5 mb-3 tracking-tight'),
  h2: fade('h2', 'text-[18px] font-semibold text-gray-900 mt-4 mb-2 tracking-tight'),
  h3: fade('h3', 'text-[16px] font-semibold text-gray-800 mt-3 mb-2'),
  h4: fade('h4', 'text-[15px] font-semibold text-gray-800 mt-3 mb-1.5'),
  ul: fade('ul', 'my-2 pl-5 list-disc space-y-1 text-gray-700'),
  ol: fade('ol', 'my-2 pl-5 list-decimal space-y-1 text-gray-700'),
  li: fade('li', 'leading-7 marker:text-primary'),
  blockquote: fade(
    'blockquote',
    'my-3 border-l-4 border-primary/40 bg-indigo-50/50 px-4 py-2 text-gray-600 italic rounded-r-lg',
  ),
  hr: fade('hr', 'my-4 border-gray-200'),
  table: fade('table', 'my-3 w-full text-sm border-collapse'),
  thead: fade('thead', 'bg-gray-50'),
  th: fade('th', 'border border-gray-200 px-3 py-2 text-left font-semibold text-gray-800'),
  td: fade('td', 'border border-gray-200 px-3 py-2 text-gray-700'),
  pre: fade('pre', 'my-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-[13px] leading-6'),
  code: MarkdownCode,
  a: ({ node: _node, href, children, ...props }: any) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-secondary"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  strong: ({ node: _node, children, ...props }: any) => (
    <strong className="font-semibold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ node: _node, children, ...props }: any) => (
    <em className="italic text-gray-700" {...props}>
      {children}
    </em>
  ),
}

export function ChatMarkdown({ content, animate = false }: ChatMarkdownProps) {
  const seenRef = useRef<SeenStore>({ keys: new Set(), order: 0 })
  seenRef.current.order = 0

  return (
    <AnimateContext.Provider value={animate}>
      <SeenContext.Provider value={seenRef.current}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </SeenContext.Provider>
    </AnimateContext.Provider>
  )
}

export function createSseContentBuffer(onFlush: (text: string) => void) {
  const MIN_INTERVAL = 200
  let pending = ''
  let rafId: number | null = null
  let timerId: ReturnType<typeof setTimeout> | null = null
  let closed = false
  let lastFlushAt = 0

  const flush = () => {
    rafId = null
    if (closed || !pending) return

    const wait = MIN_INTERVAL - (performance.now() - lastFlushAt)
    if (wait > 0) {
      if (timerId == null) {
        timerId = setTimeout(() => {
          timerId = null
          if (rafId == null) {
            rafId = requestAnimationFrame(flush)
          }
        }, wait)
      }
      return
    }

    const text = pending
    pending = ''
    lastFlushAt = performance.now()
    onFlush(text)
  }

  return {
    push(token: string) {
      if (closed || !token) return
      pending += token
      if (rafId == null) {
        rafId = requestAnimationFrame(flush)
      }
    },
    close() {
      closed = true
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (timerId != null) {
        clearTimeout(timerId)
        timerId = null
      }
      if (pending) {
        const leftover = pending
        pending = ''
        onFlush(leftover)
      }
    },
    done() {
      return new Promise<void>((resolve) => {
        const tick = () => {
          if (closed || (!pending && rafId == null && timerId == null)) {
            resolve()
            return
          }
          requestAnimationFrame(tick)
        }
        tick()
      })
    },
  }
}
