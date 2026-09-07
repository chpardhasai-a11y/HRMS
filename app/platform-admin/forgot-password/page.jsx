import { ForgotPasswordForm } from '../../components/AuthForms';

export default function PlatformAdminForgotPasswordPage() {
  return <ForgotPasswordForm audience="platform" title="Platform Admin Forgot Password" loginHref="/platform-admin/login" />;
}
