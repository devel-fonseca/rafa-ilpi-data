# Nest 11 Spike Plan

Date: 2026-03-20

## Goal

Prepare a controlled migration path from Nest 10 to Nest 11 in the backend, because the remaining production dependency vulnerabilities are now concentrated in the Nest platform stack and packages directly tied to it.

This spike is not the migration PR itself. It is the technical assessment that should precede the real upgrade branch.

## Current State

Backend production audit after residual cleanup:

- `50` vulnerabilities total
- `45 high`
- `5 moderate`
- `0 critical`

Most remaining direct findings point to major upgrades:

- `@nestjs/bull`
- `@nestjs/common`
- `@nestjs/config`
- `@nestjs/core`
- `@nestjs/platform-express`
- `@nestjs/platform-socket.io`
- `@nestjs/swagger`
- `@nestjs/websockets`
- `multer`

Residual non-Nest findings still present:

- `mjml`
- `mjml-core`
- `html-minifier`
- `fast-xml-parser` through `@aws-sdk/xml-builder`

## Current Dependency Matrix

Current backend versions:

- `@nestjs/bull`: `10.0.1`
- `@nestjs/common`: `10.4.22`
- `@nestjs/config`: `3.1.1`
- `@nestjs/core`: `10.4.22`
- `@nestjs/event-emitter`: `3.0.1`
- `@nestjs/jwt`: `10.2.0`
- `@nestjs/passport`: `10.0.3`
- `@nestjs/platform-express`: `10.4.22`
- `@nestjs/platform-socket.io`: `10.4.22`
- `@nestjs/schedule`: `6.1.1`
- `@nestjs/swagger`: `7.1.17`
- `@nestjs/testing`: `10.4.22`
- `@nestjs/throttler`: `5.1.1`
- `@nestjs/websockets`: `10.4.22`
- `multer`: `1.4.5-lts.1`

Latest available major line:

- `@nestjs/bull`: `11.0.4`
- `@nestjs/common`: `11.1.17`
- `@nestjs/config`: `4.0.3`
- `@nestjs/core`: `11.1.17`
- `@nestjs/jwt`: `11.0.2`
- `@nestjs/passport`: `11.0.5`
- `@nestjs/platform-express`: `11.1.17`
- `@nestjs/platform-socket.io`: `11.1.17`
- `@nestjs/swagger`: `11.2.6`
- `@nestjs/testing`: `11.1.17`
- `@nestjs/throttler`: `6.5.0`
- `@nestjs/websockets`: `11.1.17`
- `multer`: `2.1.1`

## Why This Requires a Spike

This is not a simple package bump:

1. `multer` does not clear cleanly inside the current Nest 10 line.
2. The remaining direct audit findings are structurally tied to Nest core and platform packages.
3. The backend has broad usage of:
   - Swagger decorators and document generation
   - WebSocket gateway setup
   - File upload interceptors and file pipes
   - cron jobs
   - Bull queue bootstrap
   - config bootstrap

That means the real migration must be treated as a platform upgrade, not a vulnerability patch PR.

## High-Risk Runtime Areas

### 1. Upload chain

Sensitive files:

- [app.module.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/app.module.ts)
- [files.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/files/files.controller.ts)
- [institutional-profile.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/institutional-profile/institutional-profile.controller.ts)
- [institutional-documents.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/institutional-profile/institutional-documents.controller.ts)
- [resident-documents.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/resident-documents/resident-documents.controller.ts)
- [resident-contracts.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/resident-contracts/resident-contracts.controller.ts)
- [resident-belongings.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/resident-belongings/resident-belongings.controller.ts)
- [belonging-terms.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/resident-belongings/belonging-terms.controller.ts)
- [clinical-notes.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/clinical-notes/clinical-notes.controller.ts)
- [prescriptions.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/prescriptions/prescriptions.controller.ts)
- [pops.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/pops/pops.controller.ts)
- [vaccinations.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/vaccinations/vaccinations.controller.ts)
- [user-profiles.controller.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/user-profiles/user-profiles.controller.ts)

Risk:

- `FileInterceptor`
- `ParseFilePipe`
- `ParseFilePipeBuilder`
- file validation and request parsing semantics can change subtly between platform versions

### 2. Swagger and DTO metadata

Sensitive files:

- [main.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/main.ts)
- controllers and DTOs using `@nestjs/swagger` extensively across the application

Risk:

- decorator metadata generation
- document bootstrap
- schema inference differences
- compile-time issues with DTO helpers and metadata reflection

### 3. WebSockets and realtime events

Sensitive files:

- [events.gateway.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/events/events.gateway.ts)
- [events.module.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/events/events.module.ts)

Risk:

- gateway lifecycle hooks
- Socket.IO adapter compatibility
- auth middleware behavior during handshake
- transport compatibility with the current frontend client

### 4. Queue/bootstrap infrastructure

Sensitive files:

- [app.module.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/app.module.ts)

Risk:

- `BullModule.forRootAsync`
- queue registration and worker startup
- dependency injection behavior in module bootstrap

### 5. Configuration and scheduling

Sensitive files:

- [app.module.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/app.module.ts)
- modules and services using `ConfigModule`, `ConfigService` and `@Cron`

Representative files:

- [notifications.cron.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/notifications/notifications.cron.ts)
- [overdue-reports.job.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/superadmin/jobs/overdue-reports.job.ts)
- [invoice-generation.job.ts](/home/emanuel/Documentos/GitHub/rafa-ilpi-data/apps/backend/src/payments/jobs/invoice-generation.job.ts)

Risk:

- schedule bootstrap
- cron registration
- async configuration factories

## Spike Deliverables

The spike branch should produce:

1. Final version matrix for all Nest-adjacent packages
2. List of code changes required to compile on Nest 11
3. List of runtime behaviors that must be smoke-tested
4. Decision on whether `multer` should move together with the Nest 11 PR or in a follow-up branch
5. Decision on whether `@nestjs/swagger` must be upgraded in the same PR or staged separately

## Proposed Execution Order for the Real Migration

1. Create a dedicated branch for the Nest 11 migration
2. Upgrade the core aligned set together:
   - `@nestjs/common`
   - `@nestjs/core`
   - `@nestjs/platform-express`
   - `@nestjs/platform-socket.io`
   - `@nestjs/websockets`
   - `@nestjs/testing`
3. Upgrade adjacent first-party Nest packages:
   - `@nestjs/bull`
   - `@nestjs/config`
   - `@nestjs/jwt`
   - `@nestjs/passport`
   - `@nestjs/schedule`
   - `@nestjs/swagger`
   - `@nestjs/throttler`
4. Rebuild and fix compile-time issues
5. Run smoke tests focused on upload, auth, websocket and Swagger bootstrap
6. Only then evaluate whether there are leftover audit findings worth a second stabilization PR

## Smoke-Test Checklist

### Auth

- login
- refresh token flow
- protected route access
- permission-guarded endpoint access

### Uploads

- institutional logo upload
- institutional document upload
- resident document upload
- resident contract upload
- belonging term upload
- POP upload
- invalid mime-type rejection
- oversized file rejection
- delete uploaded file

### Realtime

- websocket connects successfully
- tenant room join works
- notifications still arrive
- message unread counters still update

### Swagger

- app boots with Swagger enabled
- `/api/docs` renders
- document generation succeeds without metadata crashes

### Scheduling / jobs

- app boots with schedules enabled
- cron services instantiate correctly
- queue bootstrap works with Redis

## Acceptance Criteria for the Spike

The spike is complete only when:

1. the upgrade path is mapped package-by-package
2. the compile blockers are identified
3. the runtime risk areas are enumerated with exact files
4. the migration PR can be scoped into a predictable review surface

## Recommendation

Do not continue spending time trying to squeeze more audit reduction out of Nest 10.

The frontend is already clean.
The backend residual is now concentrated enough that the correct next move is a dedicated Nest 11 migration branch with explicit smoke-test coverage.
