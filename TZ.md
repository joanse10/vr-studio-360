# Техническое задание (ТЗ) — Enterprise уровень

## Проект: VR-Studio 360 — Платформа визуализации 360° рендеров

### 1. Описание проекта

Веб-приложение для дизайнера/3D-моделлера, создающего визуализации и рендеры домов и помещений. Платформа позволяет загружать 360° панорамные изображения, организованные в коллекции (проекты), и передавать их клиентам для просмотра и утверждения.

### 2. Целевая аудитория

- **Администратор (дизайнер):** загружает 360° рендеры, создаёт коллекции, управляет доступом, генерирует ссылки
- **Клиенты:** просматривают 360° панорамы, переключаются между комнатами, видят формат "до/после", одобряют или отклоняют проекты

### 3. Технологический стек

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| Фреймворк | Next.js 14 (App Router) | SSR/SSG для SEO, image optimization, file-based routing |
| Язык | TypeScript | Типобезопасность, enterprise-стандарт |
| Стилизация | TailwindCSS | Быстрая разработка, минимальный CSS bundle |
| 360° Viewer | Pannellum (lightweight) | ~100KB, быстрый рендер, equirectangular поддержка |
| База данных | Prisma + SQLite | Простота деплоя, без внешних зависимостей |
| Аутентификация | JWT (httpOnly cookies) | Безопасность, простота, без внешних сервисов |
| Хранилище | Локальная файловая система | Простота, переносимость |
| Деплой | Netlify / Vercel | Автоматический CI/CD, CDN |

### 4. Функциональные требования

#### 4.1. Админ-панель (защищена паролем)

- **Авторизация:** логин/пароль → JWT в httpOnly cookie
- **Дашборд:** список всех коллекций с превью
- **Создание коллекции:**
  - Название проекта
  - Описание
  - Тип доступа: публичный / приватный (по ссылке)
  - Загрузка 360° панорам (equirectangular JPG/PNG)
  - Назначение комнат (имя + изображение + порядок)
  - Настройка переходов между комнатами (hotspots)
  - Загрузка пар "до/после" (before/after изображения)
- **Управление доступом:**
  - Открыть/закрыть доступ к коллекции
  - Генерация уникальной ссылки для клиента
  - Привязка ссылки к конкретному email/имени клиента
- **Управление клиентами:**
  - Создание клиента (имя, email)
  - Назначение коллекций клиентам
  - Просмотр статуса (просмотрено / одобрено / отклонено)

#### 4.2. Клиентский интерфейс

- **Лендинг / галерея:** список публичных коллекций (SEO-оптимизированный)
- **Просмотр коллекции:**
  - 360° панорама с управлением (мышь, тач, гироскоп)
  - Переходы между комнатами (hotspots на панораме)
  - Миникарта / список комнат
  - Режим "до/после" — слайдер сравнения двух изображений
  - Информация о проекте
- **Действия клиента:**
  - Одобрить / Отклонить проект
  - Комментарий (опционально)
- **Доступ по ссылке:**
  - Публичная ссылка (доступна всем)
  - Приватная ссылка (только с уникальным токеном)

#### 4.3. 360° Viewer

- **Формат:** Equirectangular (2:1)
- **Управление:** drag, pinch-zoom, двойной тап, гироскоп
- **Hotspots:** точки перехода между комнатами, информационные точки
- **Переходы:** плавный fade-переход между сценами
- **Автовращение:** опциональное медленное вращение

#### 4.4. Режим "До/После" (Before/After)

- Слайдер сравнения двух изображений (до ремонта / после рендера)
- Перетаскиваемый разделитель
- Поддержка touch-устройств
- Опционально: 360° "до" vs 360° "после"

### 5. Нефункциональные требования

#### 5.1. Производительность

- First Contentful Paint < 1.5s
- LCP < 2.5s
- 360° viewer загружается < 3s на 4G
- Lazy loading изображений
- Next.js Image Optimization (WebP/AVIF)
- Code splitting и dynamic imports

#### 5.2. SEO

- Server-Side Rendering (SSR) для публичных страниц
- Динамические meta-теги (Open Graph, Twitter Cards)
- Автоматический sitemap.xml
- robots.txt
- Семантическая HTML-разметка
- Структурированные данные (JSON-LD)
- Чистые URL: `/collection/[slug]`

#### 5.3. Безопасность

- Админ-панель защищена JWT (httpOnly, Secure, SameSite)
- Приватные коллекции доступны только по токену
- Валидация загрузки файлов (тип, размер)
- Rate limiting на API endpoints
- Sanitization входных данных

#### 5.4. UI/UX

- **Футуристичный дизайн:**
  - Тёмная тема с неоновыми акцентами (cyan/purple)
  - Glassmorphism элементы
  - Плавные анимации (Framer Motion)
  - Минималистичный интерфейс
  - Адаптивный дизайн (mobile-first)
- **Микроинтеракции:** hover-эффекты, переходы, loading-состояния

### 6. Структура базы данных

```
User (админ)
  - id, username, passwordHash, createdAt

Collection (проект)
  - id, slug, title, description, status (public/private/closed)
  - coverImage, createdAt, updatedAt

Room (комната в коллекции)
  - id, collectionId, name, order, panoramaUrl
  - initialView (yaw, pitch, hfov)

Hotspot (точка перехода)
  - id, fromRoomId, toRoomId, yaw, pitch, icon, label

BeforeAfter (пара до/после)
  - id, collectionId, roomId (optional), title
  - beforeImage, afterImage

Client (клиент)
  - id, name, email, createdAt

ClientAccess (доступ клиента к коллекции)
  - id, clientId, collectionId, accessToken
  - status (pending/viewed/approved/rejected)
  - viewedAt, approvedAt, comment

ShareLink (ссылка для шеринга)
  - id, collectionId, token, type (public/private)
  - expiresAt (optional), createdAt
```

### 7. API Endpoints

#### Auth
- `POST /api/auth/login` — вход админа
- `POST /api/auth/logout` — выход
- `GET /api/auth/check` — проверка сессии

#### Collections (админ)
- `GET /api/admin/collections` — список
- `POST /api/admin/collections` — создание
- `PUT /api/admin/collections/[id]` — обновление
- `DELETE /api/admin/collections/[id]` — удаление
- `POST /api/admin/collections/[id]/rooms` — добавление комнаты
- `POST /api/admin/collections/[id]/before-after` — добавление пары до/после

#### Upload
- `POST /api/admin/upload` — загрузка 360° панорамы
- `POST /api/admin/upload/image` — загрузка обычного изображения

#### Clients
- `GET /api/admin/clients` — список клиентов
- `POST /api/admin/clients` — создание
- `POST /api/admin/clients/[id]/access` — назначение доступа

#### Public
- `GET /api/collections` — публичные коллекции
- `GET /api/collections/[slug]` — конкретная коллекция
- `POST /api/collections/[slug]/feedback` — отзыв клиента
- `GET /api/share/[token]` — доступ по ссылке

### 8. Структура проекта

```
src/
  app/
    (public)/
      page.tsx                    — лендинг / галерея
      collection/[slug]/page.tsx  — просмотр коллекции
      share/[token]/page.tsx      — доступ по ссылке
    admin/
      login/page.tsx              — страница входа
      dashboard/page.tsx          — дашборд
      collections/
        new/page.tsx              — создание коллекции
        [id]/page.tsx             — редактирование
      clients/page.tsx            — управление клиентами
    api/
      auth/...
      admin/...
      collections/...
      share/...
    sitemap.ts                    — SEO sitemap
    robots.ts                     — SEO robots
    layout.tsx                    — root layout
    globals.css                   — глобальные стили
  components/
    Viewer360.tsx                 — 360° панорама viewer
    BeforeAfterSlider.tsx         — слайдер до/после
    RoomNavigator.tsx             — навигация по комнатам
    CollectionCard.tsx            — карточка коллекции
    AdminLayout.tsx               — layout админки
    FuturisticUI/...              — UI компоненты
  lib/
    prisma.ts                     — Prisma client
    auth.ts                       — утилиты авторизации
    utils.ts                      — общие утилиты
  middleware.ts                   — защита админ-роутов
prisma/
  schema.prisma                   — схема БД
  dev.db                          — SQLite файл
public/
  uploads/                        — загруженные файлы
```

### 9. План реализации

1. Инициализация Next.js + TypeScript + TailwindCSS
2. Настройка Prisma + SQLite
3. Реализация авторизации админа
4. Админ-панель: CRUD коллекций, комнат, загрузка файлов
5. 360° Viewer с переходами
6. Before/After слайдер
7. Клиентский интерфейс + доступ по ссылкам
8. SEO: metadata, sitemap, robots, JSON-LD
9. Футуристичный дизайн и анимации
10. Тестирование и деплой
