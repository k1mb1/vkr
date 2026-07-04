<div align="center">

# VKR — система учёта учебного процесса

**Веб-кабинет преподавателя: группы и студенты, занятия и задания,
отметка присутствия по QR-коду, журнал оценок, гибкие политики оценивания
и автоматическая промежуточная аттестация.**

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Nuxt UI 4](https://img.shields.io/badge/Nuxt%20UI-4-00DC82?logo=nuxt&logoColor=white)](https://ui.nuxt.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

---

Фронтенд на **Nuxt 4**. Бэкенд (VKR Backend API) — отдельный сервис; браузер с
ним напрямую не общается: все запросы идут через серверный прокси Nuxt
(`/api/proxy/**`) с подстановкой токена доступа.

## Содержание

- [Возможности](#возможности)
- [Технологии](#технологии)
- [Архитектура](#архитектура)
- [Требования](#требования)
- [Установка](#установка)
- [Запуск](#запуск)
- [Скрипты](#скрипты)
- [Переменные окружения](#переменные-окружения)
- [Демо-режим](#демо-режим)
- [Структура проекта](#структура-проекта)
- [Лицензия](#лицензия)

## Возможности

- 👥 **Группы и студенты** — подгруппы, добавление студентов списком
  (вставка/Enter).
- 📚 **Предметы и доступы** — назначение преподавателей с полным доступом или
  ограничением по группам, подгруппам и типу занятий (лекции/практики).
- 📅 **Занятия** — лекции и практики, проведения (даты по группам/подгруппам),
  задания с режимами допуска (нет / сдал-не сдал / мин. балл / по уровням).
- 📲 **Отметка присутствия (check-in)** — QR-код и код аудитории, окна «вовремя»
  и «для опоздавших», единые окна на предмет; преподаватель подтверждает
  результаты, и они переносятся в посещаемость.
- 📊 **Посещаемость и оценки** — сводные таблицы по группам с фильтрами и
  цветовой подсветкой.
- ⚙️ **Политики оценивания**:
  - понижение/повышение балла за сроки сдачи (штрафы и бонусы);
  - учёт посещаемости в баллах;
  - подсветка таблиц оценок и посещаемости;
  - **промежуточная аттестация** — уровни (отметки) по баллам и закрытым
    обязательным задачам, с порогом по посещаемости.
- 📥 **Экспорт в Excel** — оценки, посещаемость, итоги.
- 🔐 **Аутентификация** — OIDC через защищённые cookie-сессии.

## Технологии

- [Nuxt 4](https://nuxt.com/) + Vue 3, TypeScript
- [@nuxt/ui](https://ui.nuxt.com/) (v4) + Tailwind CSS v4
- [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) — сессии в
  запечатанных cookie, OIDC-флоу
- [@hey-api/openapi-ts](https://heyapi.dev/) — типизированный клиент из
  OpenAPI-схемы (`openapi/api-docs.json` → `.nuxt/client`), валидация запросов
  через `valibot`
- [nuxt-security](https://nuxt-security.vercel.app/) — CSP, заголовки, CORS,
  rate limiting
- [@nuxtjs/i18n](https://i18n.nuxtjs.org/) — локализация (ru по умолчанию, en)
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
  в `.nuxt/client`; базовый URL клиента (`/api/proxy`) задаётся в
  `app/plugins/api.ts`.

## Требования

- Node.js 22+
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
| `pnpm gen:api`   | Генерация клиента из OpenAPI-схемы |

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
| `NUXT_PUBLIC_DEMO_MODE`              | нет         | `true` — включить демо-режим (см. ниже)              |

> В демо-режиме (`NUXT_PUBLIC_DEMO_MODE=true`) OIDC-переменные **не обязательны**.

## Демо-режим

Публичная витрина без входа — для показа комиссии/заказчику. Комиссия
сканирует QR (или жмёт кнопку на главной) и **сама кликает по настоящему
дашборду** на демонстрационных данных.

- Вход — гостевая страница `/demo`: ставит демо-сессию (без OIDC) и уводит в
  дашборд. QR на главной ведёт на `/demo` (показывается только при
  включённом флаге).
- Данные — сидовый набор из `server/utils/demoData.ts`: прокси в демо-режиме
  отдаёт их вместо реального бэкенда, поэтому **бэкенд поднимать не нужно** —
  демку можно задеплоить куда угодно.
- Только просмотр — любые изменения (POST/PUT/PATCH/DELETE) возвращают 403 с
  понятным сообщением; в дашборде висит плашка «Демо-режим».

Включение:

```bash
NUXT_SESSION_PASSWORD=<не менее 32 символов>
NUXT_PUBLIC_DEMO_MODE=true
# OIDC и бэкенд не требуются
```

Затем сгенерируйте QR на публичный адрес `https://<host>/demo` (или используйте
QR с главной страницы) — комиссия сканирует и заходит.

### Быстрый запуск на защите (туннель + QR)

Самый простой способ показать демо без деплоя — поднять сборку локально и дать
ей публичный HTTPS-адрес через туннель:

```bash
# 1. Собрать и запустить в демо-режиме
NUXT_SESSION_PASSWORD=<не менее 32 символов> \
NUXT_PUBLIC_DEMO_MODE=true \
node .output/server/index.mjs            # перед этим один раз: pnpm build

# 2. В соседнем терминале — туннель на порт 3000
cloudflared tunnel --url http://localhost:3000
#   (или: ngrok http 3000)
```

Туннель выдаст адрес вида `https://<random>.trycloudflare.com`. **QR
генерировать вручную не нужно:** откройте этот адрес — на главной уже показан QR,
который автоматически ведёт на `/demo` этого же хоста. Спроецируйте главную на
экран, комиссия сканирует QR и попадает прямо в дашборд.

> Живая отметка присутствия (студенческий поток `/check-in`) требует записи и в
> демо-режиме отключена (только просмотр). Если нужен именно живой интерактив с
> отметкой — поднимите отдельный обычный стенд с реальным бэкендом под этот
> момент; для «полистать дашборд» достаточно демо-режима.

## Структура проекта

```
app/
  pages/          Маршруты (dashboard, предметы, занятия, посещаемость, оценки…)
  components/     UI-компоненты (таблицы, формы, селекты)
  composables/    Логика таблиц, итогов, штрафов, экспорта
  middleware/     Доступ к маршрутам и проверка прав на предмет
  utils/          Хелперы (валидация, форматирование, подсветка)
  layouts/        Макеты страниц
  plugins/        Инициализация API-клиента (baseURL прокси)
server/
  routes/auth/    OIDC-флоу (/auth/oidc)
  api/auth/       Обновление и сброс сессии
  api/demo/       Гостевой вход в демо-режиме
  api/proxy/      Прокси к бэкенду (в демо-режиме — сидовые данные)
  utils/          getAccessToken, demoData (сидовый набор), demoMode
  middleware/     Синхронизация преподавателя, обновление сессии, CSRF
openapi/
  api-docs.json   OpenAPI-схема бэкенда (источник типов клиента)
i18n/             Конфигурация локализации (ru, en)
```

## Лицензия

[MIT](./LICENSE)
