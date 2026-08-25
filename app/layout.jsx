import './globals.css';

export const metadata = {
  title: 'HRMS Tool',
  description: 'Human resource management dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
