# Концепция: платформа «ядро + плагины»

> Статус: черновик концепции. Кода нет — документ для обсуждения архитектуры.
> Хранилище: **PostgreSQL + JSONB**.

## Зачем

VKR сейчас — монолитный кабинет преподавателя: группы, занятия, check-in по QR,
журнал оценок, политики оценивания, промежуточная аттестация. Бэкенд построен на
привычных сущностях (`Group`, `Student`, `Lesson`, `Grade`, …) — по таблице на каждую.

Новое приложение — **универсальная платформа**, бэкенд пишется заново:

- **ядро не знает предметной области** — в нём нет «студентов», «групп», «занятий»
  ни в коде, ни в схеме БД;
- **плагины** (пишем их мы) объявляют, *какие данные* они хранят и *по каким
  правилам* из них строится таблица;
- данные всех плагинов хранятся в **одном универсальном хранилище записей**
  (`record` + `link`), структура записи у каждого плагина своя;
- плагины включаются в рабочем пространстве через **«маркетплейс»**, каждый
  плагин приносит **свою таблицу**.

Учебный процесс — лишь один набор плагинов поверх такого ядра.

## Общая схема

```
Браузер ──cookie──► Nuxt (фронт)
                     ├─ оболочка: навигация, маркетплейс, общий <PluginTable>, формы по JSON Schema
                     └─ /api/proxy/** (+ JWT)
                              │
                              ▼
                    Spring Boot (бэкенд)
                     ├─ ЯДРО
                     │   workspace · members/roles · plugin registry
                     │   RecordStore (record + link) · Table Engine · Event Bus · аудит/экспорт
                     └─ ПЛАГИНЫ (вкомпилированные модули)
                         people · schedule · attendance · check-in · grading · final-assessment · …
                              │
                              ▼
                    PostgreSQL
                     core.workspace · core.member · core.plugin_install
                     core.record (data jsonb) · core.link
```

## 1. Ядро

| Компонент | Назначение |
|---|---|
| **Workspace** | Рабочее пространство (кафедра, курс, команда). Граница изоляции данных. |
| **Members & Roles** | Пользователи (OIDC, как сейчас), роли в workspace, права, объявленные плагинами. |
| **Plugin Registry** | Каталог вкомпилированных плагинов; что включено в каком workspace и с какими настройками. |
| **RecordStore** | Универсальное хранилище записей и связей. Проверяет данные по схемам плагинов. |
| **Table Engine** | Строит таблицу по правилам плагина и отдаёт её в едином формате. |
| **Event Bus** | События `RecordCreated/Updated/Deleted`, `LinkCreated/Deleted` — плагины реагируют на чужие изменения. |
| Общее | Аудит, экспорт в Excel, i18n, страница «Маркетплейс». |

Ядро — обычные реляционные таблицы (они одинаковы для любого набора плагинов):

```sql
core.workspace       (id uuid pk, name, created_at)
core.member          (workspace_id, user_id, role, primary key (workspace_id, user_id))
core.plugin_install  (workspace_id, plugin_id, version, enabled bool, settings jsonb,
                      primary key (workspace_id, plugin_id))
```

## 2. Хранилище данных плагинов: `record` + `link`

### Записи

Любые данные любого плагина — это запись. Тип записи задаёт плагин, содержимое
лежит в `data jsonb`:

```sql
create table core.record (
    id            uuid primary key,
    workspace_id  uuid    not null references core.workspace,
    plugin_id     text    not null,               -- 'attendance'
    type          text    not null,               -- 'attendance.mark'
    schema_ver    int     not null,               -- версия схемы типа, по которой записано data
    data          jsonb   not null,               -- { "status": "LATE", "at": "..." }
    created_by    uuid, created_at timestamptz, updated_at timestamptz,
    archived_at   timestamptz
);

create index on core.record (workspace_id, type) where archived_at is null;
create index on core.record using gin (data jsonb_path_ops);
-- горячие поля конкретного типа — индекс по выражению, объявляется плагином:
-- create index on core.record ((data->>'status')) where type = 'attendance.mark';
```

### Связи

Связи между записями (в том числе записями **разных** плагинов) хранятся
отдельно — так база гарантирует, что ссылка указывает на существующую запись:

```sql
create table core.link (
    workspace_id uuid not null,
    kind         text not null,                   -- 'attendance.mark.member'
    from_id      uuid not null references core.record on delete cascade,
    to_id        uuid not null references core.record on delete restrict,
    position     int,                             -- порядок, если важен
    primary key (kind, from_id, to_id)
);
create index on core.link (to_id, kind);          -- обратный обход: «все отметки занятия»
```

- `from` удалён → его исходящие связи удаляются (`cascade`).
- `to` нельзя удалить, пока на него ссылаются (`restrict`) — сначала архивируем
  или плагин-владелец ссылки сам решает, что делать (по событию).
- Разрешённые типы концов связи (`member` → только `people.member`) проверяет
  `RecordStore` по объявлению плагина.

### Почему не «всё в data»

Ссылку можно было бы положить в `data` (`"memberId": "..."`), но тогда база её
не проверяет. Правило: **значения — в `data`, ссылки на другие записи — в `link`**.

### Изоляция workspace

Все запросы идут с `workspace_id`; дополнительно включается Row-Level Security
по `current_setting('app.workspace_id')`, чтобы ошибка в плагине не дала
прочитать чужое пространство.

## 3. Контракт плагина

Плагин — модуль Spring. Он **не создаёт таблиц в БД**; всё, что он хранит,
описывается декларативно и проходит через `RecordStore`.

```java
public interface Plugin {
    PluginInfo info();                     // id, version, name, description, dependsOn
    List<RecordTypeDef> recordTypes();     // какие записи хранит
    List<LinkKindDef> linkKinds();         // какие связи создаёт
    List<TableDef> tables();               // какие таблицы строит
    List<String> permissions();            // 'attendance.read', 'attendance.write'
    JsonNode settingsSchema();             // JSON Schema настроек → форма на фронте

    default void onEnable(PluginContext ctx) {}
    default void onDisable(PluginContext ctx) {}
    default void onEvent(PluginContext ctx, RecordEvent event) {}
}

record RecordTypeDef(String type, int version, JsonNode jsonSchema,
                     List<String> indexedPaths,          // → индексы по выражению
                     Migration fromPrevious) {}          // как поднять data со старой версии
record LinkKindDef(String kind, String fromType, String toType,
                   Cardinality cardinality, boolean required) {}
```

Правила:

- `data` каждой записи валидируется по `jsonSchema` своего типа при записи;
- плагин читает и пишет **чужие** типы только если они есть в его `dependsOn`
  (обычно — только читает и ссылается);
- изменение структуры типа = новая `version` + функция миграции `data`;
  миграция выполняется лениво при чтении или фоновой задачей — без DDL;
- REST плагина — под `/api/w/{workspace}/p/{pluginId}/**`; общий фильтр ядра
  закрывает доступ, если плагин не включён.

### Плагин и общие типы

Плагины могут договориться о «контрактных» типах. Например, `attendance`
ссылается не на `people.member`, а на любой тип, помеченный ролью `participant`.
Тогда `people` можно заменить другим плагином («команды», «сотрудники»), и
посещаемость продолжит работать.

## 4. Правила построения таблиц (Table Engine)

Каждая таблица плагина описывается декларацией `TableDef`. Простые случаи
закрываются описанием, сложные — кодом.

```java
record TableDef(
    String id,                 // 'attendance.journal'
    RowsSpec rows,             // откуда строки: записи типа X (+ фильтр, группировка, сортировка)
    ColumnsSpec columns,       // колонки: фиксированные поля ИЛИ записи типа Y (динамические колонки)
    CellSpec cell,             // как найти запись-ячейку для (строка, колонка) и какое поле показать
    List<ComputedColumn> computed,   // вычисляемые колонки (итоги)
    HighlightSpec highlight,   // правила подсветки
    EditSpec edit              // какие ячейки редактируемы и как сохраняются
) {}

interface ComputedColumn {     // для логики, которую декларацией не выразить
    String id();
    Object compute(RowContext row, PluginSettings settings);
}
```

Результат всегда в одном формате — его рисует общий фронт-компонент:

```java
record TableResponse(
    List<Column> columns,          // id, title, type, editor, section
    List<Row> rows,                // id записи + подписи
    Map<String, Cell> cells,       // "rowId:colId" → value, highlight, editable, sourceRecordId
    Map<String, Object> meta       // итоги, легенда подсветки
) {}
```

Как Table Engine выполняет правило:

1. выбирает строки: `record where type = rows.type` (+ фильтры по `data`, по связям);
2. выбирает колонки: фиксированный список или `record where type = columns.type`;
3. выбирает записи-ячейки одним запросом через `link` (по `from_id`/`to_id`);
4. считает `computed`-колонки в коде плагина;
5. применяет подсветку и права, отдаёт `TableResponse`.

Тяжёлые вычисляемые колонки можно кэшировать (материализованный результат в
`record` служебного типа, пересчёт по событиям).

## 5. Пример: учебный набор плагинов

| Плагин | Типы записей | Связи | Таблица |
|---|---|---|---|
| `people` | `people.member {fullName}`, `people.group {name}` | `member → group` | участники по группам |
| `schedule` | `schedule.lesson {kind, startsAt, topic}` | `lesson → group` | занятия |
| `attendance` | `attendance.mark {status}` | `mark → member`, `mark → lesson` | участники × занятия |
| `check-in` | `checkin.session {code, window}`, `checkin.entry {at}` | `session → lesson`, `entry → member` | сессии и отметки; по подтверждению создаёт `attendance.mark` |
| `grading` | `grading.assignment {maxScore, admission}`, `grading.grade {score}` | `assignment → lesson`, `grade → member`, `grade → assignment` | участники × задания |
| `final-assessment` | — (только настройки: уровни, пороги) | — | участники × итог (вычисляемая) |

### Посещаемость

```
attendance.mark  data = { "status": "LATE" }
                 link   attendance.mark.member → people.member
                 link   attendance.mark.lesson → schedule.lesson

TableDef 'attendance.journal':
  rows    = people.member, сгруппированы по связи member → group
  columns = schedule.lesson, отсортированы по data.startsAt
  cell    = attendance.mark, у которой link.member = row и link.lesson = column; показать data.status
  edit    = смена status → upsert attendance.mark
```

### Итоговая аттестация

Своих данных почти нет — только настройки (`plugin_install.settings`):
уровни оценок, пороги баллов, требования по посещаемости, обязательные задания.

```
TableDef 'final.results':
  rows     = people.member
  computed = total     — сумма grading.grade.score (+ баллы за посещаемость, если режим COMBINED)
           = admitted  — закрыты ли обязательные задания, выполнен ли порог посещаемости
           = verdict   — уровень по total из настроек
```

Расчёт переносится с фронта (`useFinalVerdict`) на бэкенд — в `ComputedColumn`
плагина.

## 6. Почему PostgreSQL + JSONB

- **Разные данные у разных плагинов** — `record.data jsonb`, без миграций схемы
  БД при добавлении плагина или поля.
- **Целостность связей** — `core.link` с FK: нельзя сослаться на несуществующую
  запись или удалить занятие, у которого есть отметки. В MongoDB это пришлось бы
  обеспечивать кодом.
- **Транзакции** — подтверждение check-in атомарно создаёт пачку
  `attendance.mark` и связи.
- **Запросы по данным** — GIN-индекс на `data`, индексы по выражению для горячих
  полей, JSON-path; при необходимости — SQL-агрегаты.
- **Ядро остаётся реляционным** — workspace, участники, права, установки плагинов.
- **Запасной путь** — если плагину понадобится скорость, ему можно точечно дать
  настоящую таблицу, не меняя остальную модель.
- **Стек знаком** — Spring Boot, Liquibase (только для таблиц ядра),
  Testcontainers-PostgreSQL.

Доступ к хранилищу скрыт за интерфейсом `RecordStore`, поэтому плагины не
зависят от SQL напрямую.

## 7. Фронт

- Оболочка ядра: авторизация (как сейчас — OIDC + серверный прокси), навигация,
  маркетплейс.
- Общий `<PluginTable>` рисует любой `TableResponse` — на основе текущих
  `SectionedTable`, `useGridCellNav`, `use*Drafts`, `use*Export`.
- Формы записей и настроек генерируются из JSON Schema.
- Nuxt layer плагина нужен, только если ему нужны свои страницы или редакторы
  ячеек (например, экран с QR-кодом для check-in).

## 8. Открытые вопросы

1. Модульный монолит (рекомендуется) или отдельные сервисы на плагин.
2. Миграции `data` при смене версии типа: лениво при чтении или фоновой задачей.
3. Нужен ли кабинет участника (студента) или только публичные страницы, как check-in.
4. Насколько выразительным делать декларативный `TableDef` и где граница с кодом
   (`ComputedColumn`).
5. Производительность больших таблиц (сотни участников × десятки занятий):
   кэширование вычисляемых колонок, пагинация, индексы по выражению.
