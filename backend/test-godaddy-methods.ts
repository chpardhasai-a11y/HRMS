import * as nodemailer from 'nodemailer';

const credentials = {
  host: 'smtpout.secureserver.net',
  port: 465,
  user: 'noreply@poketly.com',
  pass: 'Poketly@MillionDollarProduct'
};

async function testMethod(name: string, config: any) {
  console.log(`Testing configuration [${name}]...`);
  const transporter = nodemailer.createTransport(config);

  try {
    await transporter.verify();
    console.log(`✅ SUCCESS with [${name}]!`);
    
    const info = await transporter.sendMail({
      from: '"HRMS Portal" <noreply@poketly.com>',
      to: 'noreply@poketly.com',
      subject: 'HRMS GoDaddy Verification',
      text: 'Testing GoDaddy SMTP delivery'
    });
    console.log(`✅ SENT! MessageId: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`❌ FAILED [${name}]: ${err.message}`);
    return false;
  }
}

async function runAll() {
  // Config 1: Port 465 secure:true, authMethod: 'LOGIN'
  await testMethod('Port 465, authMethod LOGIN', {
    host: credentials.host,
    port: 465,
    secure: true,
    authMethod: 'LOGIN',
    auth: { user: credentials.user, pass: credentials.pass },
    tls: { rejectUnauthorized: false }
  });

  // Config 2: Port 465 secure:true, authMethod: 'PLAIN'
  await testMethod('Port 465, authMethod PLAIN', {
    host: credentials.host,
    port: 465,
    secure: true,
    authMethod: 'PLAIN',
    auth: { user: credentials.user, pass: credentials.pass },
    tls: { rejectUnauthorized: false }
  });

  // Config 3: Port 587 secure:false, requireTLS: true, authMethod: 'LOGIN'
  await testMethod('Port 587, requireTLS, authMethod LOGIN', {
    host: credentials.host,
    port: 587,
    secure: false,
    requireTLS: true,
    authMethod: 'LOGIN',
    auth: { user: credentials.user, pass: credentials.pass },
    tls: { rejectUnauthorized: false }
  });

  // Config 4: Port 80 / 3535 (Alternative GoDaddy SMTP ports)
  await testMethod('Port 3535, secure:false, authMethod LOGIN', {
    host: credentials.host,
    port: 3535,
    secure: false,
    authMethod: 'LOGIN',
    auth: { user: credentials.user, pass: credentials.pass },
    tls: { rejectUnauthorized: false }
  });
}

runAll();
