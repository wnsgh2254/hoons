# 미사용 파일 목록

> 아래 파일들은 현재 코드에서 참조되지 않는 것으로 확인되었습니다.
> 삭제하지 않고 목록만 관리합니다. 정리 시 참고용으로 사용하세요.
>
> 최종 확인일: 2026-03-08

---

## 미사용 컴포넌트

| 파일 | 사유 |
|------|------|
| `components/Button.tsx` | `components/ui/Button.tsx`로 대체됨. Hero.tsx만 import하나 Hero 자체도 미사용 |
| `components/Hero.tsx` | 어디서도 import하지 않음 (`app/page.tsx`는 자체 Hero UI 구현) |
| `components/Footer.tsx` | `MainFooter.tsx`로 대체됨, 어디서도 import 없음 |
| `components/Navbar.tsx` | `MainNav.tsx`로 대체됨, 어디서도 import 없음 |
| `components/Container.tsx` | 어디서도 import 없음 |
| `components/GalleryGrid.tsx` | 어디서도 import 없음 |
| `components/RevenueTrendsChart.tsx` | 어디서도 import 없음 (~400줄) |

---

## 미사용 루트 파일

| 파일 | 사유 |
|------|------|
| `proxy.ts` | `middleware.ts`가 없고 어디서도 import 안 됨. 미들웨어로 쓰려면 `middleware.ts`로 이름 변경 필요 |
| `debug-sunday-issue.js` | 일회성 디버그 스크립트 (129줄) |

---

## 미사용 에셋 — 이미지

| 파일 | 크기 | 사유 |
|------|------|------|
| `public/images/hair7.jpg` | 536KB | 코드에서 참조 없음 (hair1-6만 사용) |
| `public/images/hair8.jpg` | 446KB | 코드에서 참조 없음 |
| `public/images/hair9.jpg` | 543KB | 코드에서 참조 없음 |
| `public/images/heyoom_logo.png` | 123B | 더미 파일, 참조 없음 |
| `public/images/logo-fill1.svg` | 138KB | `logo-fill.svg`의 중복본, 참조 없음 |
| `public/images/hero-bg.jpg` | 695KB | `Hero.tsx`에서만 참조하나 Hero 자체가 미사용 |
| `public/images/icon.svg` | 1KB | 참조 없음 |
| `public/images/line.svg` | 280B | 참조 없음 |

---

## 미사용 에셋 — Next.js 기본 파일

| 파일 | 사유 |
|------|------|
| `public/file.svg` | `create-next-app` 기본 에셋, 미사용 |
| `public/globe.svg` | `create-next-app` 기본 에셋, 미사용 |
| `public/next.svg` | `create-next-app` 기본 에셋, 미사용 |
| `public/vercel.svg` | `create-next-app` 기본 에셋, 미사용 |
| `public/window.svg` | `create-next-app` 기본 에셋, 미사용 |

---

## 아카이브 디렉토리

| 디렉토리 | 사유 |
|----------|------|
| `app/haeyoom---conceptual-hair-salon/` | 별도 Vite 프로젝트가 Next.js `app/` 디렉토리 안에 존재. 코드에서 참조 없음. Next.js가 라우트로 인식할 수 있어 `app/` 바깥으로 이동 권장 |

---

## 리팩토링 후 추가된 미사용 파일

| 파일 | 사유 |
|------|------|
| `components/admin/appointments/ConfirmationAlertModal.tsx` | `AlertModal` 직접 사용으로 대체됨 |
| `components/admin/appointments/ErrorAlertModal.tsx` | `AlertModal` 직접 사용으로 대체됨 |
