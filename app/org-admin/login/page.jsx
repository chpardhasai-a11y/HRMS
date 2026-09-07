import { AuthLogin } from '../../components/AuthForms';

export default function OrgAdminLoginPage() {
  return <AuthLogin audience="org" title="Organization Admin Login" forgotHref="/org-admin/forgot-password" />;
}
