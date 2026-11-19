'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { AdminPageLayout, PageHeader } from '@/components/ui';
import { HOONS_LOCATIONS } from '@/lib/hoons-locations';
import {
  type DemoStaff,
  demoStaff,
  setDemoLocationBookable,
  transferDemoStaff,
  useHoonsDemo,
} from '@/lib/hoons-booking-demo';

export default function LocationSettingsPage() {
  const demo = useHoonsDemo();
  const staff = demoStaff(demo);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function applyUpdate(update: () => Promise<void>, successMessage: string) {
    if (pending) return;
    setPending(true);
    setNotice('');
    setError('');
    try {
      await update();
      setNotice(successMessage);
    } catch {
      setError('이 브라우저에 변경 사항을 저장하지 못했습니다. 로컬 저장소 설정을 확인해 주세요.');
    } finally {
      setPending(false);
    }
  }

  function submitTransfer(event: FormEvent<HTMLFormElement>, member: DemoStaff) {
    event.preventDefault();
    const locationId = new FormData(event.currentTarget).get('location');
    const destination = HOONS_LOCATIONS.find(({ id }) => id === locationId);
    if (!destination) return;
    if (destination.id === member.locationId) {
      setNotice(`${member.name} 님은 이미 ${destination.name} 소속입니다.`);
      setError('');
      return;
    }
    void applyUpdate(
      () => transferDemoStaff(member.id, destination.id),
      `${member.name} 님을 ${destination.name}(으)로 이동했습니다.`,
    );
  }

  return (
    <AdminPageLayout maxWidth="max-w-5xl">
      <PageHeader
        title="HOONS 지점 및 직원 이동"
        actions={<Link className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium" href="/booking">데모 예약 열기</Link>}
      />
      <p className="mb-6 rounded-xl border border-[#dacaba] bg-[#f8f0e7] p-4 text-sm leading-relaxed text-[#533a2e]">
        예시 데이터입니다. 변경 사항은 같은 브라우저의 HOONS 예약 화면에 반영됩니다.
      </p>
      {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

      <section className="mb-8" aria-labelledby="admin-locations">
        <h2 id="admin-locations" className="mb-3 text-xl font-semibold">지점 연동</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {HOONS_LOCATIONS.map((location) => {
            const bookable = !demo.closedLocations.includes(location.id);
            const count = staff.filter(({ locationId }) => locationId === location.id).length;
            return (
              <article key={location.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="font-semibold">{location.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{location.address}</p>
                <p className="mt-2 text-sm text-gray-700">소속 직원 {count}명</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={bookable}
                  aria-label={`${location.name} 온라인 예약`}
                  disabled={pending}
                  onClick={() => void applyUpdate(
                    () => setDemoLocationBookable(location.id, !bookable),
                    `${location.name} 온라인 예약을 ${bookable ? '중지했습니다.' : '활성화했습니다.'}`,
                  )}
                  className="mt-4 min-h-11 cursor-pointer rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {bookable ? '온라인 예약 가능' : '온라인 예약 중지'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="admin-transfers">
        <h2 id="admin-transfers" className="mb-3 text-xl font-semibold">직원 이동</h2>
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white px-4">
          {staff.map((member) => (
            <form
              key={`${member.id}:${member.locationId}`}
              onSubmit={(event) => submitTransfer(event, member)}
              className="grid gap-3 py-4 sm:grid-cols-[minmax(7rem,1fr)_minmax(12rem,2fr)_auto] sm:items-end"
            >
              <div className="self-center">
                <p className="font-semibold">{member.name}</p>
                <p className="text-xs text-gray-600">현재 {HOONS_LOCATIONS.find(({ id }) => id === member.locationId)?.name}</p>
              </div>
              <label className="grid gap-1 text-sm">
                이동할 지점
                <select
                  name="location"
                  defaultValue={member.locationId}
                  aria-label={`${member.name} 이동할 지점`}
                  disabled={pending}
                  className="min-h-11 min-w-0 rounded-lg border border-gray-300 bg-white px-3"
                >
                  {HOONS_LOCATIONS.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <button
                type="submit"
                disabled={pending}
                aria-label={`${member.name} 이동 저장`}
                className="min-h-11 cursor-pointer rounded-lg bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                이동 저장
              </button>
            </form>
          ))}
        </div>
      </section>
    </AdminPageLayout>
  );
}
