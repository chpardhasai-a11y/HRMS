import { AuthLogin } from '../../components/AuthForms';

export default function PlatformAdminLoginPage() {
  return <AuthLogin audience="platform" title="Platform Admin Login" forgotHref="/platform-admin/forgot-password" />;
}
