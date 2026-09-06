import { AuthLogin } from '../components/AuthForms';

export default function LoginPage() {
  return <AuthLogin audience="employee" title="Employee Login" forgotHref="/forgot-password" />;
}
