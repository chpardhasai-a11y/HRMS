import { redirect } from 'next/navigation';

export default function AdminResetPasswordRedirectPage() {
  redirect('/org-admin/reset-password');
}
