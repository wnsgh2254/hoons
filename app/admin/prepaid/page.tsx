'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminTopNav from '@/components/AdminTopNav';

export default function PrepaidPassManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [viewingMember, setViewingMember] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;

  // Comment: Load prepaid pass members from API with pagination
  const fetchMembers = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(ITEMS_PER_PAGE));
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/prepaid?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load members');
      }
      setMembers(data.members || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
    } catch (error: any) {
      console.error('Error fetching prepaid members:', error);
      setError(error.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
  }, []);

  // Comment: Reset to page 1 when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchMembers(1);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);


  return (
    <div className="bg-white text-slate-900 font-display antialiased overflow-hidden h-screen flex flex-col">
      <AdminTopNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth bg-white">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-black">선불권 관리</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-linear-to-r from-black to-gray-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  회원 추가
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-start md:justify-between items-start md:items-center">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all"
                  placeholder="Search by name, phone, or email..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-black">Members</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {loading
                    ? 'Loading members...'
                    : members.length === 0
                      ? searchQuery
                        ? 'No members found matching your search.'
                        : 'No prepaid pass members yet.'
                      : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, total)} of ${total} member${total === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-gray-400 text-3xl">
                        card_membership
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {searchQuery ? 'No members found' : 'No prepaid pass members'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {searchQuery
                        ? 'Try adjusting your search terms.'
                        : 'Add your first prepaid pass member to get started.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                          <th className="px-6 py-4">회원</th>
                          <th className="px-6 py-4">연락처</th>
                          <th className="px-6 py-4">포인트</th>
                          <th className="px-6 py-4">만료일</th>
                          <th className="px-6 py-4 text-right">액션</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                        {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-medium text-black">
                              {member.name || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              {member.phone && (
                                <span className="text-gray-600">{member.phone}</span>
                              )}
                              {member.email && (
                                <span className="text-xs text-gray-500">{member.email}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-black">
                              {`$${Number(member.points || 0).toLocaleString()}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">
                              {member.expires_at
                                ? new Date(member.expires_at).toLocaleDateString('ko-KR')
                                : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                                title="수정"
                              >
                                <span className="material-symbols-outlined text-[1.1rem]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setViewingMember(member)}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                                title="상세 보기"
                              >
                                <span className="material-symbols-outlined text-[1.1rem]">
                                  visibility
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newPage = currentPage - 1;
                              if (newPage >= 1) {
                                setCurrentPage(newPage);
                                fetchMembers(newPage);
                              }
                            }}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-black"
                          >
                            이전
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                              // Show first page, last page, current page, and pages around current
                              if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                              ) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => {
                                      setCurrentPage(pageNum);
                                      fetchMembers(pageNum);
                                    }}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                      currentPage === pageNum
                                        ? 'bg-black text-white'
                                        : 'border border-gray-200 hover:bg-gray-50 text-black'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                              ) {
                                return (
                                  <span key={pageNum} className="px-2 text-gray-400">
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                          <button
                            onClick={() => {
                              const newPage = currentPage + 1;
                              if (newPage <= totalPages) {
                                setCurrentPage(newPage);
                                fetchMembers(newPage);
                              }
                            }}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-black"
                          >
                            다음
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchMembers(currentPage);
          }}
        />
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            fetchMembers(currentPage);
          }}
        />
      )}

      {/* View Member Details Modal */}
      {viewingMember && (
        <ViewMemberModal
          member={viewingMember}
          onClose={() => setViewingMember(null)}
        />
      )}
    </div>
  );
}

// Comment: Add Member Modal Component
function AddMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [points, setPoints] = useState<string>('0');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름은 필수입니다.');
      return;
    }
    if (Number(points) < 0) {
      setError('정액제 포인트는 0 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/prepaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          points: Number(points) || 0,
          expiresAt: expiresAt || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create member');
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">선불권 회원 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="회원 이름 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="연락처 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="이메일 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              포인트 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="선불권 포인트 입력"
            />
            <p className="text-xs text-gray-500 mt-1">정액제 포인트를 입력하세요.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">만료일</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">만료일을 선택하세요 (선택사항).</p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60 transition-colors"
            >
              {loading ? '추가 중...' : '회원 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Comment: Edit Member Modal Component
function EditMemberModal({
  member,
  onClose,
  onSuccess,
}: {
  member: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(member.name || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [email, setEmail] = useState(member.email || '');
  const [points, setPoints] = useState<string>(String(member.points || 0));
  const [expiresAt, setExpiresAt] = useState(
    member.expires_at ? member.expires_at.split('T')[0] : ''
  );
  const [isActive, setIsActive] = useState(member.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름은 필수입니다.');
      return;
    }
    if (Number(points) < 0) {
      setError('정액제 포인트는 0 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/prepaid?id=${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          points: Number(points) || 0,
          expiresAt: expiresAt || null,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update member');
      }

      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">선불권 회원 수정</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="회원 이름 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              포인트 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="선불권 포인트 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">만료일을 선택하세요 (선택사항).</p>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Comment: View Member Details Modal Component
function ViewMemberModal({
  member,
  onClose,
}: {
  member: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Member Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-black">{member.name || 'Unknown'}</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  member.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">연락처</span>
              <span className="text-sm font-medium text-black">
                {member.phone || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">이메일</span>
              <span className="text-sm font-medium text-black">
                {member.email || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">포인트</span>
              <span className="text-sm font-bold text-black">
                {member.points !== undefined ? `${member.points} points` : '0 points'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">만료일</span>
              <span className="text-sm font-medium text-black">
                {member.expires_at
                  ? new Date(member.expires_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'No expiration'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">생성일</span>
              <span className="text-sm font-medium text-black">
                {member.created_at
                  ? new Date(member.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-900 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

