import { ForgotPasswordForm } from '../../components/AuthForms';

export default function OrgAdminForgotPasswordPage() {
  return <ForgotPasswordForm audience="org" title="Organization Admin Forgot Password" loginHref="/org-admin/login" />;
}
