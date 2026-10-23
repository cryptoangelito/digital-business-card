# Digital Business Card

Публичное API цифровой визитки Бахвалова Михаила Алексеевича — начинающего backend-разработчика. Возвращает профиль, навыки, опыт и проекты одним GraphQL-запросом. Это учебное задание с воспроизводимым запуском и проверками на настоящей PostgreSQL.

Исходный код: https://github.com/cryptoangelito/digital-business-card

Рабочий HTTPS API и Apollo Sandbox: https://digital-business-card-h6di.onrender.com/graphql

Развёрнуто на Render (free web service + PostgreSQL 16). Бесплатная БД имеет срок действия до **23 ноября 2026, 01:50 по Москве**. Перед этой датой требуется сохранить данные или согласовать переход на другой тариф. Бесплатный web service может засыпать; первый запрос после простоя требует времени на запуск.

## Быстрый запуск

Требуются Docker Engine / Docker Desktop и Docker Compose. Локальные Node.js и PostgreSQL не нужны.

```bash
docker compose up --build -d --wait
```

- Apollo Sandbox и API: http://localhost:3000/graphql
- Готовность приложения и соединения с БД: http://localhost:3000/health
- Логи: `docker compose logs -f api`
- Остановка с сохранением данных: `docker compose down`
- Удаление данных: `docker compose down -v` — команда необратимо удаляет БД.

Если порт занят, задайте `API_PORT=3001` перед запуском (PowerShell: `$env:API_PORT="3001"`). PostgreSQL доступна только внутри сети Compose; порт БД на хост не публикуется. Учётные данные `portfolio` в Compose и `.env.example` — открытые параметры исключительно локальной среды, не production-секреты.

## GraphQL

Откройте `/graphql` в браузере. Apollo Sandbox включён и в production: это намеренное решение для демонстрации публичного read-only API. Introspection доступна. Для загрузки интерфейса Sandbox требуется доступ браузера к ресурсам Apollo.

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

Расширенный пример — `graphql/example.graphql`. Также доступны `githubUrl`, `linkedinUrl`, `websiteUrl`, категории навыков, периоды и достижения опыта, описания и URL проектов. Неизвестные ссылки возвращаются как `null`, отсутствие подтверждённого опыта — как `[]`. Если профиль не создан, `profile` возвращает `null`.

Пример с фрагментами, alias и директивой:

```graphql
query Card($withProjects: Boolean!) {
  profile {
    name
    technologies: skills { name category }
    ...Portfolio
  }
}
fragment Portfolio on Profile {
  projects @include(if: $withProjects) { name description url }
}
```

Переменные: `{ "withProjects": true }`.

HTTP-запрос:

```bash
curl http://localhost:3000/graphql -H "Content-Type: application/json" --data '{"query":"{ profile { name skills { name } projects { name } } }"}'
```

## Технологии и структура

Node.js 22, TypeScript 5, NestJS 11, Apollo Server 5, GraphQL 16, Prisma 6, PostgreSQL 16, Docker Compose, Jest. Точные версии и целостность npm-пакетов зафиксированы в `package-lock.json`; сборка использует `npm ci`.

```text
src/
  main.ts                       запуск, PORT, завершение по сигналам
  app.module.ts                 композиция модулей, GraphQL и Sandbox
  health.controller.ts          readiness с проверкой PostgreSQL
  database/                     Prisma provider и lifecycle соединения
  profile/
    profile.module.ts           feature module
    profile.resolver.ts         GraphQL → сервис
    profile.service.ts          выборка профиля и связанных коллекций
    selection.ts                выбор связей по GraphQL AST
    models/                     внешний GraphQL-контракт
    *.spec.ts                   unit-тесты
    *.e2e-spec.ts               HTTP GraphQL + настоящая PostgreSQL
prisma/
  schema.prisma                 реляционная модель
  migrations/                   версионированный SQL
  profile-data.json             публичные данные профиля
  seed.js                       атомарная повторяемая инициализация
scripts/smoke.mjs                проверка запущенного API
.github/workflows/ci.yml         проверки в GitHub Actions
Dockerfile                      стадии build, test, production
docker-compose.test.yml         изолированная тестовая БД
render.yaml                     подготовленный Blueprint для Render
```

## Архитектура

`ProfileModule` объединяет функциональность визитки. Резолвер принимает GraphQL-запрос и определяет необходимые связи; сервис формирует Prisma-запрос. `DatabaseModule` экспортирует единственный DI provider Prisma и управляет подключением/отключением. GraphQL-модели отделяют внешний контракт от схемы хранения. Code-first схема строится из TypeScript-декораторов в памяти.

API содержит один публичный профиль со стабильным `slug=main`. Мутаций нет: содержимое управляется версионированным файлом данных. Поэтому публичная авторизация и административный интерфейс не требуются. Добавление изменяемых пользователями данных потребует отдельного защищённого сценария и изменения политики seed.

### Загрузка связей без N+1

`requestedRelations` обходит поля запроса, inline и named fragments. Учитывает aliases, `@skip`, `@include` и переменные. Сервис добавляет в Prisma `include` только выбранные связи. Для запроса имени выполняется один SQL-запрос; для всех коллекций — не более четырёх: профиль и по одному на каждую связь. Количество запросов не растёт с количеством строк в коллекции. Это проверяет интеграционный тест с событиями SQL Prisma.

Отдельного `@ResolveField` с запросом на каждый элемент нет. DataLoader для одного корневого профиля не нужен. При добавлении списка профилей необходимо заново измерить SQL-поведение и рассмотреть батчинг или стратегию join. Scalar-поля внутри выбранной таблицы загружаются полностью: для небольшой визитки это приемлемый компромисс.

### PostgreSQL и seed

`Profile` связан отношениями один-ко-многим с `Skill`, `Experience`, `Project`. В SQL есть внешние ключи, каскадное удаление, уникальность `slug`, уникальность навыка в профиле и индексы для выборки/сортировки связей. Вторая миграция делает URL проекта необязательным: отсутствие публичной ссылки не заменяется вымышленным адресом.

Compose ждёт healthcheck PostgreSQL. Контейнер приложения выполняет последовательно:

1. `prisma migrate deploy` — применяет SQL-миграции;
2. `prisma db seed` — создаёт или обновляет профиль;
3. `exec node dist/main.js` — запускает NestJS с прямой доставкой сигналов.

Seed выполняет атомарный nested `upsert`, заменяя коллекции из `profile-data.json`. Повторный запуск не создаёт дублей. ID дочерних записей могут измениться; они не являются постоянными внешними идентификаторами. Seed намеренно синхронизирует данные при каждом старте; ручные изменения этих коллекций в БД будут перезаписаны. Ошибка миграции/seed прерывает запуск. Именованный volume сохраняет PostgreSQL между перезапусками. `restart: unless-stopped` восстанавливает контейнеры; соединения Prisma управляются lifecycle hooks NestJS.

Для нескольких реплик миграции и seed следует вынести в единственную release-задачу перед масштабированием. Текущая конфигурация рассчитана на одну реплику API.

## Достоверность профиля

Имя предоставлено владельцем. GitHub `cryptoangelito` подтверждён авторизованным GitHub API. В профиле указаны:

- Digital Business Card — исходники этого задания;
- MONSTERA — публичный репозиторий владельца, README и дерево C#-исходников подтверждают ранний Unity-прототип. Backend и сетевые дуэли там пока не реализованы.

EnzoVPN, Silk Road и Pulse Mail не добавлены: их исходники/ссылки и вклад владельца пока не подтверждены. Коммерческий опыт, компании, сроки и достижения не выдуманы. Навыки обозначены как практика в текущем проекте, без заявления о стаже или экспертном уровне.

## Проверки

Полный набор в изолированной PostgreSQL, без локального Node.js:

```bash
docker compose -p card-tests -fdocker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests
docker compose -p card-tests -fdocker-compose.test.yml down -v
```

Команда выполняет миграции, typecheck, unit-тесты, интеграционные тесты и production build. Тестовая БД отделена от рабочей. E2E требует `ALLOW_TEST_DATABASE=true`; используйте только отдельную тестовую БД.

Проверка уже запущенного production-контейнера:

```bash
docker compose exec api node scripts/smoke.mjs
docker compose restart
docker compose up -d --wait
docker compose exec api node scripts/smoke.mjs
docker compose logs --tail 100 api
```

Отдельные команды при наличии Node.js 22 и доступной PostgreSQL:

```bash
npm ci
npm run db:generate
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:smoke
npm audit --omit=dev
```

`test:e2e` использует `DATABASE_URL` и меняет данные: только тестовая БД. Smoke допускает другой адрес: `GRAPHQL_URL=https://<ваш-домен>/graphql npm run test:smoke`.

Результаты фактической проверки этой поставки записаны в `VERIFICATION.md`. GitHub Actions повторяет проверки через Docker Compose при push и pull request.

## Разработка

Для запуска приложения вне Docker установите Node.js 22 и отдельную PostgreSQL, скопируйте `.env.example` в `.env`, укажите её URL. База из основного Compose не публикует порт: для внешнего Node.js используйте свою локальную БД либо отдельную конфигурацию с привязкой только к `127.0.0.1`.

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run start:dev
```

`start:dev` читает `.env` через Node.js `--env-file`. Для Prisma CLI `.env` подхватывается автоматически. При изменении схемы: `npm run db:migrate -- --name <имя>`, проверка SQL, коммит миграции. В production используется только `migrate deploy`, без `db push`.

## Развёртывание на Render

В репозитории подготовлен `render.yaml`: Docker web service, PostgreSQL, ссылка на `DATABASE_URL` и healthcheck `/health`. Этот экземпляр опубликован через официальный Render CLI; Blueprint прошёл серверную валидацию и предназначен для воспроизведения инфраструктуры. Перед созданием проверьте доступность free-планов, сроки хранения БД, ограничения и актуальные условия в [документации Render](https://render.com/docs/free). Платный план выбирается только с разрешения владельца.

1. Войти в Render и подключить GitHub-репозиторий.
2. Создать Blueprint из `render.yaml`, проверить оба плана и итоговую стоимость до подтверждения.
3. Render передаст PostgreSQL connection string в `DATABASE_URL`; `NODE_ENV=production`. `PORT` выдаёт платформа, NestJS слушает `0.0.0.0`.
4. Dockerfile автоматически выполнит миграции и seed перед запуском. Хранить секреты только в настройках среды Render, не в Git.
5. После успешного healthcheck открыть `https://<выданный-домен>/graphql`, проверить Sandbox и запрос профиля; `/health` должен вернуть `{"status":"ok"}`.
6. Проверить перезапуск сервиса и повторный запрос. Настроить резервные копии и мониторинг согласно выбранному тарифу.

Тот же Dockerfile пригоден для Railway: отдельный PostgreSQL service, переменная `DATABASE_URL` из него, публичный HTTPS-домен и healthcheck `/health`. Самостоятельно PostgreSQL в эфемерном контейнере web service не размещать.

`.env`, логи, `node_modules` и артефакты сборки исключены из Git; `.env*` также исключены из build context Docker. Production-образ работает от пользователя `node` и не содержит devDependencies.

## Поддержка зависимостей

Prisma обновлена до 6.19.3. В `overrides` закреплены исправленные `@graphql-tools/utils` и `deepmerge-ts`, чтобы устранить найденные npm audit уязвимости; совместимость проверяется сборкой и HTTP/БД-тестами. При обновлении NestJS/Prisma пересмотрите необходимость overrides.

Nest Apollo 13 тянет устаревший пакет GraphQL Playground с peer dependency на Apollo 4. npm сообщает предупреждение, но приложение использует Apollo 5 и официальный Sandbox, Playground выключен. Prisma 6 также предупреждает о будущем удалении настройки seed в `package.json` в версии 7. Миграция на новую major-версию — отдельная задача с переходом на новую конфигурацию и повторными проверками.

## Подготовка к демонстрации

Пять практических задач для тренировки:

1. Добавить поле `telegramUrl`: Prisma-миграция, GraphQL-модель, seed и тест ответа.
2. Добавить фильтр навыков по категории и проверить его через переменные GraphQL.
3. Добавить сортировку проектов, объяснить порядок и используемый индекс.
4. Показать число SQL-запросов для scalar-запроса и запроса всех связей, объяснить отсутствие N+1.
5. Воспроизвести чистый запуск на отдельном Compose project, повторить seed и восстановить приложение после перезапуска БД.