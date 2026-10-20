import * as nodemailer from 'nodemailer';

async function testTitan() {
  console.log('Testing Titan Email SMTP (smtp.titan.email:465)...');
  const transporter465 = nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@poketly.com',
      pass: 'Poketly@MillionDollarProduct'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter465.verify();
    console.log('SUCCESS: Titan SMTP port 465 verified successfully!');
    return;
  } catch (error: any) {
    console.log(`Port 465 failed: ${error.message}`);
  }

  console.log('Testing Titan Email SMTP (smtp.titan.email:587)...');
  const transporter587 = nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 587,
    secure: false,
    auth: {
      user: 'noreply@poketly.com',
      pass: 'Poketly@MillionDollarProduct'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter587.verify();
    console.log('SUCCESS: Titan SMTP port 587 verified successfully!');
  } catch (error: any) {
    console.log(`Port 587 failed: ${error.message}`);
  }
}

testTitan();
