const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

async function sendOrderTickets(email, orderId, pdfBuffer) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Brak konfiguracji Gmail w pliku .env");
  }

  const html = `
  <!DOCTYPE html>
  <html lang="pl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Potwierdzenie zakupu</title>
  </head>

  <body style="
    margin: 0;
    padding: 30px 10px;
    background-color: #f1f5f9;
    font-family: Arial, Helvetica, sans-serif;
    color: #1e293b;
  ">

    <div style="
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 14px;
      overflow: hidden;
    ">

      <div style="
        background-color: #172554;
        padding: 30px 20px;
        text-align: center;
      ">
        <h1 style="
          color: #ffffff;
          margin: 0;
          font-size: 26px;
          letter-spacing: 1px;
        ">
          TICKETING IT2026
        </h1>

        <p style="
          color: #bfdbfe;
          margin: 10px 0 0;
          font-size: 12px;
          letter-spacing: 2px;
        ">
          TWOJE WYDARZENIA. TWOJE EMOCJE.
        </p>
      </div>

      <div style="padding: 35px 25px;">

        <h2 style="
          color: #172554;
          font-size: 25px;
          margin-top: 0;
        ">
          Dziękujemy za zakup!
        </h2>

        <p style="
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        ">
          Twoje zamówienie zostało pomyślnie zrealizowane.
          Cieszymy się, że wybierasz nasz system biletowy!
        </p>

        <div style="
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
        ">

          <h3 style="
            margin-top: 0;
            color: #172554;
            font-size: 17px;
          ">
            Potwierdzenie zamówienia
          </h3>

          <p style="margin: 10px 0; color: #475569;">
            Numer zamówienia:
            <strong style="color: #172554;">
              ${orderId}
            </strong>
          </p>

          <p style="margin: 10px 0; color: #475569;">
            Status:
            <strong style="color: #16a34a;">
              OPŁACONE
            </strong>
          </p>

        </div>

        <h3 style="color: #172554;">
          Twoje bilety są gotowe!
        </h3>

        <p style="
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        ">
          W załączniku znajdziesz plik PDF
          zawierający wszystkie zakupione bilety.
          Każdy bilet posiada indywidualny kod QR,
          który będzie potrzebny przy wejściu na wydarzenie.
        </p>

        <div style="
          background-color: #172554;
          border-radius: 10px;
          padding: 25px 15px;
          margin-top: 30px;
          text-align: center;
        ">

          <h3 style="
            color: #ffffff;
            margin: 0 0 10px;
          ">
            Życzymy udanego wydarzenia!
          </h3>

          <p style="
            color: #bfdbfe;
            font-size: 13px;
            margin: 0;
          ">
            Dziękujemy, że korzystasz z naszego systemu.
          </p>

        </div>

      </div>

      <div style="
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        padding: 20px;
        text-align: center;
      ">
        <p style="
          color: #94a3b8;
          font-size: 11px;
          margin: 0;
        ">
          Wiadomość wygenerowana automatycznie.
          Prosimy na nią nie odpowiadać.
        </p>
      </div>

    </div>

  </body>
  </html>
  `;

  const info = await transporter.sendMail({
    from: `"Ticketing IT2026" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Potwierdzenie zakupu - zamówienie #${orderId}`,
    text: `Dziękujemy za zakup!

Twoje zamówienie #${orderId} zostało opłacone.

W załączniku znajdziesz wszystkie bilety PDF.
Każdy bilet zawiera indywidualny kod QR.

Do zobaczenia na wydarzeniu!
Ticketing IT2026`,
    html: html,
    attachments: [
      {
        filename: `bilety-zamowienie-${orderId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  });

  console.log("Wiadomość wysłana:", info.messageId);

  return info;
}

module.exports = { sendOrderTickets };
