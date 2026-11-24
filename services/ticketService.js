
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const crypto = require("crypto");
const path = require("path");

const FONT_PATH = path.join(
  __dirname,
  "..",
  "fonts",
  "DejaVuSans.ttf"
);

// Kolory takie same jak w wiadomości e-mail
const COLORS = {
  navy: "#172554",
  lightBlue: "#BFDBFE",
  white: "#FFFFFF",
  lightGray: "#F8FAFC",
  gray: "#64748B",
  green: "#16A34A",
  border: "#E2E8F0",
  black: "#1E293B"
};

function createTicketToken(ticketId) {
  const secret = process.env.TICKET_SECRET;

  if (!secret) {
    throw new Error("Brak TICKET_SECRET w pliku .env");
  }

  const signature = crypto
    .createHmac("sha256", secret)
    .update(String(ticketId))
    .digest("hex");

  return `${ticketId}.${signature}`;
}

function hashTicketToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function verifyTicketToken(token) {
  if (typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const ticketId = Number(parts[0]);

  if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
    return null;
  }

  const expectedToken = createTicketToken(ticketId);

  const provided = Buffer.from(token);
  const expected = Buffer.from(expectedToken);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  return {
    ticketId,
    tokenHash: hashTicketToken(token)
  };
}

// Rysuje zaokrąglony prostokąt
function roundedBox(doc, x, y, width, height, radius, color) {
  doc
    .roundedRect(x, y, width, height, radius)
    .fill(color);
}

// Rysuje etykietę i wartość
function drawInfo(doc, label, value, x, y, width) {
  doc
    .font("Polish")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(label.toUpperCase(), x, y, {
      width
    });

  doc
    .font("Polish")
    .fontSize(16)
    .fillColor(COLORS.navy)
    .text(String(value), x, y + 16, {
      width,
      height: 38
    });
}

// Rysuje pojedynczy bilet
async function drawTicket(doc, ticket, index, totalTickets) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const margin = 38;
  const contentWidth = pageWidth - margin * 2;

  // Token i kod QR
  const token = createTicketToken(ticket.ticket_id);

  const qrData = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 500
  });

  const qrImage = Buffer.from(
    qrData.split(",")[1],
    "base64"
  );

  // Tło strony
  doc.rect(0, 0, pageWidth, pageHeight)
    .fill(COLORS.white);

  // Górny granatowy nagłówek
  doc.save();

  roundedBox(
    doc,
    margin,
    margin,
    contentWidth,
    145,
    12,
    COLORS.navy
  );

  doc.restore();

  doc
    .font("Polish")
    .fontSize(17)
    .fillColor(COLORS.white)
    .text("TICKETING IT2026", margin + 22, margin + 22);

  doc
    .font("Polish")
    .fontSize(9)
    .fillColor(COLORS.lightBlue)
    .text("TWOJE WYDARZENIA. TWOJE EMOCJE.", margin + 22, margin + 48);

  // Status biletu
  roundedBox(
    doc,
    pageWidth - margin - 112,
    margin + 20,
    90,
    25,
    6,
    COLORS.green
  );

  doc
    .font("Polish")
    .fontSize(9)
    .fillColor(COLORS.white)
    .text("OPŁACONY", pageWidth - margin - 112, margin + 28, {
      width: 90,
      align: "center"
    });

  doc
    .font("Polish")
    .fontSize(9)
    .fillColor(COLORS.lightBlue)
    .text(
      `BILET ${index + 1} Z ${totalTickets}`,
      margin + 22,
      margin + 83
    );

  // Nazwa wydarzenia
  doc
    .font("Polish")
    .fontSize(21)
    .fillColor(COLORS.white)
    .text(
      ticket.event_title || "Wydarzenie",
      margin + 22,
      margin + 103,
      {
        width: contentWidth - 44,
        height: 30,
        ellipsis: true
      }
    );

  // Informacje o wydarzeniu
  const eventDate = new Date(ticket.event_date);

  const formattedDate = eventDate.toLocaleString("pl-PL", {
    dateStyle: "long",
    timeStyle: "short"
  });

  const infoY = margin + 168;

  doc
    .font("Polish")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text("DATA I GODZINA", margin + 5, infoY);

  doc
    .font("Polish")
    .fontSize(13)
    .fillColor(COLORS.navy)
    .text(formattedDate, margin + 5, infoY + 17, {
      width: contentWidth - 10
    });

  doc
    .font("Polish")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text("MIEJSCE WYDARZENIA", margin + 5, infoY + 55);

  doc
    .font("Polish")
    .fontSize(13)
    .fillColor(COLORS.navy)
    .text(ticket.arena_name || "Brak danych", margin + 5, infoY + 72);

  // Sekcja z miejscem
  const seatBoxY = infoY + 110;
  const seatBoxHeight = 90;

  roundedBox(
    doc,
    margin,
    seatBoxY,
    contentWidth,
    seatBoxHeight,
    9,
    COLORS.lightGray
  );

  doc
    .roundedRect(margin, seatBoxY, contentWidth, seatBoxHeight, 9)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke();

  const sectionName =
    ticket.section === "FLOOR"
      ? "Płyta / miejsca stojące"
      : ticket.section;

  const columnWidth = contentWidth / 3;

  drawInfo(
    doc,
    "Sektor",
    sectionName,
    margin + 16,
    seatBoxY + 18,
    columnWidth - 20
  );

  if (ticket.section === "FLOOR") {
    drawInfo(
      doc,
      "Rodzaj",
      "Stojące",
      margin + columnWidth + 8,
      seatBoxY + 18,
      columnWidth - 16
    );

    drawInfo(
      doc,
      "Bilet",
      "Na płytę",
      margin + columnWidth * 2 + 8,
      seatBoxY + 18,
      columnWidth - 20
    );
  } else {
    drawInfo(
      doc,
      "Rząd",
      ticket.row_num,
      margin + columnWidth + 8,
      seatBoxY + 18,
      columnWidth - 16
    );

    drawInfo(
      doc,
      "Miejsce",
      ticket.seat_number,
      margin + columnWidth * 2 + 8,
      seatBoxY + 18,
      columnWidth - 20
    );
  }

  // Cena
  const priceY = seatBoxY + 112;

  doc
    .font("Polish")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text("CENA BILETU", margin + 5, priceY);

  doc
    .font("Polish")
    .fontSize(21)
    .fillColor(COLORS.navy)
    .text(
      `${Number(ticket.price).toFixed(2)} PLN`,
      margin + 5,
      priceY + 16
    );

  // Kod QR
  const qrSize = 165;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = priceY + 60;

  doc.image(qrImage, qrX, qrY, {
    width: qrSize,
    height: qrSize
  });

  doc
    .font("Polish")
    .fontSize(10)
    .fillColor(COLORS.navy)
    .text("KOD QR – POKAŻ PRZY WEJŚCIU", margin, qrY + qrSize + 24, {
      width: contentWidth,
      align: "center"
    });

  // Numer biletu
  doc
    .font("Polish")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      `Numer biletu: ${ticket.ticket_id}`,
      margin,
      qrY + qrSize + 44,
      {
        width: contentWidth,
        align: "center"
      }
    );

  // Dolna stopka
  const footerY = pageHeight - 68;

  doc
    .moveTo(margin, footerY)
    .lineTo(pageWidth - margin, footerY)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke();

  doc
    .font("Polish")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(
      "Bilet przeznaczony do jednorazowego wykorzystania. Nie udostępniaj go nikomu.",
      margin,
      footerY + 15,
      {
        width: contentWidth,
        align: "center"
      }
    );
}

// Generuje jeden PDF ze wszystkimi biletami.
// Każdy bilet znajduje się na osobnej stronie.
async function generateOrderPDF(tickets) {
  if (!tickets || tickets.length === 0) {
    throw new Error("Brak biletów do wygenerowania PDF");
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        bufferPages: false
      });

      const chunks = [];

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Polish", FONT_PATH);

      (async () => {
        try {
          for (let i = 0; i < tickets.length; i++) {
            if (i > 0) {
              doc.addPage();
            }

            await drawTicket(
              doc,
              tickets[i],
              i,
              tickets.length
            );
          }

          doc.end();
        } catch (error) {
          reject(error);
        }
      })();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createTicketToken,
  hashTicketToken,
  verifyTicketToken,
  generateOrderPDF
};
