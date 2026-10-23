# Digital Business Card

API цифровой визитки на NestJS и GraphQL. Предоставляет профиль, навыки, опыт и проекты; данные хранятся в PostgreSQL.

- [Публичный GraphQL API и Apollo Sandbox](https://digital-business-card-h6di.onrender.com/graphql)
- [Проверка готовности сервиса](https://digital-business-card-h6di.onrender.com/health)
- [GitHub Actions](https://github.com/cryptoangelito/digital-business-card/actions)

## Технологии

Node.js 22, TypeScript 5, NestJS 11, Apollo Server 5, GraphQL 16, Prisma 6, PostgreSQL 16, Docker Compose, Jest. Версии зависимостей зафиксированы в `package-lock.json`; установка выполняется через `npm ci`.

## Запуск через Docker

Требуются Docker и Docker Compose. Устанавливать Node.js и PostgreSQL на хост не нужно.

```bash
docker compose up --build -d --wait
```

Apollo Sandbox доступен по адресу http://localhost:3000/graphql, проверка готовности — http://localhost:3000/health.

```bash
docker compose logs -f api                  # логи приложения
docker compose exec api node scripts/smoke.mjs  # проверка API
docker compose down                         # остановка с сохранением данных
```

Если порт занят, задайте переменную `API_PORT`, например в PowerShell: `$env:API_PORT="3001"`.

PostgreSQL доступна внутри сети Compose без публикации порта на хост. Параметры подключения из Compose предназначены для локальной разработки. Данные сохраняются в именованном volume. Команда `docker compose down -v` удаляет базу.

## Пример GraphQL-запроса

```graphql
query {
  profile {
    name
    description
    skills { name }
    experience { company position }
    projects { name }
  }
}
```

Расширенный пример находится в [`graphql/example.graphql`](graphql/example.graphql). API также возвращает категории навыков, периоды и достижения опыта, описания и ссылки проектов. Необязательные ссылки имеют значение `null`, пустые коллекции — `[]`. Если профиль отсутствует, запрос возвращает `profile: null`.

API доступен только для чтения. Apollo Sandbox и introspection включены для работы с публичной схемой.

## Структура проекта

```text
src/
  main.ts                       запуск HTTP-сервера и обработка сигналов
  app.module.ts                 композиция модулей и настройка GraphQL
  health.controller.ts          проверка соединения с PostgreSQL
  database/                     Prisma provider и lifecycle соединения
  profile/
    profile.module.ts           модуль профиля
    profile.resolver.ts         GraphQL-резолвер
    profile.service.ts          получение профиля и связанных данных
    selection.ts                определение запрошенных связей по GraphQL AST
    models/                     GraphQL-модели
    *.spec.ts                   unit-тесты
    *.e2e-spec.ts               интеграционные тесты GraphQL и PostgreSQL
prisma/
  schema.prisma                 модель базы данных
  migrations/                   SQL-миграции
  profile-data.json             данные профиля
  seed.js                       повторяемая инициализация данных
scripts/smoke.mjs               проверка работающего API
.github/workflows/ci.yml        непрерывная интеграция
Dockerfile                     сборка, тестовый и production-образы
docker-compose.yml             локальный запуск приложения и PostgreSQL
docker-compose.test.yml        отдельная среда тестирования
render.yaml                    инфраструктура Render
```

## Архитектура

`ProfileModule` объединяет функциональность визитки. Резолвер обрабатывает GraphQL-запрос и передаёт выбор связей сервису. `ProfileService` формирует типизированный Prisma-запрос. `DatabaseModule` предоставляет единственный экземпляр Prisma и управляет его подключением и отключением через lifecycle hooks NestJS.

GraphQL-модели отделяют внешний контракт от схемы хранения. Схема GraphQL создаётся из TypeScript-декораторов по подходу code-first. Единственный публичный профиль определяется по стабильному `slug=main`; его содержимое управляется файлом `prisma/profile-data.json`.

### Оптимизация запросов

`requestedRelations` анализирует GraphQL AST, учитывая aliases, inline и named fragments, директивы `@skip` и `@include`, а также переменные. В Prisma `include` попадают только запрошенные связи.

Для запроса простых полей выполняется один SQL-запрос. Для профиля со всеми коллекциями — не более четырёх: профиль и по одному запросу на каждую связь. Количество запросов не растёт с числом элементов коллекций. Это проверяется интеграционным тестом через события SQL Prisma. Отдельные запросы из резолвера для каждого элемента не выполняются, что предотвращает N+1.

Для одного корневого профиля DataLoader не требуется. При расширении API до списка профилей стратегию загрузки следует пересмотреть. Scalar-поля выбранных таблиц загружаются полностью.

### База данных и инициализация

`Profile` связан отношениями один-ко-многим с `Skill`, `Experience` и `Project`. PostgreSQL обеспечивает внешние ключи, каскадное удаление, уникальность `slug` и имени навыка внутри профиля. Индексы поддерживают выборку и сортировку связей. URL проекта необязателен.

После успешного healthcheck PostgreSQL контейнер приложения последовательно выполняет:

1. `prisma migrate deploy` — применение миграций;
2. `prisma db seed` — создание или обновление данных;
3. `exec node dist/main.js` — запуск приложения.

Seed использует атомарный nested `upsert`. Повторный запуск синхронизирует профиль с `profile-data.json` без дублей. Коллекции заменяются целиком: их ID могут измениться, а ручные правки в БД будут перезаписаны. Ошибка миграции или seed прерывает запуск.

Конфигурация рассчитана на одну реплику API. При масштабировании миграции и seed необходимо вынести в отдельную release-задачу.

## Тестирование

Полная проверка в Docker с отдельной PostgreSQL:

```bash
docker compose -p card-tests -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests
docker compose -p card-tests -f docker-compose.test.yml down -v
```

Выполняются миграции, typecheck, unit-тесты, интеграционные тесты и production build. GitHub Actions запускает эти проверки при push и pull request.

Отдельные команды при установленном Node.js:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run test:smoke
npm audit --omit=dev
```

Интеграционные тесты требуют отдельную мигрированную БД в `DATABASE_URL` и `ALLOW_TEST_DATABASE=true`. Они изменяют данные, поэтому рабочую БД использовать нельзя. Для smoke-теста другого сервера задайте `GRAPHQL_URL`.

Тесты покрывают повторный seed, вложенные GraphQL-запросы, aliases и fragments, директивы, отсутствие профиля, страницу Apollo, число SQL-запросов и ограничение уникальности навыков.

## Локальная разработка

Для запуска вне Docker нужны Node.js 22 и доступная PostgreSQL. Скопируйте `.env.example` в `.env` и укажите строку подключения к своей базе.

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run start:dev
```

Основной Compose не публикует порт PostgreSQL на хост. Для запуска Node.js вне контейнера используйте отдельную локальную БД или конфигурацию с публикацией порта только на `127.0.0.1`.

`start:dev` загружает `.env` через Node.js `--env-file`; Prisma CLI читает его автоматически. Новая миграция создаётся командой `npm run db:migrate -- --name <имя>`. В production применяется только `migrate deploy`.

## Развёртывание

Приложение размещено на Render с отдельной PostgreSQL 16 и HTTPS. Для воспроизведения инфраструктуры используется [`render.yaml`](render.yaml): Docker web service, PostgreSQL, переменная подключения и healthcheck `/health`.

1. Подключите репозиторий в Render и создайте Blueprint из `render.yaml`.
2. Проверьте тарифы и ограничения ресурсов перед созданием.
3. `DATABASE_URL` передаётся из PostgreSQL, `NODE_ENV` устанавливается в `production`, `PORT` задаётся платформой.
4. Миграции и seed выполняются автоматически перед запуском сервера.
5. Проверьте `/health` и запрос `profile` через `/graphql`.

Production-образ работает от пользователя `node` и не содержит devDependencies. Сервер слушает `0.0.0.0`; сигналы завершения передаются процессу Node.js. Секреты хранятся в переменных окружения платформы. `.env`, логи и артефакты сборки исключены из Git; `.env*` также исключены из Docker build context.

Текущий экземпляр использует бесплатный тариф: возможна задержка первого запроса после простоя. Срок действия бесплатной БД — **23 ноября 2026, 01:50 по Москве**; до этой даты необходим перенос данных или изменение тарифа.
