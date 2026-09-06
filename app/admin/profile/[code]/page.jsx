'use client';

import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileCheck2,
  GraduationCap,
  History,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminSideNavigation from '../../../components/AdminSideNavigation';
import { formatDate, getEmployee, statusLabel } from '../../../lib/hrmsApi';

function employeeStatusClass(status) {
  if (statusLabel(status) === 'Active') return 'admin-employee-status admin-employee-status-active';
  if (statusLabel(status) === 'On Leave') return 'admin-employee-status admin-employee-status-warning';
  return 'admin-employee-status admin-employee-status-muted';
}

function profileSections(employee) {
  return [
    {
      title: 'Employment',
      icon: BriefcaseBusiness,
      items: [
        ['Employment Type', employee.type],
        ['Employment Status', statusLabel(employee.status)],
        ['Grade / Band', employee.grade],
        ['Joining Date', formatDate(employee.joinDate)],
        ['Probation Status', 'Confirmed']
      ]
    },
    {
      title: 'Organization',
      icon: Building2,
      items: [
        ['Legal Entity', employee.entity],
        ['Business Unit', employee.department],
        ['Designation / Role', employee.role],
        ['Reporting Manager', employee.manager],
        ['Work Location', employee.location]
      ]
    },
    {
      title: 'Identity / Statutory / Bank',
      icon: Banknote,
      items: [
        ['PAN', 'Verified'],
        ['Aadhaar', 'Verified'],
        ['UAN', 'Mapped'],
        ['ESIC', employee.type === 'Contract' ? 'Not applicable' : 'Mapped'],
        ['Bank Account', 'Verified and masked']
      ]
    },
    {
      title: 'Documents',
      icon: FileCheck2,
      items: [
        ['Identity Proof', 'Verified'],
        ['Address Proof', employee.documentNote],
        ['Employment Contract', 'Signed'],
        ['Education Certificate', 'Verified'],
        ['Background Check', 'Completed']
      ]
    },
    {
      title: 'Education / Experience',
      icon: GraduationCap,
      items: [
        ['Highest Qualification', 'B.Tech Computer Science'],
        ['Institute', 'VJTI Mumbai'],
        ['Completion Year', '2017'],
        ['Previous Experience', '5 years'],
        ['Primary Skill', employee.department === 'Design' ? 'Product Design' : employee.department]
      ]
    },
    {
      title: 'Lifecycle',
      icon: CalendarDays,
      items: [
        ['Record Created', employee.joinDate],
        ['Last Updated', 'Today'],
        ['Last Movement', 'Annual role review'],
        ['Profile Readiness', '92%'],
        ['Audit Status', 'Available']
      ]
    }
  ];
}

export default function AdminEmployeeProfilePage() {
  const params = useParams();
  const code = params?.code;
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    getEmployee(code)
      .then(setEmployee)
      .catch((loadError) => setError(loadError.message || 'Unable to load employee profile.'));
  }, [code]);

  return (
    <main className="app-shell-with-nav">
      <style>{`
        .admin-employee-record-page {
          min-width: 0;
          padding: 20px;
          background: var(--color-page);
        }

        .admin-employee-record-shell {
          display: grid;
          gap: 16px;
          max-width: 1360px;
          margin: 0 auto;
        }

        .admin-employee-record-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .admin-employee-record-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .admin-employee-record-link,
        .admin-employee-record-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 36px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background: var(--color-white);
          color: var(--color-neutral-700);
          padding: 0 14px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .admin-employee-record-primary {
          border-color: var(--color-primary);
          background: var(--color-primary);
          color: var(--color-white);
        }

        .admin-employee-record-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          overflow: hidden;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-white);
          box-shadow: var(--shadow-sm);
        }

        .admin-employee-record-identity {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          min-width: 0;
          padding: 22px;
        }

        .admin-employee-record-avatar {
          display: grid;
          place-items: center;
          width: 74px;
          height: 74px;
          border: 1px solid #bfdbfe;
          border-radius: 50%;
          background: #eff6ff;
          color: var(--color-primary);
          font-size: 28px;
          font-weight: 800;
        }

        .admin-employee-record-code-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .admin-employee-record-code {
          color: var(--color-neutral-500);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .admin-employee-record-identity h1 {
          margin-bottom: 6px;
          color: var(--color-neutral-900);
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: 0;
        }

        .admin-employee-record-title {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin: 0;
          color: var(--color-neutral-700);
          font-weight: 700;
        }

        .admin-employee-status {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .admin-employee-status-active {
          background: #dcfce7;
          color: #15803d;
        }

        .admin-employee-status-warning {
          background: #ffedd5;
          color: #c2410c;
        }

        .admin-employee-status-muted {
          background: #e5e7eb;
          color: var(--color-neutral-700);
        }

        .admin-employee-record-readiness {
          display: grid;
          align-content: center;
          gap: 10px;
          border-left: 1px solid var(--color-border);
          background: #fbfdff;
          padding: 22px;
        }

        .admin-employee-record-readiness-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-neutral-500);
          font-weight: 800;
        }

        .admin-employee-record-readiness-score {
          color: var(--color-neutral-900);
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
        }

        .admin-employee-record-readiness-track {
          overflow: hidden;
          height: 8px;
          border-radius: 999px;
          background: #e5e7eb;
        }

        .admin-employee-record-readiness-fill {
          display: block;
          width: 92%;
          height: 100%;
          border-radius: inherit;
          background: var(--color-primary);
        }

        .admin-employee-record-readiness-note {
          margin: 0;
          color: var(--color-neutral-500);
          font-size: 12px;
          font-weight: 700;
        }

        .admin-employee-record-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-employee-record-stat,
        .admin-employee-record-contact-item,
        .admin-employee-record-section {
          min-width: 0;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-white);
          box-shadow: var(--shadow-xs);
        }

        .admin-employee-record-stat {
          display: grid;
          gap: 4px;
          padding: 14px;
        }

        .admin-employee-record-stat span,
        .admin-employee-record-section dt {
          color: var(--color-neutral-500);
          font-size: 12px;
          font-weight: 800;
        }

        .admin-employee-record-stat strong,
        .admin-employee-record-section dd {
          min-width: 0;
          margin: 0;
          color: var(--color-neutral-900);
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .admin-employee-record-contact {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-employee-record-contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          color: var(--color-neutral-700);
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .admin-employee-record-contact-item svg,
        .admin-employee-record-section h2 svg,
        .admin-employee-record-readiness-label svg {
          flex: 0 0 auto;
          color: var(--color-primary);
        }

        .admin-employee-record-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .admin-employee-record-section {
          padding: 16px;
        }

        .admin-employee-record-section h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: var(--color-neutral-900);
          font-size: 17px;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .admin-employee-record-section dl {
          display: grid;
          margin: 0;
          border-top: 1px solid var(--color-border);
        }

        .admin-employee-record-section dl div {
          display: grid;
          grid-template-columns: 180px minmax(0, 1fr);
          gap: 14px;
          min-width: 0;
          padding: 11px 0;
          border-bottom: 1px solid var(--color-border);
        }

        .admin-employee-record-section dl div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        @media (max-width: 1180px) {
          .admin-employee-record-header,
          .admin-employee-record-strip,
          .admin-employee-record-contact,
          .admin-employee-record-grid {
            grid-template-columns: 1fr;
          }

          .admin-employee-record-readiness {
            border-top: 1px solid var(--color-border);
            border-left: 0;
          }
        }

        @media (max-width: 720px) {
          .admin-employee-record-page {
            padding: 12px;
          }

          .admin-employee-record-toolbar,
          .admin-employee-record-identity,
          .admin-employee-record-section dl div {
            display: grid;
            grid-template-columns: 1fr;
          }

          .admin-employee-record-actions {
            justify-content: stretch;
          }

          .admin-employee-record-button,
          .admin-employee-record-link {
            width: 100%;
          }
        }
      `}</style>
      <AdminSideNavigation activePath="/admin" />

      <section className="admin-employee-record-page">
        <div className="admin-employee-record-shell">
          <div className="admin-employee-record-toolbar">
            <a className="admin-employee-record-link" href="/admin">
              <ArrowLeft size={16} />
              Employee Master
            </a>
            <div className="admin-employee-record-actions">
              <a className="admin-employee-record-button" href="/admin">
                <History size={16} />
                Audit History
              </a>
              <a className="admin-employee-record-button admin-employee-record-primary" href="/profile/edit">
                <Pencil size={16} />
                Edit Profile
              </a>
            </div>
          </div>

          {error && (
            <section className="admin-employee-record-section">
              <h2><ShieldCheck size={18} />Unable to load profile</h2>
              <p>{error}</p>
            </section>
          )}

          {!employee && !error && (
            <section className="admin-employee-record-section">
              <h2><ShieldCheck size={18} />Loading profile</h2>
              <p>Fetching employee record from the HRMS API.</p>
            </section>
          )}

          {employee && (
          <>

          <section className="admin-employee-record-header">
            <div className="admin-employee-record-identity">
              <span className="admin-employee-record-avatar">{employee.name.slice(0, 1)}</span>
              <div>
                <div className="admin-employee-record-code-row">
                  <span className="admin-employee-record-code">{employee.code}</span>
                  <span className={employeeStatusClass(employee.status)}>{statusLabel(employee.status)}</span>
                </div>
                <h1>{employee.name}</h1>
                <p className="admin-employee-record-title">
                  <BriefcaseBusiness size={16} />
                  {employee.role}
                </p>
              </div>
            </div>

            <aside className="admin-employee-record-readiness" aria-label="Profile readiness">
              <span className="admin-employee-record-readiness-label">
                <ShieldCheck size={16} />
                Profile Readiness
              </span>
              <span className="admin-employee-record-readiness-score">92%</span>
              <div className="admin-employee-record-readiness-track">
                <span className="admin-employee-record-readiness-fill" />
              </div>
              <p className="admin-employee-record-readiness-note">
                Statutory, bank, employment and document checks are available.
              </p>
            </aside>
          </section>

          <section className="admin-employee-record-strip" aria-label="Employee summary">
            <div className="admin-employee-record-stat"><span>Legal Entity</span><strong>{employee.entity}</strong></div>
            <div className="admin-employee-record-stat"><span>Department</span><strong>{employee.department}</strong></div>
            <div className="admin-employee-record-stat"><span>Grade / Band</span><strong>{employee.grade}</strong></div>
            <div className="admin-employee-record-stat"><span>Reporting Manager</span><strong>{employee.manager}</strong></div>
          </section>

          <section className="admin-employee-record-contact" aria-label="Contact details">
            <span className="admin-employee-record-contact-item"><Mail size={16} />{employee.email}</span>
            <span className="admin-employee-record-contact-item"><Phone size={16} />{employee.phone || '-'}</span>
            <span className="admin-employee-record-contact-item"><MapPin size={16} />{employee.location}</span>
            <span className="admin-employee-record-contact-item"><IdCard size={16} />{employee.type}</span>
          </section>

          <section className="admin-employee-record-grid">
            {profileSections(employee).map(({ title, icon: Icon, items }) => (
              <article className="admin-employee-record-section" key={title}>
                <h2><Icon size={18} />{title}</h2>
                <dl>
                  {items.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </section>
          </>
          )}
        </div>
      </section>
    </main>
  );
}
