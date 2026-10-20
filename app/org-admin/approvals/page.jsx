'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ShieldCheck,
  X
} from 'lucide-react';
import AdminRouteGuard from '../../components/AdminRouteGuard';
import Breadcrumbs from '../../components/Breadcrumbs';
import DropdownSelect from '../../components/DropdownSelect';
import { SkeletonCardList, SkeletonMetrics } from '../../components/SkeletonLoader';
import { approveRequest, getApprovals, getCurrentCompany, rejectRequest } from '../../lib/hrmsApi';
import { flow } from '../workflows/components/api';
import Link from 'next/link';
import '../org-admin.css';

export default function ApprovalsPage() {
  const [activeCompany, setActiveCompany] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Document Mismatch');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [toast, setToast] = useState('');

  async function loadApprovalsData() {
    try {
      setIsLoading(true);
      const data = await getApprovals();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (error) {
      setApprovals([]);
      setToast(error.message || 'Unable to load requests');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getCurrentCompany()
      .then(setActiveCompany)
      .catch(() => {});
    loadApprovalsData();
  }, []);

  const pendingCount = approvals.filter((a) => ['Pending','In Progress','Awaiting Configuration'].includes(a.status)).length;
  const approvedCount = approvals.filter((a) => a.status === 'Approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'Rejected').length;

  const filteredApprovals = useMemo(() => {
    return approvals.filter((req) => {
      const matchStatus = statusFilter === 'All' || req.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || req.category === categoryFilter;
      const matchSearch =
        !searchQuery ||
        req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchCategory && matchSearch;
    });
  }, [approvals, statusFilter, categoryFilter, searchQuery]);

  async function handleApproveRequest(req) {
    try {
      await approveRequest(req.id);
      setToast(`Approval recorded for ${req.employeeName}. The workflow will apply changes after all required actions complete.`);
      await loadApprovalsData();
    } catch (err) {
      setToast(err.message || 'Unable to approve request.');
    }
  }

  function openRejectModal(req) {
    setRejectionTarget(req);
    setRejectionReason('Document Mismatch');
    setRejectionRemarks('');
  }

  async function handleConfirmRejection() {
    if (!rejectionTarget) return;
    const note = `${rejectionReason}${rejectionRemarks ? `: ${rejectionRemarks}` : ''}`;
    try {
      await rejectRequest(rejectionTarget.id, note);
      setToast(`Rejected request ${rejectionTarget.id} for ${rejectionTarget.employeeName}.`);
      setRejectionTarget(null);
      await loadApprovalsData();
    } catch (err) {
      setToast(err.message || 'Unable to reject request.');
    }
  }

  return (
    <AdminRouteGuard allowedRole="org_admin">
      <div style={{ width: '100%' }}>
        <section className="approval-workspace">
          <div className="approval-shell">
            <header className="approval-header">
              <div>
                <Breadcrumbs
                  items={[
                    { label: 'Organization Admin', href: '/org-admin' },
                    { label: 'Approvals & Governance' }
                  ]}
                />
                <h1>Employee Approval Workflows</h1>
                <p>Manage and review sensitive employee profile change requests (Bank, Statutory & Documents).</p>
              </div>
            </header>

            {isLoading ? (
              <SkeletonCardList count={3} />
            ) : (
              <>
                <section className="card">
              <div className="filter-strip">
                <label className="admin-search">
                  <Search size={16} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search request ID, employee name, code..."
                  />
                </label>
                <DropdownSelect
                  ariaLabel="Filter by status"
                  value={statusFilter}
                  options={[
                    { value: 'Awaiting Configuration', label: 'Awaiting Configuration' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Approved', label: 'Approved' },
                    { value: 'Rejected', label: 'Rejected' },
                    { value: 'All', label: 'All Statuses' }
                  ]}
                  onChange={setStatusFilter}
                />
                <DropdownSelect
                  ariaLabel="Filter by category"
                  value={categoryFilter}
                  options={[
                    { value: 'All', label: 'All Categories' },
                    { value: 'Bank Details', label: 'Bank Details' },
                    { value: 'Statutory Details', label: 'Statutory Details' },
                    { value: 'Documents', label: 'Documents' }
                  ]}
                  onChange={setCategoryFilter}
                />
              </div>

              <div className="approval-card-list">
                {filteredApprovals.length === 0 && (
                  <div style={{ padding: 36, textAlign: 'center' }}>
                    <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 10px', display: 'block' }} />
                    <strong style={{ fontSize: 15 }}>No approval requests match current filters.</strong>
                    <p style={{ margin: '4px 0 0', color: '#6b7280' }}>All pending change requests have been processed.</p>
                  </div>
                )}

                {filteredApprovals.map((req) => (
                  <article className="approval-card" key={req.id}>
                    <header className="approval-card-header">
                      <div className="approval-user-info">
                        <span className="avatar">{req.employeeName.slice(0, 1)}</span>
                        <div>
                          <h3>
                            {req.employeeName}{' '}
                            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>({req.employeeCode})</span>
                          </h3>
                          <p>
                            {req.role} · {req.department} · Submitted {req.submittedAt}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="badge badge-neutral">{req.category}</span>
                        <span
                          className={`badge ${
                            ['Pending', 'In Progress', 'Awaiting Configuration'].includes(req.status)
                              ? 'badge-warning'
                              : req.status === 'Approved'
                              ? 'badge-success'
                              : 'badge-danger'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </header>

                    <div className="approval-change-grid">
                      {req.changes.map((c, i) => (
                        <div className="approval-change-row" key={i}>
                          <span className="field-name">{c.field}</span>
                          <span className="curr-val">{c.current}</span>
                          <ArrowRight size={14} style={{ color: '#94a3b8' }} />
                          <span className="new-val">{c.requested}</span>
                        </div>
                      ))}
                    </div>

                    <footer className="approval-card-footer">
                      <span className="approval-note-text">
                        {req.rejectionNote ? `Rejection Reason: ${req.rejectionNote}` : req.notes}
                      </span>

                      {req.status === 'Awaiting Configuration' ? (<div className="approval-card-actions"><Link href="/org-admin/workflows" className="btn btn-secondary">Configure workflow</Link><button className="btn btn-primary" onClick={async()=>{try{const result=await flow(`/hr/${req.id}/start`,'POST',{});setToast(result?'Workflow started':'Publish and bind a workflow first');await loadApprovalsData();}catch(error){setToast(error.message);}}}>Start configured workflow</button></div>) : req.canAct ? (
                        <div className="approval-actions">
                          <button
                            className="btn btn-secondary"
                            style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                            type="button"
                            onClick={() => openRejectModal(req)}
                          >
                            <X size={15} /> Reject
                          </button>
                          <button
                            className="btn btn-success"
                            type="button"
                            onClick={() => handleApproveRequest(req)}
                          >
                            <Check size={15} /> Approve Request
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                          {req.status === 'In Progress' ? 'Workflow in progress — view tasks in the Task Inbox' : `Processed on ${req.actionDate || req.submittedAt}`}
                        </span>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </section>

        {rejectionTarget && (
          <div className="modal-backdrop" role="presentation" onClick={() => setRejectionTarget(null)}>
            <section className="modal-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <header className="modal-header">
                <div>
                  <h2>Reject Change Request</h2>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {rejectionTarget.id} · {rejectionTarget.employeeName} ({rejectionTarget.category})
                  </span>
                </div>
                <button className="btn btn-secondary" style={{ padding: 4, minHeight: 28 }} type="button" onClick={() => setRejectionTarget(null)}>
                  <X size={16} />
                </button>
              </header>

              <div className="modal-body">
                <div className="form-field">
                  <span>Rejection Reason</span>
                  <DropdownSelect
                    value={rejectionReason}
                    options={['Document Mismatch', 'Invalid Account Details', 'Duplicate Request', 'Incomplete Information', 'Other']}
                    onChange={setRejectionReason}
                  />
                </div>
                <label className="form-field">
                  <span>Remarks / Feedback to Employee</span>
                  <textarea
                    value={rejectionRemarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                    placeholder="Provide specific feedback on why this request is rejected..."
                  />
                </label>
              </div>

              <footer className="modal-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setRejectionTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" type="button" onClick={handleConfirmRejection}>
                  Confirm Rejection
                </button>
              </footer>
            </section>
          </div>
        )}

        {toast && (
          <button className="toast" type="button" onClick={() => setToast('')}>
            {toast}
          </button>
        )}
      </div>
    </AdminRouteGuard>
  );
}
