'use client';

import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Home as HomeIcon,
  IdCard,
  Landmark,
  UserRound,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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

function DefinitionGrid({ items }) {
  return (
    <dl className="definition-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

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

function AddressBlock({ includeOffice = false }) {
  return (
    <div className="address-block">
      {includeOffice && (
        <div>
          <h3>Office Location</h3>
          <p>Mumbai HQ · Digital Products floor</p>
        </div>
      )}
      <div>
        <h3>Current Address</h3>
        <p>Flat 1402, Orchid Heights, Powai, Mumbai, Maharashtra 400076</p>
      </div>
      <div>
        <h3>Permanent Address</h3>
        <p>45 Green Park Road, Jaipur, Rajasthan 302004</p>
      </div>
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
          <ChevronRight size={16} />
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

function SectionCard({ icon: Icon, title, id, onOpen, children }) {
  return (
    <section className="profile-section card" id={id}>
      <header className="section-header">
        <div>
          <span className="section-icon"><Icon size={18} /></span>
          <h2>{title}</h2>
        </div>
        <button
          className="section-arrow"
          type="button"
          aria-label={`Open ${title} details`}
          onClick={(event) => onOpen(id, event.currentTarget)}
        >
          <ChevronRight size={18} />
        </button>
      </header>
      {children}
    </section>
  );
}

function SectionDetailBody({ id, employee, personalInfo, employment, orgUnit, documents, previousEmployment, education }) {
  if (id === 'personal-info') {
    return (
      <DefinitionGrid items={[
        ['Employee Code', employee.code],
        ['Full Name', employee.name],
        ['Email', employee.email],
        ['Phone', employee.phone],
        ...personalInfo
      ]} />
    );
  }

  if (id === 'employment') {
    return (
      <DefinitionGrid items={[
        ['Role', employee.role],
        ['Department', employee.department],
        ['Joining Date', employee.joined],
        ['Employment Status', employee.status],
        ...employment
      ]} />
    );
  }

  if (id === 'organization-unit') return <DefinitionGrid items={orgUnit} />;
  if (id === 'location-address') return <AddressBlock includeOffice />;
  if (id === 'previous-employment') return <TimelineList items={previousEmployment} />;
  if (id === 'documents') return <DocumentGrid items={documents} />;
  if (id === 'bank-details') return <DefinitionGrid items={bankDetails} />;
  if (id === 'statutory-details') return <DefinitionGrid items={statutoryDetails} />;
  if (id === 'education-details') return <EducationList items={education} />;
  if (id === 'salary-details') return <SalaryGrid />;

  return null;
}

function SectionDetailModal({ sectionId, onClose, returnFocusTo, data }) {
  const modalRef = useRef(null);
  const section = sectionId ? sectionMeta[sectionId] : null;

  useEffect(() => {
    if (!section) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusTo.current?.focus();
    };
  }, [onClose, returnFocusTo, section]);

  if (!section) return null;

  const Icon = section.icon;

  return (
    <div
      className="section-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="section-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-modal-title"
        tabIndex={-1}
        ref={modalRef}
      >
        <header className="section-modal-header">
          <div>
            <span className="section-icon"><Icon size={18} /></span>
            <div>
              <p className="eyebrow">Section Details</p>
              <h2 id="section-modal-title">{section.title}</h2>
              <p>{section.summary}</p>
            </div>
          </div>
          <div className="section-modal-actions">
            <span className="badge badge-neutral">{section.status}</span>
            <button className="icon-btn" type="button" aria-label="Close details" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </header>
        <div className="section-modal-body">
          <SectionDetailBody id={sectionId} {...data} />
        </div>
      </section>
    </div>
  );
}

export default function ProfileSections(props) {
  const [selectedSection, setSelectedSection] = useState(null);
  const lastTriggerRef = useRef(null);

  const openSection = useCallback((id, trigger) => {
    lastTriggerRef.current = trigger;
    setSelectedSection(id);
  }, []);

  const closeSection = useCallback(() => {
    setSelectedSection(null);
  }, []);

  return (
    <>
      <div className="profile-content">
        <SectionCard icon={UserRound} title="Personal Info" id="personal-info" onOpen={openSection}>
          <DefinitionGrid items={props.personalInfo} />
        </SectionCard>

        <SectionCard icon={BriefcaseBusiness} title="Employment" id="employment" onOpen={openSection}>
          <DefinitionGrid items={props.employment} />
        </SectionCard>

        <SectionCard icon={Building2} title="Organization Unit" id="organization-unit" onOpen={openSection}>
          <DefinitionGrid items={props.orgUnit} />
        </SectionCard>

        <SectionCard icon={HomeIcon} title="Location/Address" id="location-address" onOpen={openSection}>
          <AddressBlock />
        </SectionCard>

        <SectionCard icon={ClipboardCheck} title="Previous Employment" id="previous-employment" onOpen={openSection}>
          <TimelineList items={props.previousEmployment} />
        </SectionCard>

        <SectionCard icon={FileCheck2} title="Documents" id="documents" onOpen={openSection}>
          <DocumentGrid items={props.documents} />
        </SectionCard>

        <SectionCard icon={Landmark} title="Bank Details" id="bank-details" onOpen={openSection}>
          <DefinitionGrid items={bankDetails} />
        </SectionCard>

        <SectionCard icon={IdCard} title="Statutory Details" id="statutory-details" onOpen={openSection}>
          <DefinitionGrid items={statutoryDetails} />
        </SectionCard>

        <SectionCard icon={GraduationCap} title="Education Details" id="education-details" onOpen={openSection}>
          <EducationList items={props.education} />
        </SectionCard>

        <SectionCard icon={CircleDollarSign} title="Salary Details" id="salary-details" onOpen={openSection}>
          <SalaryGrid />
        </SectionCard>
      </div>

      <SectionDetailModal
        sectionId={selectedSection}
        onClose={closeSection}
        returnFocusTo={lastTriggerRef}
        data={props}
      />
    </>
  );
}
