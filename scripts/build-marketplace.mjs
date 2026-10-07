// Собирает marketplace/index.json из marketplace/packages/<id>/<version>/:
// берёт последнюю версию каждого плагина и считает sha256 всех файлов пакета.
// Сервер при установке сверяет эти хэши. Запуск: pnpm market:index
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import process from 'node:process'

const root = join(import.meta.dirname, '..', 'marketplace')
const packagesDir = join(root, 'packages')

function compareVersions(a, b) {
  const pa = a.split(/[.-]/).map(Number)
  const pb = b.split(/[.-]/).map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0))
      return (pa[i] ?? 0) - (pb[i] ?? 0)
  }
  return 0
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

const plugins = []
for (const id of readdirSync(packagesDir).sort()) {
  const versions = readdirSync(join(packagesDir, id)).sort(compareVersions)
  const version = versions.at(-1)
  const dir = join(packagesDir, id, version)
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  if (manifest.id !== id || manifest.version !== version) {
    console.error(`${id}/${version}: id/version в manifest.json не совпадают с путём`)
    process.exit(1)
  }
  const files = {}
  for (const file of listFiles(dir).sort()) {
    const name = relative(dir, file).split(sep).join('/')
    files[name] = createHash('sha256').update(readFileSync(file)).digest('hex')
  }
  plugins.push({
    id,
    version,
    name: manifest.name,
    description: manifest.description,
    author: manifest.author,
    icon: manifest.icon,
    category: manifest.category,
    hasCode: !!manifest.main,
    files,
  })
}

writeFileSync(join(root, 'index.json'), `${JSON.stringify({ name: 'Официальный каталог VKR', plugins }, null, 2)}\n`)
console.log(`marketplace/index.json: ${plugins.length} плагин(ов)`)
