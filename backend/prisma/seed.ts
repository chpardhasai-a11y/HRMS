import { PrismaClient, EmployeeStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

const employees = [
  { code: 'EMP001245', name: 'Rahul Sharma', role: 'Senior Software Engineer', department: 'Engineering', entity: 'Network18 Media', location: 'Mumbai HQ', manager: 'Sneha Iyer', status: EmployeeStatus.Active, type: 'Permanent', grade: 'G7', joinDate: '2022-02-15', phone: '+91 98765 43210', email: 'rahul.sharma@nw18.com' },
  { code: 'EMP001108', name: 'Sneha Iyer', role: 'Product Manager', department: 'Product', entity: 'Network18 Digital', location: 'Bengaluru', manager: 'Ananya Rao', status: EmployeeStatus.Active, type: 'Permanent', grade: 'G8', joinDate: '2020-07-03', phone: '+91 98765 43211', email: 'sneha.iyer@nw18.com' },
  { code: 'EMP000982', name: 'Amit Verma', role: 'UI/UX Designer', department: 'Design', entity: 'Network18 Digital', location: 'Remote', manager: 'Sneha Iyer', status: EmployeeStatus.OnLeave, type: 'Permanent', grade: 'G6', joinDate: '2021-10-19', phone: '+91 98765 43212', email: 'amit.verma@nw18.com' },
  { code: 'EMP000744', name: 'Pooja Singh', role: 'HR Executive', department: 'People Ops', entity: 'TV18 Broadcast', location: 'Mumbai HQ', manager: 'Meera Kapoor', status: EmployeeStatus.Active, type: 'Permanent', grade: 'G5', joinDate: '2023-01-11', phone: '+91 98765 43213', email: 'pooja.singh@nw18.com' },
  { code: 'EMP000512', name: 'Nikhil Nair', role: 'Finance Analyst', department: 'Finance', entity: 'TV18 Broadcast', location: 'Delhi NCR', manager: 'Vikram Sethi', status: EmployeeStatus.Inactive, type: 'Contract', grade: 'C3', joinDate: '2019-04-22', phone: '+91 98765 43214', email: 'nikhil.nair@nw18.com' }
];

const initialIndustries = [
  { name: 'Media & Broadcast', code: 'MEDIA_BROADCAST', category: 'Media & Entertainment', description: 'Television, radio, print, digital publishing, and broadcasting networks.' },
  { name: 'Film & Entertainment', code: 'FILM_ENTERTAINMENT', category: 'Media & Entertainment', description: 'Film production, music streaming, cinema, and live events.' },
  { name: 'Information Technology & Services', code: 'IT_SERVICES', category: 'Technology', description: 'IT consulting, managed services, system integration, and software development.' },
  { name: 'Software & SaaS', code: 'SOFTWARE_SAAS', category: 'Technology', description: 'Enterprise software, cloud SaaS platforms, and digital applications.' },
  { name: 'Cybersecurity', code: 'CYBERSECURITY', category: 'Technology', description: 'Information security, threat detection, network defense, and compliance.' },
  { name: 'Artificial Intelligence & Data', code: 'AI_DATA', category: 'Technology', description: 'AI, machine learning, big data analytics, and data infrastructure.' },
  { name: 'Telecommunications', code: 'TELECOM', category: 'Technology', description: 'Mobile wireless networks, fiber infrastructure, and ISP services.' },
  { name: 'Banking & Financial Services', code: 'BANKING_FINANCE', category: 'Finance & Banking', description: 'Commercial banking, retail banking, wealth management, and credit services.' },
  { name: 'Fintech & Digital Payments', code: 'FINTECH', category: 'Finance & Banking', description: 'Digital wallets, payment gateways, robo-advisors, and neobanking.' },
  { name: 'Insurance & Insurtech', code: 'INSURANCE', category: 'Finance & Banking', description: 'Life, health, property & casualty insurance, and risk underwriting.' },
  { name: 'Investment Banking & Capital Markets', code: 'CAPITAL_MARKETS', category: 'Finance & Banking', description: 'Stock brokerages, private equity, venture capital, and asset management.' },
  { name: 'Healthcare Services & Hospitals', code: 'HEALTHCARE', category: 'Healthcare & Life Sciences', description: 'Hospitals, clinics, telemedicine, and healthcare provider operations.' },
  { name: 'Pharmaceuticals & Life Sciences', code: 'PHARMA', category: 'Healthcare & Life Sciences', description: 'Drug discovery, clinical trials, formulation, and pharmacy manufacturing.' },
  { name: 'Biotechnology & Medical Devices', code: 'BIOTECH_MEDTECH', category: 'Healthcare & Life Sciences', description: 'Genetic engineering, diagnostics, and medical device technology.' },
  { name: 'Automotive & Mobility', code: 'AUTOMOTIVE', category: 'Manufacturing & Industrial', description: 'Electric vehicles, OEM manufacturing, auto components, and fleet mobility.' },
  { name: 'Aerospace & Defense', code: 'AEROSPACE_DEFENSE', category: 'Manufacturing & Industrial', description: 'Avionics, defense equipment, space technology, and aircraft engineering.' },
  { name: 'Electronics & Semiconductor Manufacturing', code: 'SEMICONDUCTORS', category: 'Manufacturing & Industrial', description: 'Semiconductor fabrication, microchips, and hardware manufacturing.' },
  { name: 'Consumer Goods (FMCG)', code: 'FMCG', category: 'Retail & Consumer', description: 'Packaged foods, beverages, personal care, and household consumer goods.' },
  { name: 'Retail & E-Commerce', code: 'RETAIL_ECOMMERCE', category: 'Retail & Consumer', description: 'Online marketplaces, retail chains, and direct-to-consumer brands.' },
  { name: 'Apparel & Fashion', code: 'APPAREL_FASHION', category: 'Retail & Consumer', description: 'Textile manufacturing, fashion apparel, footwear, and luxury goods.' },
  { name: 'Construction & Real Estate', code: 'REAL_ESTATE', category: 'Real Estate & Infrastructure', description: 'Commercial & residential real estate development, contracting, and property management.' },
  { name: 'Civil Engineering & Infrastructure', code: 'INFRASTRUCTURE', category: 'Real Estate & Infrastructure', description: 'Highways, smart cities, bridges, and public infrastructure projects.' },
  { name: 'Higher Education & EdTech', code: 'EDUCATION_EDTECH', category: 'Education & Public Sector', description: 'Universities, colleges, online learning platforms, and skill training.' },
  { name: 'Government & Public Administration', code: 'GOVERNMENT', category: 'Education & Public Sector', description: 'Public sector undertakings, civic governance, and municipal bodies.' },
  { name: 'Renewable Energy & CleanTech', code: 'RENEWABLE_ENERGY', category: 'Energy & Utilities', description: 'Solar, wind, hydro energy, EV charging, and clean energy tech.' },
  { name: 'Oil, Gas & Energy Utilities', code: 'OIL_GAS_UTILITIES', category: 'Energy & Utilities', description: 'Petroleum refining, natural gas distribution, and electric utilities.' },
  { name: 'Logistics & Supply Chain', code: 'LOGISTICS', category: 'Transport & Logistics', description: 'Freight forwarding, warehousing, 3PL logistics, and cold chain shipping.' },
  { name: 'Aviation & Maritime', code: 'AVIATION_MARITIME', category: 'Transport & Logistics', description: 'Commercial airlines, cargo shipping, port logistics, and aviation operations.' },
  { name: 'Hospitality, Travel & Tourism', code: 'HOSPITALITY', category: 'Services', description: 'Hotels, resorts, travel agencies, and leisure services.' },
  { name: 'Food & Beverage Services', code: 'FOOD_BEVERAGE', category: 'Services', description: 'Restaurant chains, cloud kitchens, and food delivery services.' },
  { name: 'Management Consulting & Legal Services', code: 'CONSULTING_LEGAL', category: 'Services', description: 'Strategy consulting, legal advisory, tax audit, and corporate compliance.' },
  { name: 'Agriculture & AgriTech', code: 'AGRICULTURE', category: 'Agriculture & Mining', description: 'Farming, precision agritech, crop protection, and food processing.' },
  { name: 'Mining & Metals', code: 'MINING_METALS', category: 'Agriculture & Mining', description: 'Metal ore mining, steel production, and mineral extraction.' }
];

const initialCountries = [
  { name: 'India', code: 'IN', code3: 'IND', phoneCode: '+91', region: 'Asia' },
  { name: 'United States', code: 'US', code3: 'USA', phoneCode: '+1', region: 'North America' },
  { name: 'United Kingdom', code: 'GB', code3: 'GBR', phoneCode: '+44', region: 'Europe' },
  { name: 'United Arab Emirates', code: 'AE', code3: 'ARE', phoneCode: '+971', region: 'Middle East' },
  { name: 'Singapore', code: 'SG', code3: 'SGP', phoneCode: '+65', region: 'Asia' },
  { name: 'Germany', code: 'DE', code3: 'DEU', phoneCode: '+49', region: 'Europe' },
  { name: 'Australia', code: 'AU', code3: 'AUS', phoneCode: '+61', region: 'Oceania' },
  { name: 'Canada', code: 'CA', code3: 'CAN', phoneCode: '+1', region: 'North America' },
  { name: 'Japan', code: 'JP', code3: 'JPN', phoneCode: '+81', region: 'Asia' },
  { name: 'France', code: 'FR', code3: 'FRA', phoneCode: '+33', region: 'Europe' },
  { name: 'Netherlands', code: 'NL', code3: 'NLD', phoneCode: '+31', region: 'Europe' },
  { name: 'Switzerland', code: 'CH', code3: 'CHE', phoneCode: '+41', region: 'Europe' },
  { name: 'Saudi Arabia', code: 'SA', code3: 'SAU', phoneCode: '+966', region: 'Middle East' },
  { name: 'Brazil', code: 'BR', code3: 'BRA', phoneCode: '+55', region: 'South America' },
  { name: 'South Africa', code: 'ZA', code3: 'ZAF', phoneCode: '+27', region: 'Africa' },
  { name: 'Malaysia', code: 'MY', code3: 'MYS', phoneCode: '+60', region: 'Asia' },
  { name: 'Philippines', code: 'PH', code3: 'PHL', phoneCode: '+63', region: 'Asia' },
  { name: 'South Korea', code: 'KR', code3: 'KOR', phoneCode: '+82', region: 'Asia' },
  { name: 'Indonesia', code: 'ID', code3: 'IDN', phoneCode: '+62', region: 'Asia' },
  { name: 'Mexico', code: 'MX', code3: 'MEX', phoneCode: '+52', region: 'North America' }
];

const initialCurrencies = [
  { name: 'Indian Rupee', code: 'INR', symbol: '₹', decimalDigits: 2 },
  { name: 'US Dollar', code: 'USD', symbol: '$', decimalDigits: 2 },
  { name: 'Euro', code: 'EUR', symbol: '€', decimalDigits: 2 },
  { name: 'British Pound', code: 'GBP', symbol: '£', decimalDigits: 2 },
  { name: 'UAE Dirham', code: 'AED', symbol: 'AED', decimalDigits: 2 },
  { name: 'Singapore Dollar', code: 'SGD', symbol: 'S$', decimalDigits: 2 },
  { name: 'Australian Dollar', code: 'AUD', symbol: 'A$', decimalDigits: 2 },
  { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$', decimalDigits: 2 },
  { name: 'Japanese Yen', code: 'JPY', symbol: '¥', decimalDigits: 0 },
  { name: 'Swiss Franc', code: 'CHF', symbol: 'CHF', decimalDigits: 2 },
  { name: 'Saudi Riyal', code: 'SAR', symbol: 'SAR', decimalDigits: 2 },
  { name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM', decimalDigits: 2 },
  { name: 'Philippine Peso', code: 'PHP', symbol: '₱', decimalDigits: 2 },
  { name: 'South Korean Won', code: 'KRW', symbol: '₩', decimalDigits: 0 },
  { name: 'Brazilian Real', code: 'BRL', symbol: 'R$', decimalDigits: 2 },
  { name: 'South African Rand', code: 'ZAR', symbol: 'R', decimalDigits: 2 }
];

const initialTimeZones = [
  { name: 'Asia/Kolkata', code: 'IST', offset: '+05:30', region: 'Asia' },
  { name: 'UTC', code: 'UTC', offset: '+00:00', region: 'Global' },
  { name: 'America/New_York', code: 'EST', offset: '-05:00', region: 'Americas' },
  { name: 'America/Los_Angeles', code: 'PST', offset: '-08:00', region: 'Americas' },
  { name: 'Europe/London', code: 'GMT', offset: '+00:00', region: 'Europe' },
  { name: 'Europe/Paris', code: 'CET', offset: '+01:00', region: 'Europe' },
  { name: 'Asia/Dubai', code: 'GST', offset: '+04:00', region: 'Middle East' },
  { name: 'Asia/Singapore', code: 'SGT', offset: '+08:00', region: 'Asia' },
  { name: 'Australia/Sydney', code: 'AEST', offset: '+10:00', region: 'Australia' },
  { name: 'Asia/Tokyo', code: 'JST', offset: '+09:00', region: 'Asia' }
];

async function main() {
  for (const ind of initialIndustries) {
    await prisma.industry.upsert({
      where: { code: ind.code },
      update: { name: ind.name, category: ind.category, description: ind.description },
      create: { name: ind.name, code: ind.code, category: ind.category, description: ind.description, isActive: true }
    });
  }

  for (const c of initialCountries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name, code3: c.code3, phoneCode: c.phoneCode, region: c.region },
      create: { name: c.name, code: c.code, code3: c.code3, phoneCode: c.phoneCode, region: c.region, isActive: true }
    });
  }

  for (const cur of initialCurrencies) {
    await prisma.currency.upsert({
      where: { code: cur.code },
      update: { name: cur.name, symbol: cur.symbol, decimalDigits: cur.decimalDigits },
      create: { name: cur.name, code: cur.code, symbol: cur.symbol, decimalDigits: cur.decimalDigits, isActive: true }
    });
  }

  for (const tz of initialTimeZones) {
    await prisma.timeZone.upsert({
      where: { name: tz.name },
      update: { code: tz.code, offset: tz.offset, region: tz.region },
      create: { name: tz.name, code: tz.code, offset: tz.offset, region: tz.region, isActive: true }
    });
  }

  const company = await prisma.company.upsert({
    where: { slug: 'network18' },
    update: {
      name: 'Network18',
      domain: 'nw18.com',
      country: 'India',
      timezone: 'Asia/Kolkata',
      hrContactEmail: 'hr@nw18.com',
      isActive: true
    },
    create: {
      name: 'Network18',
      slug: 'network18',
      domain: 'nw18.com',
      country: 'India',
      timezone: 'Asia/Kolkata',
      hrContactEmail: 'hr@nw18.com'
    }
  });

  for (const employee of employees) {
    await prisma.employee.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: employee.code
        }
      },
      update: {
        name: employee.name,
        role: employee.role,
        department: employee.department,
        entity: employee.entity,
        location: employee.location,
        manager: employee.manager,
        status: employee.status,
        type: employee.type,
        grade: employee.grade,
        phone: employee.phone,
        email: employee.email
      },
      create: {
        ...employee,
        companyId: company.id,
        joinDate: new Date(employee.joinDate),
        profile: {
          create: {
            dateOfBirth: employee.code === 'EMP001245' ? new Date('1993-08-12') : null,
            gender: employee.code === 'EMP001245' ? 'Male' : null,
            maritalStatus: employee.code === 'EMP001245' ? 'Married' : null,
            bloodGroup: employee.code === 'EMP001245' ? 'B+' : null,
            nationality: 'Indian',
            emergencyContact: employee.code === 'EMP001245' ? 'Anita Sharma' : null,
            emergencyPhone: employee.code === 'EMP001245' ? '+91 99887 77665' : null,
            workMode: employee.location === 'Remote' ? 'Remote' : 'Hybrid',
            noticePeriod: employee.type === 'Contract' ? '30 days' : '60 days',
            shift: 'General Shift',
            businessUnit: employee.department === 'Engineering' ? 'Digital Products' : employee.department,
            team: employee.department === 'Engineering' ? 'HRMS Platform' : employee.department,
            costCenter: employee.department === 'Engineering' ? 'ENG-PLT-204' : 'CORP-HR-018',
            hrPartner: 'Diya Rao',
            currentAddress: 'Flat 1402, Orchid Heights, Powai, Mumbai, Maharashtra 400076',
            permanentAddress: '45 Green Park Road, Jaipur, Rajasthan 302004',
            previousEmployment: [
              ['2020 - 2022', 'Product Engineer', 'Zentra Systems', 'Built internal workflow tools and employee self-service modules.'],
              ['2017 - 2020', 'Frontend Engineer', 'NovaCloud', 'Led interface development for SaaS admin products.']
            ],
            education: [
              ['B.Tech Computer Science', 'VJTI Mumbai', '2013 - 2017'],
              ['Higher Secondary', 'St. Xavier Junior College', '2011 - 2013']
            ],
            bankDetails: [
              ['Bank Name', 'HDFC Bank'],
              ['Account Number', '**** **** 7421'],
              ['IFSC Code', 'HDFC0001234'],
              ['Account Type', 'Salary Account']
            ],
            statutoryDetails: [
              ['PAN', 'ABCDE****F'],
              ['Aadhaar', '**** **** 3921'],
              ['UAN', '1004*****921'],
              ['PF Number', 'MH/BAN/****/042']
            ],
            salaryDetails: [
              ['Annual CTC', 'INR 24,00,000', 'Effective Apr 2026'],
              ['Monthly Gross', 'INR 2,00,000', 'Before deductions'],
              ['Payroll Status', 'Active', 'Current cycle eligible']
            ]
          }
        },
        documents: {
          create: [
            { type: 'Aadhaar Card', status: 'Verified' },
            { type: 'PAN Card', status: 'Verified' },
            { type: 'Offer Letter', status: 'Signed' },
            { type: 'Experience Letter', status: 'Pending' }
          ]
        }
      }
    });
  }

  // Seed Organization Masters for the primary company

  const le1 = await prisma.legalEntity.upsert({
    where: { companyId_code: { companyId: company.id, code: 'LE-001' } },
    update: {},
    create: { companyId: company.id, code: 'LE-001', name: 'Network18 Media & Investments Ltd', taxId: '27AAACN1818A1Z0', country: 'India', address: 'Empire Complex, Lower Parel, Mumbai' }
  });
  const le2 = await prisma.legalEntity.upsert({
    where: { companyId_code: { companyId: company.id, code: 'LE-002' } },
    update: {},
    create: { companyId: company.id, code: 'LE-002', name: 'TV18 Broadcast Ltd', taxId: '27AAACT1818B1Z1', country: 'India', address: 'Express Trade Towers, Noida, UP' }
  });

  const bu1 = await prisma.businessUnit.upsert({
    where: { companyId_code: { companyId: company.id, code: 'BU-001' } },
    update: {},
    create: { companyId: company.id, code: 'BU-001', name: 'Digital Media & SaaS', legalEntityId: le1.id, description: 'Digital products, websites, and SaaS applications' }
  });
  const bu2 = await prisma.businessUnit.upsert({
    where: { companyId_code: { companyId: company.id, code: 'BU-002' } },
    update: {},
    create: { companyId: company.id, code: 'BU-002', name: 'Television & Broadcast', legalEntityId: le2.id, description: 'News channels and television broadcasting operations' }
  });

  const dep1 = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DEP-001' } },
    update: {},
    create: { companyId: company.id, code: 'DEP-001', name: 'Engineering', businessUnitId: bu1.id, description: 'Core software engineering and cloud platform operations' }
  });
  const dep2 = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DEP-002' } },
    update: {},
    create: { companyId: company.id, code: 'DEP-002', name: 'People Operations', businessUnitId: bu1.id, description: 'HR, talent management, payroll, and employee relations' }
  });
  const dep3 = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DEP-003' } },
    update: {},
    create: { companyId: company.id, code: 'DEP-003', name: 'Finance & Accounts', businessUnitId: bu2.id, description: 'Financial planning, accounting, and audit compliance' }
  });

  await prisma.team.upsert({
    where: { companyId_code: { companyId: company.id, code: 'TEAM-001' } },
    update: {},
    create: { companyId: company.id, code: 'TEAM-001', name: 'Frontend Platform Team', departmentId: dep1.id, description: 'React, Next.js, and web application UI developers' }
  });
  await prisma.team.upsert({
    where: { companyId_code: { companyId: company.id, code: 'TEAM-002' } },
    update: {},
    create: { companyId: company.id, code: 'TEAM-002', name: 'Talent Acquisition Team', departmentId: dep2.id, description: 'Recruitment, sourcing, and candidate onboarding' }
  });

  await prisma.location.upsert({
    where: { companyId_code: { companyId: company.id, code: 'LOC-001' } },
    update: {},
    create: { companyId: company.id, code: 'LOC-001', name: 'Mumbai HQ', address: 'Empire Complex, Lower Parel', city: 'Mumbai', state: 'Maharashtra', country: 'India', timezone: 'Asia/Kolkata' }
  });
  await prisma.location.upsert({
    where: { companyId_code: { companyId: company.id, code: 'LOC-002' } },
    update: {},
    create: { companyId: company.id, code: 'LOC-002', name: 'Bengaluru Tech Park', address: 'Outer Ring Road, Bellandur', city: 'Bengaluru', state: 'Karnataka', country: 'India', timezone: 'Asia/Kolkata' }
  });

  await prisma.costCenter.upsert({
    where: { companyId_code: { companyId: company.id, code: 'CC-101' } },
    update: {},
    create: { companyId: company.id, code: 'CC-101', name: 'Engineering R&D Tech', departmentId: dep1.id, description: 'Software engineering cloud computing budget' }
  });
  await prisma.costCenter.upsert({
    where: { companyId_code: { companyId: company.id, code: 'CC-202' } },
    update: {},
    create: { companyId: company.id, code: 'CC-202', name: 'People & Corporate Admin', departmentId: dep2.id, description: 'HR, admin operations, and workplace expenses' }
  });

  // Seed New HRMS Masters
  const jf1 = await prisma.jobFamily.upsert({
    where: { companyId_code: { companyId: company.id, code: 'JF-001' } },
    update: {},
    create: { companyId: company.id, code: 'JF-001', name: 'Software Engineering', stream: 'Technical Specialist', description: 'Core product engineering, platform development, and cloud DevOps' }
  });

  const jf2 = await prisma.jobFamily.upsert({
    where: { companyId_code: { companyId: company.id, code: 'JF-002' } },
    update: {},
    create: { companyId: company.id, code: 'JF-002', name: 'People Operations & HR', stream: 'Operations', description: 'Talent management, HR ops, payroll, and employee experience' }
  });

  const jf3 = await prisma.jobFamily.upsert({
    where: { companyId_code: { companyId: company.id, code: 'JF-003' } },
    update: {},
    create: { companyId: company.id, code: 'JF-003', name: 'Product & Design', stream: 'Individual Contributor', description: 'Product management, user research, UI/UX design, and analytics' }
  });

  const gb1 = await prisma.gradeBand.upsert({
    where: { companyId_code: { companyId: company.id, code: 'GRD-L1' } },
    update: {},
    create: { companyId: company.id, code: 'GRD-L1', name: 'Associate / Level 1', levelRank: 1, minSalary: 350000, maxSalary: 650000, currency: 'INR', description: 'Entry level individual contributors' }
  });

  const gb2 = await prisma.gradeBand.upsert({
    where: { companyId_code: { companyId: company.id, code: 'GRD-L2' } },
    update: {},
    create: { companyId: company.id, code: 'GRD-L2', name: 'Mid-Level / Level 2', levelRank: 2, minSalary: 650000, maxSalary: 1200000, currency: 'INR', description: 'Experienced professionals and specialists' }
  });

  const gb3 = await prisma.gradeBand.upsert({
    where: { companyId_code: { companyId: company.id, code: 'GRD-L3' } },
    update: {},
    create: { companyId: company.id, code: 'GRD-L3', name: 'Senior / Level 3', levelRank: 3, minSalary: 1200000, maxSalary: 2200000, currency: 'INR', description: 'Senior engineers, leads, and domain experts' }
  });

  await prisma.jobTitle.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DES-001' } },
    update: {},
    create: { companyId: company.id, code: 'DES-001', name: 'Senior Software Engineer', jobFamilyId: jf1.id, gradeBandId: gb3.id, description: 'Lead frontend & backend architecture implementation' }
  });

  await prisma.jobTitle.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DES-002' } },
    update: {},
    create: { companyId: company.id, code: 'DES-002', name: 'Product Manager', jobFamilyId: jf3.id, gradeBandId: gb2.id, description: 'Product roadmap strategy and feature lifecycle execution' }
  });

  await prisma.jobTitle.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DES-003' } },
    update: {},
    create: { companyId: company.id, code: 'DES-003', name: 'HR Executive', jobFamilyId: jf2.id, gradeBandId: gb1.id, description: 'Onboarding, employee records, and payroll support' }
  });

  await prisma.payComponent.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PAY-BAS' } },
    update: {},
    create: { companyId: company.id, code: 'PAY-BAS', name: 'Basic Salary', type: 'Earning', calculationType: 'Percentage of Basic', value: 50, isTaxable: true, isStatutory: false, description: 'Core salary component forming base for statutory calculation' }
  });

  await prisma.payComponent.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PAY-HRA' } },
    update: {},
    create: { companyId: company.id, code: 'PAY-HRA', name: 'House Rent Allowance (HRA)', type: 'Earning', calculationType: 'Percentage of Basic', value: 40, isTaxable: true, isStatutory: false, description: 'Housing accommodation allowance' }
  });

  await prisma.payComponent.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PAY-PF' } },
    update: {},
    create: { companyId: company.id, code: 'PAY-PF', name: 'Provident Fund (PF)', type: 'Statutory', calculationType: 'Percentage of Basic', value: 12, isTaxable: false, isStatutory: true, description: 'Mandatory statutory provident fund contribution' }
  });

  await prisma.payComponent.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PAY-BON' } },
    update: {},
    create: { companyId: company.id, code: 'PAY-BON', name: 'Performance Bonus', type: 'Earning', calculationType: 'Variable', value: 100000, isTaxable: true, isStatutory: false, description: 'Annual performance linked incentive' }
  });

  // Seed Workforce & Schedule Masters
  await prisma.employmentType.upsert({
    where: { companyId_code: { companyId: company.id, code: 'EMPT-FT' } },
    update: {},
    create: { companyId: company.id, code: 'EMPT-FT', name: 'Full-time Permanent', category: 'Permanent', noticePeriodDays: 60, description: 'Regular full-time employment with full benefits' }
  });
  await prisma.employmentType.upsert({
    where: { companyId_code: { companyId: company.id, code: 'EMPT-CT' } },
    update: {},
    create: { companyId: company.id, code: 'EMPT-CT', name: 'Fixed Term Contract', category: 'Contract', noticePeriodDays: 30, description: 'Fixed period contractual agreement' }
  });
  await prisma.employmentType.upsert({
    where: { companyId_code: { companyId: company.id, code: 'EMPT-INT' } },
    update: {},
    create: { companyId: company.id, code: 'EMPT-INT', name: 'Graduate Trainee / Intern', category: 'Internship', noticePeriodDays: 15, description: 'Trainees and student interns' }
  });

  await prisma.workMode.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WM-ONSITE' } },
    update: {},
    create: { companyId: company.id, code: 'WM-ONSITE', name: 'On-site Office Mandatory', allowedRemoteDays: 0, requiresGeofencing: true, description: 'Regular physical presence at campus office' }
  });
  await prisma.workMode.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WM-HYBRID' } },
    update: {},
    create: { companyId: company.id, code: 'WM-HYBRID', name: 'Hybrid Flex (3 Days Remote)', allowedRemoteDays: 3, requiresGeofencing: false, description: 'Flexible hybrid attendance policy' }
  });
  await prisma.workMode.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WM-REMOTE' } },
    update: {},
    create: { companyId: company.id, code: 'WM-REMOTE', name: 'Full Remote', allowedRemoteDays: 5, requiresGeofencing: false, description: '100% work from anywhere' }
  });

  await prisma.workShift.upsert({
    where: { companyId_code: { companyId: company.id, code: 'SFT-GEN' } },
    update: {},
    create: { companyId: company.id, code: 'SFT-GEN', name: 'General Day Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, halfDayHours: 4.0, breakDurationMins: 60, isFlexible: false, isRotational: false, description: 'Standard day shift schedule' }
  });
  await prisma.workShift.upsert({
    where: { companyId_code: { companyId: company.id, code: 'SFT-US' } },
    update: {},
    create: { companyId: company.id, code: 'SFT-US', name: 'US Night Shift', startTime: '18:30', endTime: '03:30', gracePeriodMinutes: 15, halfDayHours: 4.0, breakDurationMins: 60, isFlexible: false, isRotational: true, description: 'Overnight broadcast & tech shift' }
  });

  await prisma.holidayCalendar.upsert({
    where: { companyId_code: { companyId: company.id, code: 'HOL-IND-01' } },
    update: {},
    create: { companyId: company.id, code: 'HOL-IND-01', name: 'Republic Day', date: new Date('2026-01-26'), type: 'National', applicableLocation: 'All Locations', description: 'National holiday across all Indian offices' }
  });
  await prisma.holidayCalendar.upsert({
    where: { companyId_code: { companyId: company.id, code: 'HOL-IND-02' } },
    update: {},
    create: { companyId: company.id, code: 'HOL-IND-02', name: 'Diwali / Deepavali', date: new Date('2026-11-08'), type: 'Mandatory', applicableLocation: 'All Locations', description: 'Festival of lights' }
  });

  const passwordHash = await bcrypt.hash('Password@123', 10);
  await prisma.user.upsert({

    where: {
      companyId_email: {
        companyId: company.id,
        email: 'admin@nw18.com'
      }
    },
    update: { passwordHash, role: UserRole.platform_admin },
    create: { companyId: company.id, email: 'admin@nw18.com', passwordHash, role: UserRole.platform_admin }
  });
  await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'hr@nw18.com'
      }
    },
    update: { passwordHash, role: UserRole.org_admin },
    create: { companyId: company.id, email: 'hr@nw18.com', passwordHash, role: UserRole.org_admin, employeeCode: 'EMP000744' }
  });
  await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'rahul.sharma@nw18.com'
      }
    },
    update: { passwordHash, role: UserRole.employee },
    create: { companyId: company.id, email: 'rahul.sharma@nw18.com', passwordHash, role: UserRole.employee, employeeCode: 'EMP001245' }
  });
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
