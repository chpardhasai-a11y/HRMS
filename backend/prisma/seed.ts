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

async function main() {
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
      where: { code: employee.code },
      update: {
        companyId: company.id,
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
            companyId: company.id,
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
            { companyId: company.id, type: 'Aadhaar Card', status: 'Verified' },
            { companyId: company.id, type: 'PAN Card', status: 'Verified' },
            { companyId: company.id, type: 'Offer Letter', status: 'Signed' },
            { companyId: company.id, type: 'Experience Letter', status: 'Pending' }
          ]
        }
      }
    });
  }

  const passwordHash = await bcrypt.hash('Password@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@nw18.com' },
    update: { companyId: company.id, passwordHash, role: UserRole.platform_admin },
    create: { companyId: company.id, email: 'admin@nw18.com', passwordHash, role: UserRole.platform_admin }
  });
  await prisma.user.upsert({
    where: { email: 'hr@nw18.com' },
    update: { companyId: company.id, passwordHash, role: UserRole.org_admin },
    create: { companyId: company.id, email: 'hr@nw18.com', passwordHash, role: UserRole.org_admin, employeeCode: 'EMP000744' }
  });
  await prisma.user.upsert({
    where: { email: 'rahul.sharma@nw18.com' },
    update: { companyId: company.id, passwordHash, role: UserRole.employee },
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
