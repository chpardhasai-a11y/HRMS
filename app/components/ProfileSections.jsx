'use client';

import {
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Home as HomeIcon,
  IdCard,
  Landmark,
  UserRound
} from 'lucide-react';
import { useState } from 'react';

const bankDetailsFallback = [
  ['Bank Name', 'Not Provided'],
  ['Account Number', 'Not Provided'],
  ['IFSC Code', 'Not Provided'],
  ['Account Type', 'Not Provided']
];

const statutoryDetailsFallback = [
  ['PAN', 'Not Provided'],
  ['Aadhaar', 'Not Provided'],
  ['UAN', 'Not Provided'],
  ['PF Number', 'Not Provided']
];

const salaryItemsFallback = [
  ['Annual CTC', 'Not Configured', 'Pending HR / Payroll setup'],
  ['Monthly Gross', 'Not Configured', 'Pending HR / Payroll setup'],
  ['Payroll Status', 'Pending', 'Awaiting first payroll cycle']
];

const sectionMeta = {
  'personal-info': {
    title: 'Personal Info',
    status: 'Complete',
    summary: 'Identity, contact and emergency records.',
    icon: UserRound
  },
  employment: {
    title: 'Employment',
    status: 'Active',
    summary: 'Current employment type, status, work mode and grade.',
    icon: BriefcaseBusiness
  },
  'organization-unit': {
    title: 'Organization Unit',
    status: 'Mapped',
    summary: 'Business hierarchy, manager and HR ownership.',
    icon: Building2
  },
  'location-address': {
    title: 'Location/Address',
    status: 'Verified',
    summary: 'Office location and residential address records.',
    icon: HomeIcon
  },
  'previous-employment': {
    title: 'Previous Employment',
    status: 'Records',
    summary: 'Prior work experience and role history.',
    icon: ClipboardCheck
  },
  documents: {
    title: 'Documents',
    status: 'Verification',
    summary: 'Identity and employment document verification status.',
    icon: FileCheck2
  },
  'bank-details': {
    title: 'Bank Details',
    status: 'Salary Account',
    summary: 'Salary account information for payroll.',
    icon: Landmark
  },
  'statutory-details': {
    title: 'Statutory Details',
    status: 'Tax / Statutory',
    summary: 'Government and payroll statutory identifiers.',
    icon: IdCard
  },
  'education-details': {
    title: 'Education Details',
    status: 'Academic',
    summary: 'Highest qualifications and academic history.',
    icon: GraduationCap
  },
  'salary-details': {
    title: 'Salary Details',
    status: 'Compensation',
    summary: 'Compensation summary for the current payroll cycle.',
    icon: CircleDollarSign
  }
};

const profileTabs = [
  {
    id: 'about',
    label: 'About',
    sections: ['personal-info', 'location-address']
  },
  {
    id: 'job',
    label: 'Job',
    sections: ['employment', 'organization-unit']
  },
  {
    id: 'documents',
    label: 'Documents',
    sections: ['documents', 'statutory-details']
  },
  {
    id: 'finance',
    label: 'Finance',
    sections: ['bank-details', 'salary-details']
  },
  {
    id: 'history',
    label: 'History',
    sections: ['previous-employment', 'education-details']
  }
];

function SalaryGrid({ items }) {
  const list = Array.isArray(items) && items.length > 0 ? items : salaryItemsFallback;
  return (
    <div className="salary-grid">
      {list.map(([label, value, note]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </article>
      ))}
    </div>
  );
}

function TimelineList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div style={{ padding: '16px 0', color: '#64748b', fontSize: '13px' }}>
        No previous employment records added. Click Edit Profile to add previous experience.
      </div>
    );
  }
  return (
    <div className="timeline-list">
      {items.map(([period, role, company, description]) => (
        <article key={company || role}>
          <span>{period}</span>
          <div>
            <h3>{role}</h3>
            <strong>{company}</strong>
            <p>{description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function DocumentGrid({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div style={{ padding: '16px 0', color: '#64748b', fontSize: '13px' }}>
        No statutory documents uploaded yet.
      </div>
    );
  }
  return (
    <div className="document-grid">
      {items.map(([name, status, tone]) => (
        <article className="document-card" key={name}>
          <FileCheck2 size={20} />
          <div>
            <h3>{name}</h3>
            <span className={`badge ${tone || 'badge-neutral'}`}>{status}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function EducationList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div style={{ padding: '16px 0', color: '#64748b', fontSize: '13px' }}>
        No education records added. Click Edit Profile to add academic details.
      </div>
    );
  }
  return (
    <div className="education-list">
      {items.map(([degree, institute, years]) => (
        <article key={degree}>
          <h3>{degree}</h3>
          <p>{institute}</p>
          <span>{years}</span>
        </article>
      ))}
    </div>
  );
}

function DetailRows({ items }) {
  return (
    <dl className="section-detail-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AddressRows({ items }) {
  return (
    <div className="section-address-grid">
      {items.map(([label, badge, value]) => (
        <article key={label}>
          <h3>{label} {badge && <span className="badge badge-success">{badge}</span>}</h3>
          <p>{value}</p>
        </article>
      ))}
    </div>
  );
}

function ProfileSectionPanel({ id, data }) {
  const section = sectionMeta[id];
  const Icon = section.icon;
  const profile = data.employee?.profile || {};
  let rows = null;
  let addresses = null;
  let isTimeline = false;
  let isDocuments = false;
  let isEducation = false;
  let isSalary = false;

  if (id === 'personal-info') rows = data.personalInfo;
  else if (id === 'employment') rows = data.employment;
  else if (id === 'organization-unit') rows = data.orgUnit;
  else if (id === 'location-address') {
    addresses = [
      ['Current Address', 'Primary', profile.currentAddress || 'Not Provided'],
      ['Permanent Address', '', profile.permanentAddress || 'Not Provided']
    ];
  } else if (id === 'bank-details') {
    rows = profile.bankDetails && Array.isArray(profile.bankDetails) && profile.bankDetails.length > 0
      ? profile.bankDetails
      : bankDetailsFallback;
  } else if (id === 'statutory-details') {
    rows = profile.statutoryDetails && Array.isArray(profile.statutoryDetails) && profile.statutoryDetails.length > 0
      ? profile.statutoryDetails
      : statutoryDetailsFallback;
  } else if (id === 'previous-employment') {
    isTimeline = true;
  } else if (id === 'documents') {
    isDocuments = true;
  } else if (id === 'education-details') {
    isEducation = true;
  } else if (id === 'salary-details') {
    isSalary = true;
  }

  return (
    <section className="profile-section-panel" id={id}>
      <header className="profile-section-panel-header">
        <div>
          <span className="section-icon"><Icon size={18} /></span>
          <h2>{section.title}</h2>
        </div>
      </header>
      {rows && <DetailRows items={rows} />}
      {addresses && <AddressRows items={addresses} />}
      {isTimeline && <TimelineList items={data.previousEmployment} />}
      {isDocuments && <DocumentGrid items={data.documents} />}
      {isEducation && <EducationList items={data.education} />}
      {isSalary && <SalaryGrid items={profile.salaryDetails} />}
    </section>
  );
}

export default function ProfileSections(props) {
  const [activeTab, setActiveTab] = useState(profileTabs[0].id);
  const activeSections = profileTabs.find((tab) => tab.id === activeTab)?.sections ?? profileTabs[0].sections;

  return (
    <>
      <nav className="profile-tabs" role="tablist" aria-label="Profile section groups">
        {profileTabs.map((tab) => (
          <button
            className={tab.id === activeTab ? 'active' : undefined}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="profile-content card">
        <div className="profile-section-stack">
          {activeSections.map((sectionId) => (
            <ProfileSectionPanel id={sectionId} data={props} key={sectionId} />
          ))}
        </div>
      </div>
    </>
  );
}
