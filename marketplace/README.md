# Маркетплейс плагинов

Плагины добавляют в предметы новые разделы — таблицы, шкалы оценивания,
аналитику — и ставятся из веб-интерфейса (**Маркетплейс** в боковом меню) без
пересборки приложения.

## Как это устроено

```
Каталог (index.json)  ──►  Nuxt-сервер: скачать файлы пакета → сверить sha256
                           → проверить manifest.json → сохранить в .data/plugins
                                    │
Браузер  ◄── /api/plugins (список) ─┘
   │
   ├─ декларативный плагин → ядро рисует таблицу по JSON-описанию
   └─ код-плагин → import('/plugin-files/<id>/<version>/index.js') → setup(sdk)
```

- **Источники.** Встроенный каталог — эта папка (едет внутри сборки).
  Дополнительные — `NUXT_MARKETPLACE_URLS` (базовые URL через запятую). Любой
  статический хостинг (GitHub Pages, S3, nginx) с той же структурой подходит.
- **Целостность.** В `index.json` для каждого файла пакета записан sha256.
  Сервер сверяет хэши при установке — подменённый или повреждённый пакет не
  ставится.
- **Права.** Ставить/удалять/выключать плагины может пользователь из
  `NUXT_PLUGIN_ADMINS` (email или `sub` через запятую). Пусто — любой
  вошедший пользователь.
- **CSP.** Код плагинов раздаётся с того же origin, поэтому грузится через
  `import()` под действующей строгой CSP — ослаблять её не нужно.

## Структура каталога

```
marketplace/
  index.json                         ← генерируется: pnpm market:index
  packages/
    <id>/
      <version>/
        manifest.json                ← обязателен
        index.js                     ← только для код-плагинов (manifest.main)
```

После добавления или изменения пакета выполните `pnpm market:index` — скрипт
возьмёт последнюю версию каждого плагина и пересчитает хэши.

## manifest.json

```jsonc
{
  "id": "my-plugin", // a-z, 0-9, дефисы
  "name": "Мой плагин",
  "version": "1.0.0", // semver; новая версия — новая папка
  "description": "Что делает плагин",
  "author": "Кафедра ИС",
  "icon": "i-lucide-table", // любая иконка Lucide
  "category": "tables", // tables | grading | analytics | export | integration
  "main": "index.js", // только для код-плагинов
  "contributes": {
    "subjectPages": []
  }
}
```

Каждый элемент `subjectPages` — вкладка в тулбаре предмета и карточка в его
обзоре:

```jsonc
{
  "id": "risk",
  "label": "Зона риска",
  "description": "Короткое пояснение для карточки",
  "icon": "i-lucide-triangle-alert",
  "view": { "type": "table", "dataset": "students", "columns": [] } // или { "type": "component", … }
}
```

## Датасет `students`

Обе разновидности плагинов работают с одним и тем же набором строк — по одной
на студента (данные итоговой таблицы предмета, с учётом штрафов, бонусов и
посещаемости):

| Поле                                   | Тип            | Описание                                             |
| -------------------------------------- | -------------- | ---------------------------------------------------- |
| `id`, `name`                           | string         | Студент                                              |
| `group`                                | string         | Группа (и подгруппа)                                 |
| `rank`                                 | number         | Место в группе по итоговому баллу                    |
| `total`                                | number         | Итоговый балл (со штрафами/бонусами и посещаемостью) |
| `rawTotal`                             | number         | Балл без штрафов и бонусов                           |
| `maxTotal`                             | number         | Максимально возможный балл в группе                  |
| `percent`                              | number         | `total / maxTotal × 100`                             |
| `lectureTotal`                         | number         | Баллы за лекции                                      |
| `practiceTotal`                        | number         | Баллы за практики                                    |
| `requiredClosed`                       | number         | Закрыто обязательных заданий                         |
| `requiredTotal`                        | number         | Всего обязательных заданий                           |
| `present`, `late`, `absent`, `excused` | number         | Отметки посещаемости                                 |
| `tracked`                              | number         | Занятий с отметкой                                   |
| `attendancePercent`                    | number         | `(present + late) / tracked × 100`                   |
| `verdict`                              | string \| null | Вердикт промежуточной аттестации, если она включена  |

## Декларативные таблицы (без кода)

Безопасный вариант: в пакете только `manifest.json`, таблицу рисует ядро —
с поиском, фильтром по группе, плотностью строк и экспортом в Excel.

```jsonc
{
  "view": {
    "type": "table",
    "dataset": "students",
    "filter": "attendancePercent < 70 || percent < 50", // какие строки показывать
    "sort": { "column": "percent", "order": "asc" },
    "emptyText": "Все студенты в норме",
    "columns": [
      { "id": "name", "label": "Студент", "value": "name" },
      {
        "id": "score",
        "label": "БРС",
        "hint": "Подсказка в заголовке",
        "value": "round(percent)",
        "format": "number", // text | number | percent | badge
        "digits": 0,
        "align": "center", // left | center | right
        "highlight": [ // первое сработавшее правило задаёт цвет
          { "when": "percent >= 86", "color": "success" },
          { "when": "percent < 61", "color": "error" }
        ]
      }
    ]
  }
}
```

### Язык формул

`value`, `filter` и `highlight.when` — выражения над строкой датасета.
Выполняются собственным интерпретатором (не `eval`): доступа к браузеру и
глобальным объектам у формул нет.

- поля: `percent`, `requiredTotal - requiredClosed`
- арифметика `+ - * / %` (деление на 0 даёт 0), `+` склеивает строки
- сравнения `== != < <= > >=`, логика `&& || !`, тернарный `a ? b : c`
- литералы: числа, `"строки"`, `true`, `false`, `null`
- функции: `round(x, digits)`, `floor`, `ceil`, `abs`, `min(...)`, `max(...)`,
  `pct(a, b)`, `if(cond, a, b)`, `coalesce(...)`, `concat(...)`, `upper`,
  `lower`, `contains(text, part)`

Цвета подсветки: `success`, `warning`, `error`, `info`, `primary`, `neutral`.

## Код-плагины

Когда декларативной таблицы мало — графики, своя логика, сложная раскладка.
`main` указывает на ES-модуль, который экспортирует функцию `setup(sdk)`:

```js
export default function setup(sdk) {
  const { h, computed, defineComponent } = sdk.vue
  const { UCard, UBadge } = sdk.ui

  sdk.registerComponent('MyView', defineComponent({
    props: { rows: Array, subjectId: String },
    setup(props) {
      const avg = computed(() => props.rows.reduce((a, r) => a + r.percent, 0) / (props.rows.length || 1))
      return () => h(UCard, null, () => `Средний балл: ${Math.round(avg.value)}%`)
    },
  }))
}
```

```jsonc
{ "view": { "type": "component", "dataset": "students", "component": "MyView" } }
```

Сборка не нужна: Vue и UI-кит плагин получает из SDK, а не импортирует.

| `sdk.*`                | Что это                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apiVersion`           | Версия контракта SDK (сейчас `1`)                                                                              |
| `vue`                  | Модуль Vue (`h`, `ref`, `computed`, `defineComponent`, …)                                                      |
| `ui`                   | Компоненты @nuxt/ui: `UAlert UBadge UButton UCard UEmpty UIcon UProgress USeparator USkeleton UTable UTooltip` |
| `registerComponent`    | Зарегистрировать компонент под именем из `view.component`                                                      |
| `api.get(path, query)` | GET к API бэкенда через серверный прокси                                                                       |
| `notify(text, color)`  | Всплывающее уведомление                                                                                        |
| `format`               | `round2(n)`, `percent(n)`                                                                                      |

Компонент получает пропсы `rows` (датасет `students`) и `subjectId`.

**Стили.** Плагин грузится после сборки, и Tailwind не видит его классы.
Гарантирован базовый набор утилит (раскладка, отступы, текст, семантические
цвета) — см. блок `@source inline(...)` в `app/assets/css/main.css`. Для
остального используйте компоненты из `sdk.ui` или `style`.

**Безопасность.** Код-плагин выполняется в браузере с правами вошедшего
пользователя. Маркетплейс помечает такие плагины «Исполняет код» и просит
подтверждение при установке. Подключайте только доверенные каталоги.

## Примеры

| Плагин             | Вид             | Что показывает                                  |
| ------------------ | --------------- | ----------------------------------------------- |
| `at-risk-students` | таблица         | Студенты с низкой посещаемостью или баллом      |
| `brs-rating`       | таблица         | 100-балльная шкала, ECTS и традиционная отметка |
| `group-analytics`  | код (компонент) | Средний/медианный балл и распределение ECTS     |
