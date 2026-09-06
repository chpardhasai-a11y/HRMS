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

const bankDetails = [
  ['Bank Name', 'HDFC Bank'],
  ['Account Number', '•••• •••• 7421'],
  ['IFSC Code', 'HDFC0001234'],
  ['Account Type', 'Salary Account']
];

const statutoryDetails = [
  ['PAN', 'ABCDE••••F'],
  ['Aadhaar', '•••• •••• 3921'],
  ['UAN', '1004•••••921'],
  ['PF Number', 'MH/BAN/••••/042']
];

const salaryItems = [
  ['Annual CTC', '₹24,00,000', 'Effective Apr 2026'],
  ['Monthly Gross', '₹2,00,000', 'Before deductions'],
  ['Payroll Status', 'Active', 'Current cycle eligible']
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
    status: 'Reviewed',
    summary: 'Prior work experience and role history.',
    icon: ClipboardCheck
  },
  documents: {
    title: 'Documents',
    status: '3 valid',
    summary: 'Identity and employment document verification status.',
    icon: FileCheck2
  },
  'bank-details': {
    title: 'Bank Details',
    status: 'Masked',
    summary: 'Salary account information with sensitive values hidden.',
    icon: Landmark
  },
  'statutory-details': {
    title: 'Statutory Details',
    status: 'Verified',
    summary: 'Government and payroll statutory identifiers.',
    icon: IdCard
  },
  'education-details': {
    title: 'Education Details',
    status: 'Complete',
    summary: 'Highest qualifications and academic history.',
    icon: GraduationCap
  },
  'salary-details': {
    title: 'Salary Details',
    status: 'Restricted',
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

const sectionDetails = {
  'personal-info': {
    rows: [
      ['Date of Birth', '12 Aug 1993'],
      ['Blood Group', 'B+'],
      ['Gender', 'Male'],
      ['Nationality', 'Indian'],
      ['Marital Status', 'Married'],
      ['Languages Known', 'English, Hindi']
    ]
  },
  employment: {
    rows: [
      ['Employee Type', 'Permanent'],
      ['Employment Status', 'Active'],
      ['Work Mode', 'Hybrid'],
      ['Notice Period', '60 days'],
      ['Joining Date', '15 Feb 2022'],
      ['Grade', 'G6']
    ]
  },
  'organization-unit': {
    rows: [
      ['Business Unit', 'Digital Products'],
      ['Department', 'Engineering'],
      ['Team', 'HRMS Platform'],
      ['Designation', 'Senior Software Engineer'],
      ['Reporting Manager', 'Sneha Iyer'],
      ['Cost Center', 'ENG-PLT-204']
    ]
  },
  'location-address': {
    addresses: [
      ['Current Address', 'Primary', 'Flat 1402, Orchid Heights, Powai, Mumbai, Maharashtra 400076'],
      ['Permanent Address', '', '45 Green Park Road, Jaipur, Rajasthan 302004']
    ]
  },
  'previous-employment': {
    timeline: true
  },
  documents: {
    documents: true
  },
  'bank-details': {
    rows: bankDetails
  },
  'statutory-details': {
    rows: statutoryDetails
  },
  'education-details': {
    education: true
  },
  'salary-details': {
    salary: true
  }
};

function SalaryGrid() {
  return (
    <div className="salary-grid">
      {salaryItems.map(([label, value, note]) => (
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
  return (
    <div className="timeline-list">
      {items.map(([period, role, company, description]) => (
        <article key={company}>
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
  return (
    <div className="document-grid">
      {items.map(([name, status, tone]) => (
        <article className="document-card" key={name}>
          <FileCheck2 size={20} />
          <div>
            <h3>{name}</h3>
            <span className={`badge ${tone}`}>{status}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function EducationList({ items }) {
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
  const details = { ...sectionDetails[id] };
  const Icon = section.icon;
  const profile = data.employee?.profile || {};

  if (id === 'personal-info') details.rows = data.personalInfo;
  if (id === 'employment') details.rows = data.employment;
  if (id === 'organization-unit') details.rows = data.orgUnit;
  if (id === 'location-address' && (profile.currentAddress || profile.permanentAddress)) {
    details.addresses = [
      ['Current Address', 'Primary', profile.currentAddress],
      ['Permanent Address', '', profile.permanentAddress]
    ].filter(([, , value]) => value);
  }
  if (id === 'bank-details' && profile.bankDetails) details.rows = profile.bankDetails;
  if (id === 'statutory-details' && profile.statutoryDetails) details.rows = profile.statutoryDetails;

  return (
    <section className="profile-section-panel" id={id}>
      <header className="profile-section-panel-header">
        <div>
          <span className="section-icon"><Icon size={18} /></span>
          <h2>{section.title}</h2>
        </div>
      </header>
      {details.rows && <DetailRows items={details.rows} />}
      {details.addresses && <AddressRows items={details.addresses} />}
      {details.timeline && <TimelineList items={data.previousEmployment} />}
      {details.documents && <DocumentGrid items={data.documents} />}
      {details.education && <EducationList items={data.education} />}
      {details.salary && <SalaryGrid />}
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
