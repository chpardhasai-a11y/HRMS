import { redirect } from 'next/navigation';

export default async function AdminProfileRedirectPage({ params }) {
  const { code } = await params;
  redirect(`/org-admin/employees/${code}`);
}
