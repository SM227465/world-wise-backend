const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    if (process.env.NODE_ENV === 'production') {
      this.from = `ABC <${process.env.EMAIL_FROM_PROD}>`;
    } else {
      this.from = `ABC <${process.env.EMAIL_FROM_DEV}>`;
    }
  }

  newTransport() {
    // Creating transporter for email service
    if (process.env.NODE_ENV === 'production') {
      // email service for production : config your production email service here

      // Testing SendGrid as a demo for production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    // email service for development
    // using mailtrap for development
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject: subject,
    });
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      // text: htmlToText.fromString(html),
      text: htmlToText.convert(html, { wordwrap: 130 }),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  // Welcome email for sign up users(new user)
  async sendWelcome() {
    await this.send('Welcome', 'Welcome to ABC Technologies Pvt. Ltd.');
  }

  // Password reset email for who forgot his/her password
  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset link');
  }

  // Leave application email
  async sendLeaveApplication() {
    await this.send('leaveApplication', 'Leave application');
  }

  // updated leave application
  async updatedLeaveApplication() {
    await this.send('updatedLeaveApplication', 'Leave application status updated');
  }
};
