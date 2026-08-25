import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Edit3,
  FileCheck2,
  MapPin,
  ShieldCheck,
  UsersRound
} from 'lucide-react';
import HeroHeightSync from './components/HeroHeightSync';
import ProfileSections from './components/ProfileSections';
import SideNavigation from './components/SideNavigation';

const employee = {
  name: 'Rahul Sharma',
  code: 'EMP001245',
  role: 'Senior Software Engineer',
  department: 'Engineering',
  status: 'Active',
  type: 'Full Time',
  location: 'Mumbai HQ',
  manager: 'Sneha Iyer',
  joined: '15 Feb 2022',
  avatar: 'https://i.pravatar.cc/160?img=12',
  email: 'rahul.sharma@company.com',
  phone: '+91 98765 43210'
};

const personalInfo = [
  ['Date of Birth', '12 Aug 1993'],
  ['Gender', 'Male'],
  ['Marital Status', 'Married'],
  ['Blood Group', 'B+'],
  ['Nationality', 'Indian'],
  ['Emergency Contact', 'Anita Sharma · +91 99887 77665']
];

const employment = [
  ['Employee Type', 'Permanent'],
  ['Work Mode', 'Hybrid'],
  ['Probation Status', 'Confirmed'],
  ['Notice Period', '60 days'],
  ['Shift', 'General Shift'],
  ['Grade', 'G6']
];

const orgUnit = [
  ['Business Unit', 'Digital Products'],
  ['Department', 'Engineering'],
  ['Team', 'HRMS Platform'],
  ['Cost Center', 'ENG-PLT-204'],
  ['Reporting Manager', employee.manager],
  ['HR Partner', 'Diya Rao']
];

const documents = [
  ['Aadhaar Card', 'Verified', 'badge-success'],
  ['PAN Card', 'Verified', 'badge-success'],
  ['Offer Letter', 'Signed', 'badge-info'],
  ['Experience Letter', 'Pending', 'badge-warning']
];

const previousEmployment = [
  ['2020 - 2022', 'Product Engineer', 'Zentra Systems', 'Built internal workflow tools and employee self-service modules.'],
  ['2017 - 2020', 'Frontend Engineer', 'NovaCloud', 'Led interface development for SaaS admin products.']
];

const education = [
  ['B.Tech Computer Science', 'VJTI Mumbai', '2013 - 2017'],
  ['Higher Secondary', 'St. Xavier Junior College', '2011 - 2013']
];

export default function Home() {
  return (
    <main className="app-shell-with-nav">
      <SideNavigation activePath="/" />
      <section className="profile-page">
        <HeroHeightSync />
        <section className="profile-hero card">
        <div className="profile-identity">
          <img src={employee.avatar} alt="" className="profile-avatar" />
          <div>
            <div className="profile-kicker">
              <span className="badge badge-success">{employee.status}</span>
              <span>{employee.code}</span>
            </div>
            <h1>{employee.name}</h1>
            <p>{employee.role} · {employee.department}</p>
          </div>
        </div>
        <div className="hero-actions">
          <a className="btn btn-primary" href="/profile/edit"><Edit3 size={16} />Edit Profile</a>
        </div>
        </section>

        <section className="profile-layout">
        <aside className="profile-rail">
          <section className="card rail-card">
            <p className="eyebrow">Employee Snapshot</p>
            <div className="rail-list">
              <span><UsersRound size={16} /><strong>{employee.manager}</strong><small>Reporting Manager</small></span>
              <span><Building2 size={16} /><strong>{employee.department}</strong><small>Department</small></span>
              <span><MapPin size={16} /><strong>{employee.location}</strong><small>Location</small></span>
              <span><CalendarDays size={16} /><strong>{employee.joined}</strong><small>Joining Date</small></span>
              <span><BriefcaseBusiness size={16} /><strong>{employee.type}</strong><small>Employment Type</small></span>
            </div>
          </section>

          <section className="card rail-card">
            <p className="eyebrow">Readiness</p>
            <div className="readiness">
              <span><BadgeCheck size={17} />Profile 92%</span>
              <span><ShieldCheck size={17} />Statutory verified</span>
              <span><FileCheck2 size={17} />3 documents valid</span>
            </div>
          </section>
        </aside>

        <ProfileSections
          employee={employee}
          personalInfo={personalInfo}
          employment={employment}
          orgUnit={orgUnit}
          documents={documents}
          previousEmployment={previousEmployment}
          education={education}
        />
        </section>
      </section>
    </main>
  );
}
