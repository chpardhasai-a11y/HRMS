import * as nodemailer from 'nodemailer';

async function testServer(host: string, port: number, secure: boolean) {
  console.log(`Testing ${host}:${port} (secure: ${secure})...`);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: 'noreply@poketly.com',
      pass: 'Poketly@MillionDollarProduct'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log(`✅ ${host}:${port} connection SUCCESSFUL!`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${host}:${port} failed: ${error.message} (${error.responseCode || error.code})`);
    return false;
  }
}

async function run() {
  await testServer('smtpout.secureserver.net', 465, true);
  await testServer('smtp.office365.com', 587, false);
}

run();
