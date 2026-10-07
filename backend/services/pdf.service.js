import PDFDocument from "pdfkit";

const COLORS = { text: "#1d2226", muted: "#5e6670", accent: "#0a66c2", rule: "#d9d9d9" };

const sectionTitle = (doc, title) => {
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.accent).text(title.toUpperCase());
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor(COLORS.rule)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.6);
};

const entry = (doc, title, subtitle, meta) => {
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(COLORS.text).text(title || "—");
  if (subtitle) doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text).text(subtitle);
  if (meta) doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted).text(meta);
  doc.moveDown(0.5);
};

/**
 * Write a one-page style resume for a profile into a writable stream
 * (usually the HTTP response). Returns once the document has been ended.
 */
export const writeResumePdf = (stream, { user, profile, email, avatarPng }) => {
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `${user.name} - Resume` } });
  doc.pipe(stream);

  const top = doc.y;
  let textX = doc.page.margins.left;
  if (avatarPng) {
    try {
      doc.image(avatarPng, textX, top, { width: 72, height: 72 });
      textX += 88;
    } catch {
      // An unreadable image should not break the whole PDF.
    }
  }

  doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.text).text(user.name, textX, top);
  if (profile.currentPost) {
    doc.font("Helvetica").fontSize(12).fillColor(COLORS.text).text(profile.currentPost, textX);
  }
  const contact = [`@${user.username}`, profile.location, email].filter(Boolean).join("  •  ");
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text(contact, textX);

  doc.x = doc.page.margins.left;
  doc.y = Math.max(doc.y, top + 80);

  if (profile.bio) {
    sectionTitle(doc, "About");
    doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text).text(profile.bio, { align: "left" });
  }

  if (profile.skills?.length) {
    sectionTitle(doc, "Skills");
    doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text).text(profile.skills.join(", "));
  }

  if (profile.pastWork?.length) {
    sectionTitle(doc, "Experience");
    profile.pastWork.forEach((work) => entry(doc, work.position, work.company, work.years));
  }

  if (profile.education?.length) {
    sectionTitle(doc, "Education");
    profile.education.forEach((edu) =>
      entry(
        doc,
        edu.school,
        [edu.degree, edu.fieldOfStudy].filter(Boolean).join(", "),
        edu.years
      )
    );
  }

  doc.end();
};
