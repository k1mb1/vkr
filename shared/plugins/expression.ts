/**
 * Безопасный вычислитель формул для декларативных плагинов.
 *
 * `eval`/`new Function` запрещены CSP и были бы дырой: формулы приходят из
 * сторонних пакетов. Поэтому — свой маленький парсер: числа, строки, поля
 * строки (`name`, `stats.late`), арифметика, сравнения, `&&`/`||`/`!`,
 * тернарный `a ? b : c` и белый список функций. Ни доступа к глобальным
 * объектам, ни вызова произвольного кода.
 */

type Value = number | string | boolean | null | undefined

type Node
  = | { t: 'lit', v: Value }
    | { t: 'ref', path: string[] }
    | { t: 'un', op: '-' | '!', a: Node }
    | { t: 'bin', op: string, a: Node, b: Node }
    | { t: 'cond', c: Node, a: Node, b: Node }
    | { t: 'call', fn: string, args: Node[] }

interface Token {
  k: 'num' | 'str' | 'id' | 'op' | 'end'
  v: string
  pos: number
}

export class ExpressionError extends Error {
  override name = 'ExpressionError'
}

const OPERATORS = ['&&', '||', '==', '!=', '<=', '>=', '+', '-', '*', '/', '%', '<', '>', '!', '?', ':', '(', ')', ',', '.']

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^\d*\.?\d+(?:e[+-]?\d+)?/i.exec(src.slice(i))!
      out.push({ k: 'num', v: m[0], pos: i })
      i += m[0].length
      continue
    }
    if (ch === '"' || ch === '\'') {
      let j = i + 1
      let s = ''
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length)
          j++
        s += src[j]
        j++
      }
      if (j >= src.length)
        throw new ExpressionError(`Незакрытая строка (позиция ${i})`)
      out.push({ k: 'str', v: s, pos: i })
      i = j + 1
      continue
    }
    if (/[a-z_]/i.test(ch)) {
      const m = /^[a-z_]\w*/i.exec(src.slice(i))!
      out.push({ k: 'id', v: m[0], pos: i })
      i += m[0].length
      continue
    }
    const op = OPERATORS.find(o => src.startsWith(o, i))
    if (!op)
      throw new ExpressionError(`Неожиданный символ «${ch}» (позиция ${i})`)
    out.push({ k: 'op', v: op, pos: i })
    i += op.length
  }
  out.push({ k: 'end', v: '', pos: src.length })
  return out
}

// Приоритеты бинарных операторов (больше — связывает сильнее).
const BINARY_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
}

function num(v: Value): number {
  if (typeof v === 'number')
    return v
  if (typeof v === 'boolean')
    return v ? 1 : 0
  if (v == null || v === '')
    return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function truthy(v: Value): boolean {
  return !!v && !(typeof v === 'number' && Number.isNaN(v))
}

const FUNCTIONS: Record<string, (...args: Value[]) => Value> = {
  round: (x, d) => {
    const k = 10 ** Math.max(0, Math.min(10, num(d)))
    return Math.round(num(x) * k) / k
  },
  floor: x => Math.floor(num(x)),
  ceil: x => Math.ceil(num(x)),
  abs: x => Math.abs(num(x)),
  min: (...xs) => Math.min(...xs.map(num)),
  max: (...xs) => Math.max(...xs.map(num)),
  /** Процент a от b; 0, если b = 0. */
  pct: (a, b) => (num(b) === 0 ? 0 : (num(a) / num(b)) * 100),
  if: (c, a, b) => (truthy(c) ? a : b),
  coalesce: (...xs) => xs.find(x => x != null && x !== ''),
  concat: (...xs) => xs.map(x => (x == null ? '' : String(x))).join(''),
  upper: x => String(x ?? '').toUpperCase(),
  lower: x => String(x ?? '').toLowerCase(),
  contains: (s, sub) => String(s ?? '').toLowerCase().includes(String(sub ?? '').toLowerCase()),
}

const MAX_SOURCE_LENGTH = 2000
const MAX_DEPTH = 64

function parse(src: string): Node {
  if (src.length > MAX_SOURCE_LENGTH)
    throw new ExpressionError('Слишком длинное выражение')
  const tokens = tokenize(src)
  let p = 0
  let depth = 0

  const peek = () => tokens[p]!
  const next = () => tokens[p++]!
  const isOp = (v: string) => peek().k === 'op' && peek().v === v
  const expect = (v: string) => {
    if (!isOp(v))
      throw new ExpressionError(`Ожидалось «${v}» (позиция ${peek().pos})`)
    next()
  }

  function expression(): Node {
    if (++depth > MAX_DEPTH)
      throw new ExpressionError('Слишком глубокая вложенность')
    const c = binary(0)
    let node = c
    if (isOp('?')) {
      next()
      const a = expression()
      expect(':')
      const b = expression()
      node = { t: 'cond', c, a, b }
    }
    depth--
    return node
  }

  function binary(minPrec: number): Node {
    let left = unary()
    for (;;) {
      const tok = peek()
      const prec = tok.k === 'op' ? BINARY_PRECEDENCE[tok.v] : undefined
      if (prec === undefined || prec <= minPrec)
        return left
      next()
      const right = binary(prec)
      left = { t: 'bin', op: tok.v, a: left, b: right }
    }
  }

  function unary(): Node {
    if (isOp('-') || isOp('!')) {
      const op = next().v as '-' | '!'
      return { t: 'un', op, a: unary() }
    }
    return primary()
  }

  function primary(): Node {
    const tok = next()
    if (tok.k === 'num')
      return { t: 'lit', v: Number(tok.v) }
    if (tok.k === 'str')
      return { t: 'lit', v: tok.v }
    if (tok.k === 'op' && tok.v === '(') {
      const e = expression()
      expect(')')
      return e
    }
    if (tok.k === 'id') {
      if (tok.v === 'true' || tok.v === 'false')
        return { t: 'lit', v: tok.v === 'true' }
      if (tok.v === 'null')
        return { t: 'lit', v: null }
      if (isOp('(')) {
        next()
        if (!Object.hasOwn(FUNCTIONS, tok.v))
          throw new ExpressionError(`Неизвестная функция «${tok.v}»`)
        const args: Node[] = []
        if (!isOp(')')) {
          do args.push(expression())
          while (isOp(',') && next())
        }
        expect(')')
        return { t: 'call', fn: tok.v, args }
      }
      const path = [tok.v]
      while (isOp('.')) {
        next()
        const part = next()
        if (part.k !== 'id')
          throw new ExpressionError(`Ожидалось имя поля (позиция ${part.pos})`)
        path.push(part.v)
      }
      return { t: 'ref', path }
    }
    throw new ExpressionError(tok.k === 'end' ? 'Неожиданный конец выражения' : `Неожиданное «${tok.v}» (позиция ${tok.pos})`)
  }

  const root = expression()
  if (peek().k !== 'end')
    throw new ExpressionError(`Лишний текст «${peek().v}» (позиция ${peek().pos})`)
  return root
}

function lookup(row: unknown, path: string[]): Value {
  let cur: unknown = row
  for (const key of path) {
    if (cur == null || typeof cur !== 'object' || !Object.hasOwn(cur, key))
      return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return typeof cur === 'object' ? undefined : cur as Value
}

function evaluate(node: Node, row: unknown): Value {
  switch (node.t) {
    case 'lit':
      return node.v
    case 'ref':
      return lookup(row, node.path)
    case 'un': {
      const a = evaluate(node.a, row)
      return node.op === '-' ? -num(a) : !truthy(a)
    }
    case 'cond':
      return truthy(evaluate(node.c, row)) ? evaluate(node.a, row) : evaluate(node.b, row)
    case 'call':
      return FUNCTIONS[node.fn]!(...node.args.map(a => evaluate(a, row)))
    case 'bin': {
      if (node.op === '&&') {
        const a = evaluate(node.a, row)
        return truthy(a) ? evaluate(node.b, row) : a
      }
      if (node.op === '||') {
        const a = evaluate(node.a, row)
        return truthy(a) ? a : evaluate(node.b, row)
      }
      const a = evaluate(node.a, row)
      const b = evaluate(node.b, row)
      switch (node.op) {
        case '+':
          return typeof a === 'string' || typeof b === 'string'
            ? `${a ?? ''}${b ?? ''}`
            : num(a) + num(b)
        case '-': return num(a) - num(b)
        case '*': return num(a) * num(b)
        case '/': return num(b) === 0 ? 0 : num(a) / num(b)
        case '%': return num(b) === 0 ? 0 : num(a) % num(b)
        case '==': return a === b || (a != null && b != null && typeof a !== typeof b && String(a) === String(b))
        case '!=': return !(a === b || (a != null && b != null && typeof a !== typeof b && String(a) === String(b)))
        case '<': return typeof a === 'string' && typeof b === 'string' ? a < b : num(a) < num(b)
        case '<=': return typeof a === 'string' && typeof b === 'string' ? a <= b : num(a) <= num(b)
        case '>': return typeof a === 'string' && typeof b === 'string' ? a > b : num(a) > num(b)
        case '>=': return typeof a === 'string' && typeof b === 'string' ? a >= b : num(a) >= num(b)
      }
    }
  }
  throw new ExpressionError('Неизвестный узел выражения')
}

export type CompiledExpression = (row: unknown) => Value

const cache = new Map<string, CompiledExpression>()

/** Разбирает выражение один раз; результат — функция над строкой данных. */
export function compileExpression(src: string): CompiledExpression {
  let fn = cache.get(src)
  if (!fn) {
    const ast = parse(src)
    fn = row => evaluate(ast, row)
    cache.set(src, fn)
  }
  return fn
}

/** Проверка синтаксиса без вычисления: `null` — ок, иначе текст ошибки. */
export function validateExpression(src: string): string | null {
  try {
    parse(src)
    return null
  }
  catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export function isTruthy(v: Value): boolean {
  return truthy(v)
}

export const EXPRESSION_FUNCTIONS = Object.keys(FUNCTIONS)
