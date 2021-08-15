const path = require('path');
const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstname = user.name.split(' ')[0];
    this.url = url;
    this.from = `Natours <${process.env.EMAIL_FROM}>`;
  }

  createTransport() {
    const {
      NODE_ENV,
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USERNAME,
      EMAIL_PASSWORD,
    } = process.env;

    // Create sendgrid transport for production
    if (NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: EMAIL_USERNAME,
          pass: EMAIL_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      auth: {
        user: EMAIL_USERNAME,
        pass: EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) Render HTML for email based on pug template
    const templateLocation = path.join(
      __dirname,
      '..',
      'views',
      'email',
      `${template}.pug`
    );

    const html = pug.renderFile(templateLocation, {
      firstname: this.firstname,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      text: htmlToText(html),
      html,
    };

    // 3) Create transport and send mail
    const transport = this.createTransport();

    await transport.sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
