import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  Filter,
  GraduationCap,
  Home,
  IdCard,
  Landmark,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound
} from 'lucide-react';
import AdminSideNavigation from '../components/AdminSideNavigation';

const employees = [
  { code: 'EMP001245', name: 'Rahul Sharma', role: 'Senior Software Engineer', department: 'Engineering', location: 'Mumbai HQ', status: 'Active', completeness: '92%' },
  { code: 'EMP001108', name: 'Sneha Iyer', role: 'Product Manager', department: 'Product', location: 'Bengaluru', status: 'Active', completeness: '88%' },
  { code: 'EMP000982', name: 'Amit Verma', role: 'UI/UX Designer', department: 'Design', location: 'Remote', status: 'On Leave', completeness: '81%' },
  { code: 'EMP000744', name: 'Pooja Singh', role: 'HR Executive', department: 'People Ops', location: 'Mumbai HQ', status: 'Active', completeness: '96%' },
  { code: 'EMP000512', name: 'Nikhil Nair', role: 'Finance Analyst', department: 'Finance', location: 'Delhi NCR', status: 'Inactive', completeness: '74%' }
];

const masterGroups = [
  {
    title: 'Organization Setup',
    icon: Building2,
    description: 'Legal entities, business units, departments, teams, designations, grades and cost centers.',
    count: '8 masters',
    health: 'Configured'
  },
  {
    title: 'Employment Setup',
    icon: BriefcaseBusiness,
    description: 'Employment types, employee statuses, work modes, shifts, probation and notice period options.',
    count: '7 masters',
    health: 'Needs review'
  },
  {
    title: 'Location Setup',
    icon: MapPin,
    description: 'Countries, states, cities, office locations, work location types and address categories.',
    count: '6 masters',
    health: 'Configured'
  },
  {
    title: 'Document Setup',
    icon: FileCheck2,
    description: 'Document types, mandatory flags, verification statuses, expiry rules and allowed file types.',
    count: '5 masters',
    health: 'Configured'
  },
  {
    title: 'Bank & Statutory Setup',
    icon: Landmark,
    description: 'Bank list, account types, statutory ID types, PF/ESI/PT applicability and tax regime options.',
    count: '6 masters',
    health: 'Needs review'
  },
  {
    title: 'Education & Experience Setup',
    icon: GraduationCap,
    description: 'Degree types, qualification levels, institution types and previous employment categories.',
    count: '4 masters',
    health: 'Configured'
  },
  {
    title: 'Salary Setup',
    icon: CircleDollarSign,
    description: 'Salary component types, pay frequencies, currency, visibility and profile summary rules.',
    count: '4 masters',
    health: 'Draft'
  }
];

const sectionReadiness = [
  ['Personal Info', 'Complete', UserRound],
  ['Employment', 'Complete', BriefcaseBusiness],
  ['Organization Unit', 'Complete', Building2],
  ['Location/Address', 'Complete', Home],
  ['Previous Employment', 'Needs verification', ClipboardList],
  ['Documents', '3 verified / 1 pending', FileCheck2],
  ['Bank Details', 'Masked', Banknote],
  ['Statutory Details', 'Verified', IdCard],
  ['Education Details', 'Complete', GraduationCap],
  ['Salary Details', 'Restricted', CircleDollarSign]
];

function statusClass(status) {
  if (status === 'Active' || status === 'Configured' || status === 'Complete') return 'badge-success';
  if (status === 'On Leave' || status === 'Needs review' || status === 'Needs verification' || status.includes('pending')) return 'badge-warning';
  if (status === 'Inactive' || status === 'Draft') return 'badge-neutral';
  return 'badge-info';
}

export default function AdminPage() {
  return (
    <main className="app-shell-with-nav">
      <style>{`
        :root {
          --admin-primary: #2563eb;
          --admin-primary-hover: #1d4ed8;
          --admin-primary-10: #eff6ff;
          --admin-border: #e5e7eb;
          --admin-page: #f7f9fc;
          --admin-text: #111827;
          --admin-muted: #6b7280;
          --admin-panel: #ffffff;
          --admin-radius: 8px;
          --admin-shadow: 0 2px 4px rgba(16, 24, 40, 0.08);
        }

        body {
          margin: 0;
          background: var(--admin-page);
          color: var(--admin-text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
          letter-spacing: 0;
        }

        .admin-shell {
          display: grid;
          grid-template-columns: 248px minmax(0, 1fr);
          min-height: 100vh;
          background: var(--admin-page);
        }

        .admin-sidebar {
          position: sticky;
          top: 0;
          align-self: start;
          display: grid;
          align-content: start;
          gap: 24px;
          min-height: 100vh;
          border-right: 1px solid var(--admin-border);
          background: var(--admin-panel);
          padding: 24px 16px;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--admin-text);
          text-decoration: none;
        }

        .admin-brand span {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: var(--admin-primary);
          color: white;
          font-weight: 800;
        }

        .admin-brand strong {
          font-size: 18px;
        }

        .admin-nav {
          display: grid;
          gap: 4px;
        }

        .admin-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 38px;
          border-radius: 6px;
          color: #374151;
          font-weight: 700;
          padding: 0 12px;
          text-decoration: none;
        }

        .admin-nav a.active,
        .admin-nav a:hover {
          background: var(--admin-primary-10);
          color: var(--admin-primary);
        }

        .admin-workspace {
          min-width: 0;
          padding: 24px;
        }

        .admin-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          max-width: 1480px;
          margin: 0 auto 24px;
        }

        .eyebrow {
          margin-bottom: 8px;
          color: var(--admin-primary);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .admin-header h1 {
          margin-bottom: 8px;
          font-size: 32px;
          line-height: 1.2;
        }

        .admin-header p:last-child,
        .panel-top p {
          margin-bottom: 0;
          color: var(--admin-muted);
          font-size: 14px;
        }

        .admin-actions,
        .panel-tools {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn,
        .contact-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 36px;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .btn-primary {
          background: var(--admin-primary);
          color: white;
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
        }

        .btn-primary:hover {
          background: var(--admin-primary-hover);
        }

        .btn-secondary {
          border-color: var(--admin-primary);
          background: white;
          color: var(--admin-primary);
        }

        .card {
          border: 1px solid var(--admin-border);
          border-radius: var(--admin-radius);
          background: var(--admin-panel);
          box-shadow: var(--admin-shadow);
        }

        .admin-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          max-width: 1480px;
          margin: 0 auto 16px;
        }

        .admin-metrics article {
          display: grid;
          gap: 8px;
          padding: 16px;
        }

        .admin-metrics svg {
          color: var(--admin-primary);
        }

        .admin-metrics span {
          color: var(--admin-muted);
          font-weight: 700;
        }

        .admin-metrics strong {
          font-size: 24px;
        }

        .admin-grid,
        .admin-bottom-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 16px;
          max-width: 1480px;
          margin: 0 auto 16px;
        }

        .admin-bottom-grid {
          grid-template-columns: 1.15fr 0.85fr;
        }

        .admin-panel {
          min-width: 0;
          padding: 20px;
        }

        .panel-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .panel-top h2 {
          margin-bottom: 4px;
          font-size: 20px;
          line-height: 1.2;
        }

        .admin-search {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 260px;
          min-height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: var(--admin-muted);
          padding: 0 12px;
        }

        .admin-search input {
          border: 0;
          outline: 0;
          min-width: 0;
          width: 100%;
        }

        .icon-btn {
          display: inline-grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
        }

        .admin-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
        }

        .admin-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .admin-table th,
        .admin-table td {
          border-bottom: 1px solid var(--admin-border);
          padding: 14px 16px;
          text-align: left;
          white-space: nowrap;
        }

        .admin-table th {
          background: #f8fafc;
          color: #374151;
          font-size: 12px;
          font-weight: 800;
        }

        .admin-table tr:last-child td {
          border-bottom: 0;
        }

        .admin-table td:first-child {
          display: grid;
          gap: 4px;
        }

        .admin-table td:first-child span {
          color: var(--admin-muted);
          font-size: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .badge-success {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-warning {
          background: #ffedd5;
          color: #c2410c;
        }

        .badge-neutral {
          background: #e5e7eb;
          color: #374151;
        }

        .badge-info {
          background: #e0f2fe;
          color: #0369a1;
        }

        .selected-profile {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .selected-profile img {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          object-fit: cover;
        }

        .selected-profile h2 {
          margin: 8px 0 4px;
          font-size: 20px;
        }

        .selected-profile p {
          margin-bottom: 0;
          color: var(--admin-muted);
        }

        .compact-definition {
          display: grid;
          gap: 12px;
          margin: 0 0 16px;
        }

        .compact-definition div {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid var(--admin-border);
          padding-bottom: 12px;
        }

        .compact-definition dt {
          color: var(--admin-muted);
          font-weight: 700;
        }

        .compact-definition dd {
          margin: 0;
          font-weight: 800;
          text-align: right;
        }

        .master-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .master-card {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: start;
          gap: 12px;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          background: #fbfdff;
          padding: 16px;
        }

        .section-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: var(--admin-primary-10);
          color: var(--admin-primary);
        }

        .master-card h3 {
          margin-bottom: 4px;
          font-size: 14px;
        }

        .master-card p {
          margin-bottom: 12px;
          color: var(--admin-muted);
        }

        .master-card div div {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .master-card div div > span:first-child {
          color: var(--admin-muted);
          font-weight: 700;
        }

        .section-readiness,
        .governance-list {
          display: grid;
          gap: 8px;
        }

        .section-readiness div {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          min-height: 40px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: #fbfdff;
          padding: 0 12px;
        }

        .section-readiness svg,
        .governance-list svg {
          color: var(--admin-primary);
        }

        .section-readiness span {
          font-weight: 700;
        }

        .section-readiness strong {
          color: #f59e0b;
          font-size: 12px;
        }

        .section-readiness strong.good {
          color: #16a34a;
        }

        .governance-list span {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 42px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          background: #fbfdff;
          padding: 0 12px;
          color: #374151;
          font-weight: 700;
        }

        @media (max-width: 1180px) {
          .admin-shell,
          .admin-grid,
          .admin-bottom-grid {
            grid-template-columns: 1fr;
          }

          .admin-sidebar {
            position: static;
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid var(--admin-border);
          }

          .admin-nav {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .admin-workspace {
            padding: 12px;
          }

          .admin-header,
          .panel-top {
            display: grid;
          }

          .admin-actions,
          .panel-tools {
            justify-content: stretch;
          }

          .admin-metrics,
          .master-grid {
            grid-template-columns: 1fr;
          }

          .admin-search {
            width: 100%;
          }

          .admin-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
      <AdminSideNavigation activePath="/admin" />

      <section className="admin-workspace">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Core HR Admin</p>
            <h1>Employee data control center</h1>
            <p>Manage employee records and the masters that power profile fields across tenants.</p>
          </div>
          <div className="admin-actions">
            <button className="btn btn-secondary" type="button"><Settings2 size={16} />Configure</button>
            <button className="btn btn-primary" type="button"><Plus size={16} />Add Employee</button>
          </div>
        </header>

        <section className="admin-metrics" aria-label="Core HR metrics">
          <article className="card"><UsersRound size={20} /><span>Total Employees</span><strong>248</strong></article>
          <article className="card"><BadgeCheck size={20} /><span>Profile Readiness</span><strong>91%</strong></article>
          <article className="card"><FileCheck2 size={20} /><span>Pending Documents</span><strong>14</strong></article>
          <article className="card"><ShieldCheck size={20} /><span>Verified Statutory</span><strong>96%</strong></article>
        </section>

        <section className="admin-grid">
          <article className="card admin-panel employee-panel" id="employees">
            <div className="panel-top">
              <div>
                <h2>Employee Directory</h2>
                <p>Search and maintain Core HR employee profile records.</p>
              </div>
              <div className="panel-tools">
                <label className="admin-search">
                  <Search size={16} />
                  <input placeholder="Search employees" />
                </label>
                <button className="icon-btn" type="button" aria-label="Filter employees"><Filter size={16} /></button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Profile</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.code}>
                      <td>
                        <strong>{employee.name}</strong>
                        <span>{employee.code} · {employee.role}</span>
                      </td>
                      <td>{employee.department}</td>
                      <td>{employee.location}</td>
                      <td><span className={`badge ${statusClass(employee.status)}`}>{employee.status}</span></td>
                      <td>{employee.completeness}</td>
                      <td><button className="icon-btn" type="button" aria-label={`Open actions for ${employee.name}`}><MoreHorizontal size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="card admin-panel employee-detail">
            <div className="selected-profile">
              <img src="https://i.pravatar.cc/160?img=12" alt="" />
              <div>
                <span className="badge badge-success">Active</span>
                <h2>Rahul Sharma</h2>
                <p>Senior Software Engineer · EMP001245</p>
              </div>
            </div>
            <dl className="compact-definition">
              <div><dt>Manager</dt><dd>Sneha Iyer</dd></div>
              <div><dt>Department</dt><dd>Engineering</dd></div>
              <div><dt>Joining Date</dt><dd>15 Feb 2022</dd></div>
              <div><dt>Tenant</dt><dd>Network18 Demo</dd></div>
            </dl>
            <a className="btn btn-secondary" href="/">View Profile</a>
          </aside>
        </section>

        <section className="card admin-panel" id="masters">
          <div className="panel-top">
            <div>
              <h2>Core HR Masters</h2>
              <p>Frontend-only master modules required to control selectable fields on employee profiles.</p>
            </div>
            <button className="btn btn-secondary" type="button"><Plus size={16} />New Master Value</button>
          </div>
          <div className="master-grid">
            {masterGroups.map(({ title, icon: Icon, description, count, health }) => (
              <article className="master-card" key={title}>
                <span className="section-icon"><Icon size={18} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div>
                    <span>{count}</span>
                    <span className={`badge ${statusClass(health)}`}>{health}</span>
                  </div>
                </div>
                <ChevronRight size={17} />
              </article>
            ))}
          </div>
        </section>

        <section className="admin-bottom-grid">
          <article className="card admin-panel" id="sections">
            <div className="panel-top">
              <div>
                <h2>Profile Section Control</h2>
                <p>Monitor which sections are complete, masked, verified or restricted.</p>
              </div>
            </div>
            <div className="section-readiness">
              {sectionReadiness.map(([name, status, Icon]) => (
                <div key={name}>
                  <Icon size={17} />
                  <span>{name}</span>
                  <strong className={status.includes('Complete') || status.includes('Verified') ? 'good' : ''}>{status}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card admin-panel" id="governance">
            <div className="panel-top">
              <div>
                <h2>Governance Queue</h2>
                <p>Static preview of the checks that would matter before database workflows are added.</p>
              </div>
            </div>
            <div className="governance-list">
              <span><CheckCircle2 size={17} />Tenant isolation planned for all records</span>
              <span><ShieldCheck size={17} />Sensitive profile fields masked by default</span>
              <span><CalendarDays size={17} />Profile and master change audits required later</span>
              <span><FileCheck2 size={17} />Document expiry and verification rules prepared</span>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
