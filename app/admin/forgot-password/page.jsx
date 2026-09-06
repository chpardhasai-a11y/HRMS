import { ForgotPasswordForm } from '../../components/AuthForms';

export default function AdminForgotPasswordPage() {
  return <ForgotPasswordForm audience="admin" title="Admin Forgot Password" loginHref="/admin/login" />;
}
