# rentcar00-booking-system rename scope checklist

## 기준
- 목표 프로젝트명: `rentcar00-booking-system`
- IMS sync read model 테이블명: `ims_sync_reservations`

## 1. 로컬 저장소
- [x] 프로젝트 폴더명 변경
- [x] `package.json` name 변경
- [x] `package-lock.json` name 변경
- [x] `README.md` 현재 기준 문서 경로 갱신
- [x] 구 `projects/premove-clone` 잔여 로그 폴더 정리

## 2. 코드 / 스크립트
- [x] IMS sync upsert 대상 테이블명 변경
- [x] blocking 조회 대상 테이블명 변경
- [x] seed 대상 테이블명 변경
- [x] User-Agent 프로젝트명 변경
- [x] launchd 실행 경로 변경

## 3. DB / Supabase
- [x] `reservations -> ims_sync_reservations` rename migration 추가
- [x] 기존 Supabase 원격 DB에 migration 적용
- [ ] Supabase display name 변경 여부 확인 및 반영
- [ ] Supabase project ref 변경 불가 여부 최종 확인

## 4. Vercel
- [x] Vercel 원격 프로젝트명 `premove-clone -> rentcar00-booking-system` 변경
- [x] `.vercel/project.json` local metadata 재정렬
- [ ] rename 후 배포 연결 재검증

## 5. 문서
- [x] active present 문서 프로젝트명 기준 반영
- [x] active reference 문서 현재 프로젝트명 기준 반영
- [x] `docs/README.md` 현재 기준 재점검
- [ ] 과거 문서 rewrite 여부 별도 결정

## 6. 검증
- [x] 현재 코드 기준 `premove-clone` 잔여 참조 재검색
- [x] 현재 코드 기준 `reservations` 테이블 참조 재검색
- [x] migration + seed + sync 경로 논리 검토

## 7. 범위 고정 메모
- 현재 `premove-clone` 잔여 문자열은 active 기준에서는 `docs/present/RENAME_SCOPE_CHECKLIST.md` 2건뿐이었고, 나머지는 `docs/past` / `docs/archive` 기록 문서다.
- 현재 코드 기준 실테이블 잔여 참조는 `.vercel/project.json`, `supabase/migrations/20260414195200_create_ims_sync_tables.sql`, `supabase/migrations/20260414213000_fix_reservations_upsert_unique.sql`, `supabase/migrations/20260421195800_rename_reservations_to_ims_sync_reservations.sql` 였다.
- `src/*`, `server/*`, `scripts/*` 에서 남은 `reservations` 문자열은 UI route, 변수명, IMS API path, 과거 설명 문구이며 물리 테이블 참조는 아니다.
- `supabase db push --linked --dry-run` 재확인 결과 현재 원격 DB는 up to date 상태다.
- Supabase CLI 2.75.0 기준 `projects update` 계열 명령은 없어서, display name 변경은 콘솔 또는 별도 Management API 경로 확인이 필요하다.
- `docs/README.md` 는 주 current 1개와 작업 current 1개를 허용하도록 재정렬했다. 현재 rename phase 에서는 `RENTCAR00_DB_EXECUTION_CURRENT.md` 와 `RENAME_EXECUTION_CURRENT.md` 를 병행 기준으로 둔다.
- `supabase/README.md` 의 migration 경로는 실제 파일명 `20260414000000_create_cars.sql` 기준으로 바로잡고, rename migration 확인 순서를 반영했다.
