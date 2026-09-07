import { redirect } from 'next/navigation';

export default function AdminForgotPasswordRedirectPage() {
  redirect('/org-admin/forgot-password');
}
