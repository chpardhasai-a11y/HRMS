import { ForgotPasswordForm } from '../components/AuthForms';

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm audience="employee" title="Forgot Password" loginHref="/login" />;
}
