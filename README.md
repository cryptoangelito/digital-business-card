# Digital Business Card API

Backend-визитка на **TypeScript + Node.js + NestJS + Prisma + PostgreSQL + GraphQL (Apollo Sandbox) + Docker**. Исходники предназначены для Git-репозитория.

> **Внимание: данные в `prisma/seed.js` демонстрационные.** Здесь намеренно нет выдуманных компаний, стажа или несуществующих репозиториев. Перед отправкой тестового замените имя, описание, достижения и `REPLACE_WITH...` URL на собственные проверяемые данные.

## Быстрый запуск — с чистой машины

Нужны **Docker Desktop** и Docker Compose. Node.js и PostgreSQL локально устанавливать не требуется.

```bash
docker compose up --build -d
```

После первого запуска:

- GraphQL API и **Apollo Sandbox**: http://localhost:3000/graphql
- Проверка запроса: `node scripts/smoke.mjs` (для скрипта нужен Node.js 22+).
- Логи: `docker compose logs -f api`
- Остановка: `docker compose down` (данные остаются в именованном volume).
- Полный сброс данных: `docker compose down -v` (удалит базу!).

Контейнер `db` стартует с healthcheck. `api` **ждёт готовности PostgreSQL**, затем выполняет `prisma migrate deploy`, **seed** и запускает HTTP-сервер. Таким образом чистая база не требует ручных действий. **Не используйте `prisma db push` в production**: структура управляется миграциями, лежащими в Git.

## Пример запроса в Apollo Sandbox

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

Расширенная версия: `graphql/example.graphql`. API read-only: запрос `profile`, а мутации не реализованы, поскольку визитка публичная и должна только публиковать профиль.

## Структура

```text
src/
  app.module.ts                # Nest application + Apollo Sandbox
  main.ts                      # HTTP bootstrap
  database/
    database.module.ts         # Prisma DI provider
    prisma.service.ts          # Prisma lifecycle
  profile/
    profile.module.ts
    profile.resolver.ts        # GraphQL transport boundary
    profile.service.ts         # Data access + relation selection
    selection.ts               # GraphQL AST → requested relations
    selection.spec.ts          # unit tests
    models/                    # GraphQL response types (code first)
prisma/
  schema.prisma                # normalized relational schema
  migrations/                  # committed SQL migration
  seed.js                      # idempotent initial data
scripts/smoke.mjs              # live HTTP test
Dockerfile
docker-compose.yml
```

## Почему такая архитектура

1. **NestJS feature module `ProfileModule`** отвечает за визитку. Отдельный `DatabaseModule` содержит управление подключением. Резолвер **только** принимает GraphQL-запрос, сервис отвечает за получение данных; классы `models/` определяют внешний контракт и не привязаны к базе.
2. **GraphQL code-first:** TypeScript-декораторы `@ObjectType`/`@Field` генерируют схему без дублирования SDL и классов. Apollo Sandbox можно открыть прямо в браузере.
3. **Prisma + PostgreSQL:** `Profile` связан one-to-many с `Skill`, `Experience`, `Project`. Есть FK, каскадное удаление, индексы по FK и индекс сортировки. Prisma предоставляет безопасный типизированный доступ к данным. Миграции явно версионируются.
4. **Вложенные выборки без N+1:** `selection.ts` изучает AST GraphQL и распознаёт нужные связи, включая aliases, inline- и named fragments. `ProfileService` составляет Prisma `include` только для **запрошенных** связей. При `{ profile { name } }` связанные таблицы не считываются. При выборке нескольких связей Prisma извлекает данные пакетно; на каждую запись не запускается отдельный резолвер. Это соразмерно одному публичному профилю. Если API расширить до `profiles[]`, потребуется проверить SQL и при необходимости добавить DataLoader или `relationLoadStrategy`.
5. **Инициализация как часть деплоя:** SQL-миграция применяется до запуска сервера. `seed.js` использует `upsert` и обновляет дочерние наборы в одной атомарной операции Prisma — повторный запуск не создаёт дублей. В данном *демо* seed намеренно обновляет данные при каждом запуске; для публичного редактируемого сервиса лучше выделить одноразовую административную команду.
6. **Нет преждевременной сложности:** сервис read-only, нет фиктивной авторизации, Redis, CQRS и микросервисов. Функции разделены настолько, насколько этого требует задача.

**Компромисс:** динамический `include` экономит загрузку ненужных *отношений*, но не проецирует индивидуальные scalar-поля внутри каждой таблицы. Для одной небольшой визитки такой уровень оптимизации уместен. Точное SQL-поведение Prisma зависит от конфигурации и версии.

## Команды для разработки без Docker для приложения

Для локального backend потребуется Node.js 22+, npm и доступная PostgreSQL (можно запустить только `docker compose up -d db`).

```bash
cp .env.example .env        # в Windows PowerShell: Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run start:dev
npm test
```

`.env` не коммитится. Для первого изменения Prisma-схемы локально используйте `npm run db:migrate -- --name <имя>`, проверьте SQL и сохраните миграцию в Git. В Docker используется только `migrate deploy`.

## Как заменить данные перед публикацией

Откройте **`prisma/seed.js`** и поменяйте `profileData`, `skills`, `experience`, `projects`.

- Укажите **настоящий** GitHub/LinkedIn; `REPLACE_WITH...` должен исчезнуть из опубликованного ответа.
- В опыте оставляйте только подтверждаемые компании и достижения. Личные проекты можно честно обозначить как *pet-проекты*.
- Для `projects[].url` нужны **доступные публичные URL** GitHub или работающих демо.
- После изменений перезапустите Docker: `docker compose up --build -d` (или `docker compose restart api`, если изменялся только seed и файл смонтирован/образ пересобран; обычно нужен `--build`).

## Git и публикация

```bash
git init
git add .
git commit -m "feat: build NestJS GraphQL portfolio API"
git branch -M main
git remote add origin https://github.com/ВАШ_НИК/digital-business-card.git
git push -u origin main
```

Репозиторий создайте в GitHub заранее. **Ссылка на Git и публичное API не создаются автоматически при распаковке ZIP.** Для Render/Railway нужен hosted PostgreSQL и `DATABASE_URL`, запуск образа из Dockerfile. Убедитесь, что хост поддерживает **persistent PostgreSQL**, доступен порт `PORT` и публичный HTTPS URL `/graphql`. На бесплатном тарифе деплой может засыпать; проверьте ссылку в браузере без авторизации. Пароли из демонстрационного `docker-compose.yml` не подходят для публичного сервера.

## Проверка перед сдачей

1. `docker compose down -v` → `docker compose up --build -d`.
2. Открыть `/graphql` и выполнить запрос из задания.
3. Запустить `npm test` и `npm run test:smoke` (последняя команда требует доступный API).
4. Перезапустить API: `docker compose restart api`, проверить отсутствие дублей.
5. Убедиться, что публичная ссылка и GitHub URL открываются у другого человека.

## Что могут попросить изменить на интервью

- Добавить новый атрибут `Project` (например, `stack`): изменить `schema.prisma`, создать миграцию, обновить GraphQL model и seed.
- Добавить фильтрацию skills по категории или сортировку проектов.
- Объяснить `requestedRelations`, почему не возникают отдельные запросы из `@ResolveField` на каждый объект.
- Показать разницу между `migrate dev` и `migrate deploy`, и зачем idempotent seed.

## Примечание по зависимостям и проверке

Комбинация NestJS 11 + GraphQL/Apollo integration 13 + Apollo Server 5 и Prisma 6 выбрана ради совместимости CommonJS-проекта. Prisma 6 получает только security patches до 19 ноября 2026 года, поэтому для долгоживущего сервиса потребуется переход на Prisma 7 с adapter/config и тестами. **В данной среде не было возможности скачать npm-пакеты и запустить Docker**; перед отправкой работодателю обязательно выполните реальный чистый запуск, smoke-тест и зафиксируйте `package-lock.json` после `npm install` (тогда Dockerfile стоит перевести на `npm ci`).
