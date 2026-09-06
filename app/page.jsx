'use client';

import { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  IdCard,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
} from 'lucide-react';
import HeroHeightSync from './components/HeroHeightSync';
import ProfileSections from './components/ProfileSections';
import SideNavigation from './components/SideNavigation';
import { formatDate, getEmployee, statusLabel } from './lib/hrmsApi';

const fallbackEmployee = {
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
  ['Reporting Manager', fallbackEmployee.manager],
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
  const [employee, setEmployee] = useState(fallbackEmployee);
  const [loadState, setLoadState] = useState('loading');

  useEffect(() => {
    getEmployee('EMP001245')
      .then((record) => {
        const profile = record.profile || {};
        setEmployee({
          ...fallbackEmployee,
          ...record,
          status: statusLabel(record.status),
          joined: formatDate(record.joinDate),
          workMode: profile.workMode || fallbackEmployee.workMode
        });
        setLoadState('ready');
      })
      .catch(() => setLoadState('offline'));
  }, []);

  const heroContacts = [
    { icon: Mail, label: employee.email },
    { icon: Phone, label: employee.phone },
    { icon: MapPin, label: employee.location },
    { icon: IdCard, label: employee.code }
  ];

  const heroOrgDetails = [
    ['Business Unit', employee.profile?.businessUnit || 'Digital Products'],
    ['Department', employee.department],
    ['Sub-Department', employee.profile?.team || 'HRMS Platform'],
    ['Cost Center', employee.profile?.costCenter || 'ENG-PLT-204'],
    ['Reporting Manager', employee.manager]
  ];

  const profile = employee.profile || {};
  const apiPersonalInfo = [
    ['Date of Birth', formatDate(profile.dateOfBirth) || '12 Aug 1993'],
    ['Gender', profile.gender || 'Male'],
    ['Marital Status', profile.maritalStatus || 'Married'],
    ['Blood Group', profile.bloodGroup || 'B+'],
    ['Nationality', profile.nationality || 'Indian'],
    ['Emergency Contact', profile.emergencyContact && profile.emergencyPhone ? `${profile.emergencyContact} · ${profile.emergencyPhone}` : 'Anita Sharma · +91 99887 77665']
  ];
  const apiEmployment = [
    ['Employee Type', employee.type],
    ['Work Mode', profile.workMode || 'Hybrid'],
    ['Probation Status', 'Confirmed'],
    ['Notice Period', profile.noticePeriod || '60 days'],
    ['Shift', profile.shift || 'General Shift'],
    ['Grade', employee.grade]
  ];
  const apiOrgUnit = [
    ['Business Unit', profile.businessUnit || 'Digital Products'],
    ['Department', employee.department],
    ['Team', profile.team || 'HRMS Platform'],
    ['Cost Center', profile.costCenter || 'ENG-PLT-204'],
    ['Reporting Manager', employee.manager],
    ['HR Partner', profile.hrPartner || 'Diya Rao']
  ];
  const apiDocuments = employee.documents?.length
    ? employee.documents.map((document) => [document.type, document.status, document.status === 'Verified' ? 'badge-success' : document.status === 'Pending' ? 'badge-warning' : 'badge-info'])
    : documents;

  return (
    <main className="app-shell-with-nav">
      <SideNavigation activePath="/" />
      <section className="profile-page">
        <HeroHeightSync />
        {loadState === 'offline' && (
          <div className="profile-content card">
            <strong>Using sample profile data until the HRMS API is available.</strong>
          </div>
        )}
        <section className="profile-hero card">
          <div className="profile-cover">
            <div className="profile-identity">
              <img src={employee.avatar} alt="" className="profile-avatar" />
              <div>
                <div className="profile-kicker">
                  <h1>{employee.name}</h1>
                  <span className="badge badge-info">WFH</span>
                </div>
                <p><BriefcaseBusiness size={16} />{employee.role}</p>
              </div>
            </div>
          </div>

          <div className="profile-summary-row">
            <div className="profile-contact-list">
              {heroContacts.map(({ icon: Icon, label }) => (
                <span key={label}><Icon size={17} />{label}</span>
              ))}
            </div>
            <div className="hero-actions">
              <a className="btn btn-secondary" href="/profile/edit">Edit</a>
              <button className="icon-btn" type="button" aria-label="More profile actions"><MoreVertical size={17} /></button>
            </div>
          </div>

          <div className="profile-org-grid">
            {heroOrgDetails.map(([label, value]) => (
              <div className="profile-org-item" key={label}>
                <small>{label}</small>
                {label === 'Reporting Manager' ? (
                  <span className="profile-manager">
                    <img src="https://i.pravatar.cc/48?img=47" alt="" />
                    <strong>{value}</strong>
                  </span>
                ) : (
                  <strong>{value}</strong>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="profile-layout">
        <ProfileSections
          employee={employee}
          personalInfo={apiPersonalInfo}
          employment={apiEmployment}
          orgUnit={apiOrgUnit}
          documents={apiDocuments}
          previousEmployment={profile.previousEmployment || previousEmployment}
          education={profile.education || education}
        />
        </section>
      </section>
    </main>
  );
}
