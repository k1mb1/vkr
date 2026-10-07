# Концепция: платформа «ядро + плагины»

> Статус: черновик концепции. Кода нет — документ для обсуждения архитектуры.

## Зачем

VKR сейчас — монолитный кабинет преподавателя: группы, занятия, check-in по QR,
журнал оценок, политики оценивания, промежуточная аттестация.

Новое приложение — **универсальная платформа**:

- **ядро** ничего не знает о предметной области (нет «студентов», «групп», «занятий»);
- вся предметная логика и все данные живут в **плагинах**, которые пишем мы сами;
- плагины включаются в рабочем пространстве через **«маркетплейс»**;
- **каждый плагин приносит свою таблицу** с данными.

Учебный процесс становится лишь одним набором плагинов.

## Общая схема

```
                      ┌──────────────────────── Nuxt (фронт) ────────────────────────┐
Браузер ──cookie──►   │  оболочка ядра: навигация, маркетплейс, общий <PluginTable>  │
                      │  Nuxt layer на каждый плагин: маршруты, меню, настройки      │
                      └───────────────────────────┬──────────────────────────────────┘
                                                  │ /api/proxy/** (+ JWT)
                      ┌───────────────────────────▼──────── Spring Boot (бэкенд) ────┐
                      │ ЯДРО                                                         │
                      │  workspace · members/roles · plugin registry · entity registry│
                      │  table framework · event bus · аудит · экспорт               │
                      ├──────────────────────────────────────────────────────────────┤
                      │ ПЛАГИНЫ (модули, вкомпилированы)                             │
                      │  people · schedule · attendance · check-in · grading ·       │
                      │  penalties · final-assessment · …                            │
                      └───────────────────────────┬──────────────────────────────────┘
                                                  │
                      ┌───────────────────────────▼──────── PostgreSQL ──────────────┐
                      │ core.*        p_people.*   p_schedule.*   p_attendance.*  …  │
                      └──────────────────────────────────────────────────────────────┘
```

## 1. Ядро

| Компонент | Назначение |
|---|---|
| **Workspace** | Рабочее пространство (кафедра, курс, команда). Граница изоляции данных. |
| **Members & Roles** | Пользователи (OIDC, как сейчас), роли в workspace, права, объявленные плагинами. |
| **Plugin Registry** | Каталог вкомпилированных плагинов + что включено в каком workspace. |
| **Entity Registry** | Реестр «существует сущность X типа T» — общая точка для ссылок между плагинами (см. §4). |
| **Table Framework** | Единый формат таблицы и общий фронт-компонент: отображение, редактирование, подсветка, экспорт. |
| **Event Bus** | Доменные события между плагинами (Spring application events / Spring Modulith). |
| Общее | Аудит, экспорт в Excel, i18n, страница «Маркетплейс». |

Таблицы ядра:

```sql
core.workspace        (id, name, ...)
core.workspace_member (workspace_id, user_id, role)
core.workspace_plugin (workspace_id, plugin_id, version, enabled, settings jsonb)
core.entity           (id uuid, workspace_id, type text, plugin_id, archived_at)
```

## 2. Контракт плагина

### Бэкенд

Плагин — модуль Spring со структурой `web/ domain/ internal/` (как модули текущего
бэкенда) и описанием:

```java
public interface PluginDescriptor {
    String id();                      // "attendance"
    String version();                 // "1.0.0"
    String name();                    // для маркетплейса
    String description();
    Set<String> dependsOn();          // {"people", "schedule"}
    Set<String> providesEntityTypes(); // {"attendance.mark"}
    Set<String> referencesEntityTypes(); // {"people.member", "schedule.lesson"}
    Set<String> permissions();        // {"attendance.read", "attendance.write"}
    JsonNode settingsSchema();        // JSON Schema настроек → форма на фронте

    default void onEnable(UUID workspaceId) {}
    default void onDisable(UUID workspaceId) {}
}

public interface TableProvider {
    String tableId();                 // "attendance.journal"
    TableResponse table(UUID workspaceId, TableQuery query);
}

public record TableResponse(
    List<Column> columns,             // id, title, type, editor, group (секции)
    List<Row> rows,                   // id сущности + подписи
    Map<String, Cell> cells,          // "rowId:columnId" → value, highlight, editable
    Map<String, Object> meta          // итоги, легенда подсветки
) {}
```

Правила:

- свои миграции Liquibase в своей схеме `p_<id>`; накатываются при старте,
  данные сохраняются, даже если плагин выключен;
- REST под `/api/w/{workspace}/p/{pluginId}/**`; общий фильтр ядра закрывает
  доступ, если плагин не включён в workspace;
- данные других плагинов — только через их публичный `*Api`
  (как сейчас `AttendanceApi`, `GradingApi`), никакого прямого SQL в чужую схему.

### Фронт

Nuxt layer на плагин: маршруты, пункт меню, форма настроек (генерируется из
JSON Schema), при необходимости — свои редакторы ячеек. Таблицу рисует общий
компонент ядра по `TableResponse` (переиспользуем `SectionedTable`,
`useGridCellNav`, `use*Drafts`, `use*Export`).

### Маркетплейс

- Список плагинов: описание, версия, зависимости, статус в workspace.
- **Установить** — проверка `dependsOn` → `enabled = true` → `onEnable`.
- **Удалить** — выключить (данные сохраняются) или выключить с очисткой.

## 3. Набор плагинов «Учебный процесс» (перенос из VKR)

| Плагин | Таблица | Источник в VKR |
|---|---|---|
| `people` | участники × группы/подгруппы | `group`, `student` |
| `schedule` | занятия и проведения | `lesson` |
| `attendance` | участники × занятия, статусы | `attendance` |
| `check-in` | сессии и отметки по QR | `attendance/checkin` |
| `grading` | участники × задания | `grading` |
| `penalties` | — (модификатор баллов `grading`) | `PenaltyPolicy` |
| `final-assessment` | участники × итог | `results`, `FinalAssessmentPolicy`, `useFinalVerdict` |

## 4. Данные и связи — только в плагинах

Ядро не знает слов «участник», «группа», «занятие». Оно хранит только реестр
сущностей `core.entity`. Всё остальное — в схемах плагинов:

```sql
p_people.member      (id → core.entity, full_name, ...)
p_people.group       (id → core.entity, name, ...)
p_people.membership  (member_id, group_id)               -- «участник ∈ группа» знает только people
p_schedule.lesson    (id → core.entity, type, starts_at, ...)
p_attendance.mark    (member_id → core.entity, lesson_id → core.entity, status)
p_grading.assignment (id → core.entity, lesson_id → core.entity, max_score, ...)
p_grading.grade      (member_id → core.entity, assignment_id → core.entity, score)
```

- Ссылки между плагинами — FK **на `core.entity`**, а не на таблицу чужого
  плагина. База сама держит целостность, а плагины не связаны схемами.
- Тип ссылки проверяется в сервисе/триггере: `member_id` обязан указывать на
  сущность типа `people.member`.
- Плагин объявляет, на какие типы он ссылается (`referencesEntityTypes`) —
  это и определяет `dependsOn`.
- Удаление/архивация: ядро публикует `EntityArchived(id, type)`, зависимые
  плагины реагируют сами; FK `ON DELETE RESTRICT` не даёт оставить «висячие» ссылки.

Следствие: плагин `people` можно заменить другим («команды», «сотрудники»), и
`attendance`/`grading` продолжат работать, пока новый плагин публикует
сущности нужного типа.

**Альтернатива** — универсальное хранилище в ядре
(`record(type, data jsonb)` + `link(from, to, kind)`). Гибче, но теряются
типизация, ограничения и быстрые агрегаты. Оставляем на случай, если появятся
таблицы, которые пользователи создают сами, без кода.

## 5. PostgreSQL или MongoDB → PostgreSQL (+ JSONB)

- Плагины пишем мы → схемы известны заранее; главное преимущество MongoDB
  (произвольные схемы) здесь не нужно.
- Данные сильно связаны: участник ↔ группа ↔ занятие ↔ оценка ↔ посещаемость.
  Итоговая аттестация — агрегаты по нескольким плагинам; в SQL это JOIN,
  в MongoDB — `$lookup`, денормализация и ручная согласованность.
- Целостность (FK, уникальность «одна отметка на участника и занятие»,
  транзакции) — из коробки. Схема «ссылки через `core.entity`» из §4 работает
  только при проверке ссылок базой.
- Гибкие части (настройки плагинов, уровни аттестации, пороги подсветки) —
  JSONB с GIN-индексами.
- Изоляция: схема на плагин; workspace — `workspace_id` + Row-Level Security.
- Текущий стек уже на JPA / Liquibase / Testcontainers-PostgreSQL.

## 6. Открытые вопросы

1. Модульный монолит (рекомендуется) или отдельные сервисы на плагин.
2. Версионирование плагинов и миграции при обновлении в workspace.
3. Нужен ли кабинет участника (студента) или только публичные страницы, как check-in.
4. Вычисляемые колонки из нескольких плагинов (итог = grading + attendance) —
   считать на бэке (рекомендуется) или на фронте, как сейчас `useFinalVerdict`.
