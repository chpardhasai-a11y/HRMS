import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  it('creates a company with enterprise defaults', async () => {
    const prisma = {
      company: {
        create: jest.fn().mockResolvedValue({ id: 'c2', name: 'Acme Media', country: 'India', timezone: 'Asia/Kolkata' })
      }
    };
    const service = new CompaniesService(prisma as any);

    await expect(service.create({ name: 'Acme Media', slug: 'acme-media' })).resolves.toMatchObject({
      name: 'Acme Media',
      country: 'India',
      timezone: 'Asia/Kolkata'
    });
  });
});
