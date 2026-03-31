'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Z } from '@/lib/constants';

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-loaded designers from parent — skips the /api/staff fetch when provided */
  initialDesigners?: Array<{ id: number; name: string; [key: string]: any }>;
}

export default function TimeOffModal({ isOpen, onClose, initialDesigners }: TimeOffModalProps) {
  const [designers, setDesigners] = useState<any[]>(initialDesigners || []);
  const [records, setRecords] = useState<any[]>([]);
  const [designerId, setDesignerId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        // Only fetch designers if the parent didn't provide them (avoids /api/staff call on load)
        if (!initialDesigners || initialDesigners.length === 0) {
          const designersRes = await fetch('/api/staff?role=designer');
          const designersData = await designersRes.json();
          if (designersRes.ok && designersData.staff) setDesigners(designersData.staff);
        }
        const recordsRes = await fetch('/api/designer-time-off');
        const recordsData = await recordsRes.json();
        if (recordsRes.ok && recordsData.timeOffs) setRecords(recordsData.timeOffs);
      } catch (err) {
        console.error('Error loading time off data:', err);
      }
    };
    loadData();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const designerOptions = designers.map((d) => ({ value: d.id, label: d.name }));

  const handleAdd = async () => {
    if (!designerId || !startDate || !endDate) {
      alert('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/designer-time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designer_id: designerId,
          start_date: startDate,
          end_date: endDate,
          reason: reason || null,
        }),
      });
      if (res.ok) {
        setStartDate('');
        setEndDate('');
        setReason('');
        setDesignerId(null);
        const recordsRes = await fetch('/api/designer-time-off');
        const recordsData = await recordsRes.json();
        if (recordsRes.ok) setRecords(recordsData.timeOffs || []);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add time off');
      }
    } catch (error) {
      console.error('Error adding time off:', error);
      alert('Failed to add time off');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Designer Time Off"
      zIndex={Z.MODAL_BASE}
      maxWidth="max-w-2xl"
      scrollable
    >
      <div className="space-y-6">
        {/* Add Time Off Form */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-black">Add Time Off</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Designer *"
              options={designerOptions}
              placeholder="Select designer"
              value={designerId || ''}
              onChange={(e) => setDesignerId(e.target.value ? Number(e.target.value) : null)}
            />
            <Input
              label="Start Date *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date *"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
            <Input
              label="Reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button loading={submitting} onClick={handleAdd} className="w-full">
            {submitting ? 'Adding...' : 'Add Time Off'}
          </Button>
        </div>

        {/* Time Off Records List */}
        <div>
          <h3 className="font-semibold text-black mb-3">Existing Time Off Records</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {records.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No time off records</p>
            ) : (
              records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-black">{record.designer?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}
                      {record.reason && ` \u2022 ${record.reason}`}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Delete this time off record?')) {
                        try {
                          const res = await fetch(`/api/designer-time-off/${record.id}`, { method: 'DELETE' });
                          if (res.ok) {
                            setRecords((prev) => prev.filter((r: any) => r.id !== record.id));
                          }
                        } catch (error) {
                          console.error('Error deleting time off:', error);
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
