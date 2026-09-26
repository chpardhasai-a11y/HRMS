'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import DropdownSelect from '../../../components/DropdownSelect';
import {
  createTimeZone,
  deleteTimeZone,
  getAdminTimeZones,
  toggleTimeZoneStatus,
  updateTimeZone
} from '../../../lib/hrmsApi';

const DEFAULT_REGIONS = [
  'Asia',
  'Americas',
  'Europe',
  'Middle East',
  'Australia',
  'Africa',
  'Global'
];

export default function TimeZoneMasterPage() {
  const [timeZones, setTimeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    offset: '',
    region: 'Asia',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminTimeZones();
      setTimeZones(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load time zones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedRegion, selectedStatus, pageSize]);

  const regions = useMemo(() => {
    const set = new Set(DEFAULT_REGIONS);
    timeZones.forEach((tz) => {
      if (tz.region) set.add(tz.region);
    });
    return Array.from(set).sort();
  }, [timeZones]);

  const filteredTimeZones = useMemo(() => {
    return timeZones.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.offset.toLowerCase().includes(search.toLowerCase());

      const matchesRegion = !selectedRegion || item.region === selectedRegion;
      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === 'active' && item.isActive) ||
        (selectedStatus === 'inactive' && !item.isActive);

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [timeZones, search, selectedRegion, selectedStatus]);

  // Pagination Calculations
  const totalRecords = filteredTimeZones.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTimeZones = useMemo(() => {
    return filteredTimeZones.slice(startIndex, startIndex + pageSize);
  }, [filteredTimeZones, startIndex, pageSize]);

  function handleOpenAdd() {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      offset: '+00:00',
      region: DEFAULT_REGIONS[0],
      isActive: true
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      offset: item.offset,
      region: item.region || DEFAULT_REGIONS[0],
      isActive: item.isActive
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingItem) {
        await updateTimeZone(editingItem.id, formData);
      } else {
        await createTimeZone(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to save time zone');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(id) {
    try {
      await toggleTimeZoneStatus(id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    try {
      await deleteTimeZone(deleteId);
      setDeleteId(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete time zone');
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <main className="admin-page-main" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Breadcrumb Navigation */}
        <div className="admin-breadcrumbs">
          <ol>
            <li><a href="/platform-admin">Platform</a></li>
            <li>/</li>
            <li>Master Catalog</li>
            <li>/</li>
            <li><span>Time Zone Master</span></li>
          </ol>
        </div>

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--color-neutral-900)' }}>
              Time Zone Master Catalog
            </h1>
          </div>

          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ gap: '8px' }}>
            <Plus size={16} />
            <span>Add New Time Zone</span>
          </button>
        </header>

        {/* Table & Filters Card */}
        <div className="card" style={{ padding: '20px' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-500)', zIndex: 1 }} />
              <input
                type="text"
                className="input"
                placeholder="Search by time zone identifier, code, offset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ flex: '0 1 240px' }}>
              <DropdownSelect
                value={selectedRegion}
                onChange={(val) => setSelectedRegion(val)}
                options={[
                  { value: '', label: `All Regions (${regions.length})` },
                  ...regions.map((reg) => ({ value: reg, label: reg }))
                ]}
                placeholder="Region Filter"
              />
            </div>

            <div style={{ flex: '0 1 160px' }}>
              <DropdownSelect
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'inactive', label: 'Disabled Only' }
                ]}
                placeholder="Status Filter"
              />
            </div>

            {(search || selectedRegion || selectedStatus) && (
              <button
                type="button"
                className="btn btn-tertiary"
                onClick={() => {
                  setSearch('');
                  setSelectedRegion('');
                  setSelectedStatus('');
                }}
                style={{ padding: '0 12px' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ padding: '16px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button className="btn btn-tertiary" onClick={loadData} style={{ color: '#dc2626' }}>
                Retry
              </button>
            </div>
          )}

          {/* Data Table */}
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
              <RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
              <p>Loading Time Zone Master Catalog...</p>
            </div>
          ) : filteredTimeZones.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
              <Clock size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-neutral-700)', margin: '0 0 4px' }}>No Time Zones Found</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {search || selectedRegion || selectedStatus ? 'Try adjusting your search filters.' : 'Click "Add New Time Zone" to create your first record.'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-neutral-100)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)' }}>Time Zone Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '110px' }}>Code</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '130px', textAlign: 'center' }}>UTC Offset</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)' }}>Region</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '120px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '140px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTimeZones.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-900)' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: '700' }}>
                          <span className="badge badge-info" style={{ fontWeight: '800' }}>
                            {item.code}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-neutral-800)' }}>
                          {item.offset}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-neutral-700)' }}>
                          <span className="badge badge-neutral" style={{ fontWeight: '600' }}>
                            {item.region || 'Global'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className={`badge ${item.isActive ? 'badge-success' : 'badge-error'}`}>
                            {item.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-tertiary"
                              title="Edit Time Zone"
                              onClick={() => handleOpenEdit(item)}
                              style={{ padding: '6px', height: 'auto', minHeight: '0' }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-tertiary"
                              title={item.isActive ? 'Disable Time Zone' : 'Enable Time Zone'}
                              onClick={() => handleToggleStatus(item.id)}
                              style={{ padding: '6px', height: 'auto', minHeight: '0', color: item.isActive ? '#d97706' : '#16a34a' }}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-tertiary"
                              title="Delete Time Zone"
                              onClick={() => setDeleteId(item.id)}
                              style={{ padding: '6px', height: 'auto', minHeight: '0', color: 'var(--color-error)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-neutral-500)' }}>
                  Showing <strong style={{ color: 'var(--color-neutral-900)' }}>{totalRecords > 0 ? startIndex + 1 : 0}</strong> to{' '}
                  <strong style={{ color: 'var(--color-neutral-900)' }}>{Math.min(startIndex + pageSize, totalRecords)}</strong> of{' '}
                  <strong style={{ color: 'var(--color-neutral-900)' }}>{totalRecords}</strong> entries
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-neutral-500)' }}>
                    <span>Rows per page:</span>
                    <div style={{ width: '80px' }}>
                      <DropdownSelect
                        value={String(pageSize)}
                        onChange={(val) => setPageSize(Number(val))}
                        options={[
                          { value: '10', label: '10' },
                          { value: '25', label: '25' },
                          { value: '50', label: '50' },
                          { value: '100', label: '100' }
                        ]}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-tertiary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      style={{ padding: '6px 10px', height: '34px' }}
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-neutral-700)', padding: '0 8px' }}>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="btn btn-tertiary"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      style={{ padding: '6px 10px', height: '34px' }}
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.6)', display: 'grid', placeItems: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: 'min(100%, 540px)', padding: '24px', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--color-neutral-900)' }}>
                {editingItem ? 'Edit Time Zone Record' : 'Add New Time Zone Record'}
              </h2>
              <button type="button" className="btn btn-tertiary" onClick={() => setIsModalOpen(false)} style={{ padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '12px 16px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', marginBottom: '16px', fontSize: '13px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
              <div className="field">
                <label>Time Zone Name *</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Asia/Kolkata"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="field">
                  <label>Abbreviation *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. IST"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="field">
                  <label>UTC Offset *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. +05:30"
                    value={formData.offset}
                    onChange={(e) => setFormData({ ...formData, offset: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Region *</label>
                  <DropdownSelect
                    value={formData.region}
                    onChange={(val) => setFormData({ ...formData, region: val })}
                    options={DEFAULT_REGIONS.map((r) => ({ value: r, label: r }))}
                    placeholder="Select Region"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isActive" style={{ fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                  Enable this time zone for tenant onboarding forms
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-tertiary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Time Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.6)', display: 'grid', placeItems: 'center', padding: '16px' }}>
          <div className="card" style={{ width: 'min(100%, 420px)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px', color: '#dc2626' }}>
              Confirm Deletion
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-neutral-700)', margin: '0 0 20px' }}>
              Are you sure you want to delete this time zone from the master catalog? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-tertiary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleDeleteConfirm} style={{ background: '#dc2626', borderColor: '#dc2626' }}>
                Delete Time Zone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
