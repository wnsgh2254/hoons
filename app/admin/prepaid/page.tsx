'use client';

import { useEffect, useState } from 'react';
import {
  AdminPageLayout,
  PageHeader,
  SearchBar,
  DataTable,
  Button,
  IconButton,
  Modal,
  Input,
  FormAlert,
  Badge,
} from '@/components/ui';

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

  const columns = [
    {
      key: 'name',
      header: '회원',
      render: (member: any) => (
        <span className="font-medium text-black">
          {member.name || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'contact',
      header: '연락처',
      render: (member: any) => (
        <div className="flex flex-col gap-0.5">
          {member.phone && (
            <span className="text-gray-600">{member.phone}</span>
          )}
          {member.email && (
            <span className="text-xs text-gray-500">{member.email}</span>
          )}
        </div>
      ),
    },
    {
      key: 'points',
      header: '정액권',
      render: (member: any) => (
        <span className="font-medium text-black">
          {`$${Number(member.points || 0).toLocaleString()}`}
        </span>
      ),
    },
    {
      key: 'expires_at',
      header: '만료일',
      render: (member: any) => (
        <span className="text-gray-600">
          {member.expires_at
            ? new Date(member.expires_at).toLocaleDateString('ko-KR')
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'right' as const,
      render: (member: any) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon="edit"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setEditingMember(member);
            }}
            title="수정"
          />
          <IconButton
            icon="visibility"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setViewingMember(member);
            }}
            title="상세 보기"
          />
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <PageHeader
        title="정액권 관리"
        actions={
          <Button
            variant="primary"
            icon="add"
            onClick={() => setShowAddModal(true)}
          >
            회원 추가
          </Button>
        }
      />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name, phone, or email..."
      />

      <DataTable
        columns={columns}
        data={members}
        keyExtractor={(member) => member.id}
        loading={loading}
        emptyMessage={
          searchQuery ? 'No members found' : 'No prepaid pass members'
        }
        emptyIcon="card_membership"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => {
          setCurrentPage(page);
          fetchMembers(page);
        }}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchMembers(currentPage);
        }}
      />

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={!!editingMember}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSuccess={() => {
          setEditingMember(null);
          fetchMembers(currentPage);
        }}
      />

      {/* View Member Details Modal */}
      <ViewMemberModal
        isOpen={!!viewingMember}
        member={viewingMember}
        onClose={() => setViewingMember(null)}
      />
    </AdminPageLayout>
  );
}

// Comment: Add Member Modal Component
function AddMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
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
      setError('정액권 금액은 0 이상이어야 합니다.');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="정액권 회원 추가"
      maxWidth="max-w-lg"
      scrollable
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={handleSubmit}
            className="flex-1"
          >
            {loading ? '추가 중...' : '회원 추가'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input
          label="이름 *"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="회원 이름 입력"
        />
        <Input
          label="연락처"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="연락처 입력"
        />
        <Input
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 입력"
        />
        <div>
          <Input
            label="정액권 *"
            type="number"
            required
            min="0"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="정액권 금액 입력"
          />
          <p className="text-xs text-gray-500 mt-1">정액권 금액을 입력하세요.</p>
        </div>
        <div>
          <Input
            label="만료일"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">만료일을 선택하세요 (선택사항).</p>
        </div>
      </form>
    </Modal>
  );
}

// Comment: Edit Member Modal Component
function EditMemberModal({
  isOpen,
  member,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  member: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(member?.name || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [points, setPoints] = useState<string>(String(member?.points || 0));
  const [expiresAt, setExpiresAt] = useState(
    member?.expires_at ? member.expires_at.split('T')[0] : ''
  );
  const [isActive, setIsActive] = useState(member?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setPhone(member.phone || '');
      setEmail(member.email || '');
      setPoints(String(member.points || 0));
      setExpiresAt(member.expires_at ? member.expires_at.split('T')[0] : '');
      setIsActive(member.is_active ?? true);
      setError(null);
    }
  }, [member]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError('이름은 필수입니다.');
      return;
    }
    if (Number(points) < 0) {
      setError('정액권 금액은 0 이상이어야 합니다.');
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

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="정액권 회원 수정"
      maxWidth="max-w-lg"
      scrollable
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={handleSubmit}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert message={error} variant="error" />}
        <Input
          label="이름 *"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="회원 이름 입력"
        />
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
        />
        <Input
          label="정액권 *"
          type="number"
          required
          min="0"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="정액권 금액 입력"
        />
        <div>
          <Input
            label="Expires At"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
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
      </form>
    </Modal>
  );
}

// Comment: View Member Details Modal Component
function ViewMemberModal({
  isOpen,
  member,
  onClose,
}: {
  isOpen: boolean;
  member: any;
  onClose: () => void;
}) {
  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Details"
      maxWidth="max-w-lg"
      scrollable
      footer={
        <Button
          variant="primary"
          onClick={onClose}
          className="w-full"
        >
          닫기
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-black">{member.name || 'Unknown'}</h3>
          <Badge
            variant={member.is_active ? 'success' : 'default'}
            size="sm"
            className="mt-1"
          >
            {member.is_active ? 'Active' : 'Inactive'}
          </Badge>
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
            <span className="text-sm text-gray-500">정액권</span>
            <span className="text-sm font-bold text-black">
              {member.points !== undefined ? `${Number(member.points).toLocaleString()}` : '0'}
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
      </div>
    </Modal>
  );
}
