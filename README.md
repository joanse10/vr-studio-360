# VR Studio 360

Платформа для визуализации 360° панорамных рендеров интерьеров с переходами между комнатами и форматом "до/после".

## Возможности

- **360° Viewer** — просмотр equirectangular панорам с переходами между комнатами (hotspots)
- **До / После** — слайдер сравнения изображений до и после рендера
- **Админ-панель** — создание коллекций, загрузка панорам, управление клиентами
- **Приватные ссылки** — генерация уникальных ссылок для клиентов
- **SEO** — SSR, sitemap.xml, robots.txt, Open Graph, JSON-LD
- **Футуристичный UI** — тёмная тема, неоновые акценты, glassmorphism

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Создание базы данных
npx prisma db push

# Создание админ-пользователя и демо-данных
npx prisma db seed

# Запуск dev-сервера
npm run dev
```

## Доступ

- **Сайт:** http://localhost:3000
- **Админка:** http://localhost:3000/admin/login
- **Логин по умолчанию:** admin / admin123

## Технологии

- Next.js 14 (App Router, SSR/SSG)
- TypeScript
- TailwindCSS
- Prisma + SQLite
- Pannellum (360° viewer)
- JWT авторизация

## Структура

```
src/
  app/
    page.tsx                    — лендинг / галерея
    collection/[slug]/          — просмотр коллекции (360° + до/после)
    share/[token]/              — доступ по приватной ссылке
    admin/
      login/                    — вход
      dashboard/                — дашборд
      collections/new/          — создание коллекции
      clients/                  — управление клиентами
    api/                        — REST API
    sitemap.ts                  — SEO sitemap
    robots.ts                   — SEO robots
  components/
    Viewer360.tsx               — 360° панорама viewer
    BeforeAfterSlider.tsx       — слайдер до/после
    RoomNavigator.tsx           — навигация по комнатам
    AdminLayout.tsx             — layout админки
  lib/
    prisma.ts                   — Prisma client
    auth.ts                     — JWT утилиты
    utils.ts                    — общие утилиты
  middleware.ts                 — защита админ-роутов
```
