# VKR — система учёта учебного процесса

Веб-приложение для преподавателей: управление группами и студентами, занятиями
и заданиями, отметка присутствия по QR-коду, журнал оценок, гибкие политики
оценивания и автоматическая промежуточная аттестация.

Фронтенд на **Nuxt 4**. Бэкенд (VKR Backend API) — отдельный сервис; браузер с
ним напрямую не общается: все запросы идут через серверный прокси Nuxt
(`/api/proxy/**`) с подстановкой токена доступа.

## Возможности

- **Группы и студенты** — подгруппы, добавление студентов списком (вставка/Enter).
- **Предметы и доступы** — назначение преподавателей с полным доступом или
  ограничением по группам, подгруппам и типу занятий (лекции/практики).
- **Занятия** — лекции и практики, проведения (даты по группам/подгруппам),
  задания с режимами допуска (нет / сдал-не сдал / мин. балл / по уровням).
- **Отметка присутствия (check-in)** — QR-код и код аудитории, окна «вовремя» и
  «для опоздавших», единые окна на предмет; преподаватель подтверждает
  результаты, и они переносятся в посещаемость.
- **Посещаемость и оценки** — сводные таблицы по группам с фильтрами и
  цветовой подсветкой.
- **Политики оценивания**:
  - понижение/повышение балла за сроки сдачи (штрафы и бонусы);
  - учёт посещаемости в баллах;
  - подсветка таблиц оценок и посещаемости;
  - **промежуточная аттестация** — уровни (отметки) по баллам и закрытым
    обязательным задачам, с порогом по посещаемости.
- **Экспорт в Excel** — оценки, посещаемость, итоги.
- **Аутентификация** — OIDC через защищённые cookie-сессии.

## Технологии

- [Nuxt 4](https://nuxt.com/) + Vue 3, TypeScript
- [@nuxt/ui](https://ui.nuxt.com/) (v4) + Tailwind CSS v4
- [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) — сессии в
  запечатанных cookie, OIDC-флоу
- [nuxt-open-fetch](https://nuxt-open-fetch.vercel.app/) — типизированный
  клиент из OpenAPI-схемы (`openapi/api-docs.json`)
- [nuxt-security](https://nuxt-security.vercel.app/) — CSP, заголовки, CORS,
  rate limiting
- [@nuxtjs/i18n](https://i18n.nuxtjs.org/) — локализация (ru)
- `@tanstack/vue-table`, `valibot` (валидация форм), `xlsx` (экспорт),
  `qrcode` (QR), `@vueuse/core`

## Архитектура

```
Браузер ──► Nuxt (этот проект)
              ├─ OIDC-флоу и cookie-сессия (nuxt-auth-utils)
              └─ /api/proxy/**  ──►  VKR Backend API
                 (серверная подстановка access token)
```

- Браузер общается только с origin Nuxt; бэкенд доступен лишь со стороны
  сервера через прокси — токены не попадают в браузер.
- Типы и клиент для бэкенда генерируются из `openapi/api-docs.json`
  (клиент `backend`, `baseURL: /api/proxy`).

## Требования

- Node.js 24+
- pnpm 11+
- Запущенный VKR Backend API и OIDC-провайдер

## Установка

```bash
pnpm install
cp .env.example .env
```

Заполните `.env`:

```bash
# Секрет для шифрования cookie-сессии (минимум 32 символа)
NUXT_SESSION_PASSWORD=

# OIDC-провайдер
NUXT_OAUTH_OIDC_CLIENT_ID=
NUXT_OAUTH_OIDC_CLIENT_SECRET=
NUXT_OAUTH_OIDC_OPENID_CONFIG=https://id.example.com/.well-known/openid-configuration
NUXT_OAUTH_OIDC_REDIRECT_URL=http://front.localhost/auth/oidc

# Необязательно: federated logout, если провайдер поддерживает
NUXT_OIDC_POST_LOGOUT_REDIRECT_URL=http://front.localhost/

# Адреса бэкенда и origin сайта
NUXT_PUBLIC_BACKEND_BASE_URL=http://backend.localhost
NUXT_PUBLIC_SITE_ORIGIN=http://front.localhost
```

В настройках OIDC-клиента укажите callback URL, совпадающий с
`NUXT_OAUTH_OIDC_REDIRECT_URL` (например, `http://front.localhost/auth/oidc`).

## Запуск

```bash
pnpm dev        # режим разработки
pnpm build      # production-сборка
pnpm preview    # предпросмотр сборки
```

После старта откройте `/auth/login` для входа и `/dashboard` — рабочий стол.

## Скрипты

| Команда          | Назначение                         |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Дев-сервер с HMR                   |
| `pnpm build`     | Production-сборка                  |
| `pnpm preview`   | Предпросмотр собранного приложения |
| `pnpm lint`      | ESLint (`@antfu/eslint-config`)    |
| `pnpm typecheck` | Проверка типов (`nuxt typecheck`)  |

## Переменные окружения

| Переменная                           | Обязательна | Описание                                             |
| ------------------------------------ | ----------- | ---------------------------------------------------- |
| `NUXT_SESSION_PASSWORD`              | да          | Ключ шифрования cookie-сессии (≥ 32 символов)        |
| `NUXT_OAUTH_OIDC_CLIENT_ID`          | да          | Client ID OIDC-приложения                            |
| `NUXT_OAUTH_OIDC_CLIENT_SECRET`      | да          | Client Secret OIDC-приложения                        |
| `NUXT_OAUTH_OIDC_OPENID_CONFIG`      | да          | URL `.well-known/openid-configuration`               |
| `NUXT_OAUTH_OIDC_REDIRECT_URL`       | да          | Callback URL (должен совпадать с настройкой клиента) |
| `NUXT_PUBLIC_BACKEND_BASE_URL`       | да          | Базовый URL VKR Backend API                          |
| `NUXT_PUBLIC_SITE_ORIGIN`            | да          | Origin фронтенда (для CORS)                          |
| `NUXT_OIDC_POST_LOGOUT_REDIRECT_URL` | нет         | Redirect после federated logout                      |
| `NUXT_PROXY_TIMEOUT_MS`              | нет         | Таймаут прокси к бэкенду (по умолчанию 15000)        |

## Структура проекта

```
app/
  pages/          Маршруты (dashboard, предметы, занятия, посещаемость, оценки…)
  components/     UI-компоненты (таблицы, формы, селекты)
  composables/    Логика таблиц, итогов, штрафов, экспорта
  middleware/     Доступ к маршрутам и проверка прав на предмет
  utils/          Хелперы (валидация, форматирование, подсветка)
  layouts/        Макеты страниц
server/
  routes/auth/    OIDC-флоу (/auth/oidc)
  api/auth/       Обновление и сброс сессии
  api/proxy/      Прокси к бэкенду с подстановкой токена
  middleware/     Синхронизация преподавателя, обновление сессии, CSRF
openapi/
  api-docs.json   OpenAPI-схема бэкенда (источник типов клиента)
i18n/             Конфигурация локализации
```

## Лицензия

[MIT](./LICENSE)
