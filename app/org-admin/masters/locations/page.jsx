'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import OrgAdminSideNavigation from '../../../components/OrgAdminSideNavigation';
import DropdownSelect from '../../../components/DropdownSelect';
import {
  createOrgLocation,
  deleteOrgLocation,
  getOrgLocations,
  toggleOrgLocationStatus,
  updateOrgLocation
} from '../../../lib/hrmsApi';

export default function OfficeLocationsMasterPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
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
    address: '',
    city: '',
    state: '',
    country: 'India',
    timezone: 'Asia/Kolkata',
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
      const data = await getOrgLocations();
      setLocations(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load office locations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, pageSize]);

  const filteredLocations = useMemo(() => {
    return locations.filter((item) => {
      const matchesSearch =
        !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.code?.toLowerCase().includes(search.toLowerCase()) ||
        item.city?.toLowerCase().includes(search.toLowerCase()) ||
        item.country?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === 'active' && item.isActive) ||
        (selectedStatus === 'inactive' && !item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [locations, search, selectedStatus]);

  // Paginated Subset
  const totalRecords = filteredLocations.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLocations = useMemo(() => {
    return filteredLocations.slice(startIndex, startIndex + pageSize);
  }, [filteredLocations, startIndex, pageSize]);

  function handleOpenModal(item = null) {
    setModalError(null);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        code: item.code || '',
        address: item.address || '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || 'India',
        timezone: item.timezone || 'Asia/Kolkata',
        isActive: item.isActive ?? true
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        timezone: 'Asia/Kolkata',
        isActive: true
      });
    }
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingItem) {
        await updateOrgLocation(editingItem.id, formData);
      } else {
        await createOrgLocation(formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to save office location');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id) {
    try {
      await toggleOrgLocationStatus(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteOrgLocation(deleteId);
      setDeleteId(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete location');
    }
  }

  return (
    <div className="app-shell-with-nav">
      <OrgAdminSideNavigation activePath="/org-admin/masters/locations" />

      <main className="admin-page-main" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--color-neutral-900)' }}>
              Office Locations & Branches Master
            </h1>
          </div>

          <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ gap: '8px' }}>
            <Plus size={16} />
            <span>Add Location</span>
          </button>
        </header>

        {/* Table & Filters Card */}
        <div className="card" style={{ padding: '20px' }}>
          {/* Controls Header */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-500)', zIndex: 1 }} />
              <input
                type="text"
                className="input"
                placeholder="Search locations by name, code, city, or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ flex: '0 1 180px' }}>
              <DropdownSelect
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'inactive', label: 'Disabled Only' }
                ]}
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                placeholder="All Statuses"
                searchable={false}
              />
            </div>

            {(search || selectedStatus) && (
              <button
                type="button"
                className="btn btn-tertiary"
                onClick={() => {
                  setSearch('');
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
              <p>Loading office locations...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
              <MapPin size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-neutral-700)', margin: '0 0 4px' }}>No Office Locations Found</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {search || selectedStatus ? 'Try adjusting your search filters.' : 'Click "Add Location" to create your first record.'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-neutral-100)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '120px' }}>Loc Code</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)' }}>Location Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)' }}>City / State</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)' }}>Country</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)' }}>Time Zone</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '120px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-700)', width: '140px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLocations.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                          {item.code}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-neutral-900)' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-neutral-700)' }}>
                          {item.city ? `${item.city}${item.state ? `, ${item.state}` : ''}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-neutral-700)' }}>
                          {item.country || 'India'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-neutral" style={{ fontWeight: '600' }}>
                            {item.timezone || 'Asia/Kolkata'}
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
                              title="Edit Location"
                              onClick={() => handleOpenModal(item)}
                              style={{ padding: '6px', height: 'auto', minHeight: '0' }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-tertiary"
                              title={item.isActive ? 'Disable Location' : 'Enable Location'}
                              onClick={() => handleToggle(item.id)}
                              style={{ padding: '6px', height: 'auto', minHeight: '0', color: item.isActive ? '#d97706' : '#16a34a' }}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-tertiary"
                              title="Delete Location"
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
                          { value: '50', label: '50' }
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
                {editingItem ? 'Edit Office Location Record' : 'Add New Office Location Record'}
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

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                    Location / Branch Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. Mumbai HQ / Bengaluru Tech Park"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                    Location Code (Auto-generated if left empty)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. LOC-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                      City
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                      State / Province
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                      Country
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. India"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                      Time Zone
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Asia/Kolkata"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                    Full Physical Address
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Street address, building, landmark..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingItem ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.6)', display: 'grid', placeItems: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: 'min(100%, 420px)', padding: '24px', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }}>
            <AlertCircle size={48} style={{ color: 'var(--color-error)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px', color: 'var(--color-neutral-900)' }}>Delete Location?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-neutral-500)', margin: '0 0 20px' }}>
              This action cannot be undone. Are you sure you want to permanently delete this location?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
