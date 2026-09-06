import { AuthLogin } from '../../components/AuthForms';

export default function AdminLoginPage() {
  return <AuthLogin audience="admin" title="Admin Login" forgotHref="/admin/forgot-password" />;
}
