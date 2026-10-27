import { ACCORDIV_LOGO_SVG, demoWatermarkBackground } from '../config/branding.js';
import coverage from '../data/pdfFontCoverage.json' with { type: 'json' };
import { issuerFromSettings } from './settingsRules.js';
import { invoiceBilling, PAYMENT_METHODS } from './billingRules.js';
import { invoiceBalance, invoicePaid, invoiceStatusText, invoiceTotal } from './finance.js';
import { lineTotal } from '../utils/safeMoney.js';
import { moneyInputValue } from '../utils/money.js';
import { formatDate, todayDate } from '../utils/date.js';

export function pdfMoney(amount) {
  const [whole, cents] = moneyInputValue(amount).split('.');
  return `NGN ${BigInt(whole).toLocaleString('en-NG')}.${cents}`;
}

// Bound table min-widths by giving long entered words invisible wrap opportunities.
const wrapPdfText = (value) => value.replace(/\S{24}(?=\S)/gu, '$&\u200b');

function checkText(text) {
  for (const character of text) {
    const code = character.codePointAt(0);
    if ([9, 10, 13].includes(code)) continue;
    if (!coverage.some(([start, end]) => code >= start && code <= end))
      throw new Error(
        `The PDF font cannot display ${JSON.stringify(character)} (U+${code.toString(16).toUpperCase()}). A PDF requires text supported by the embedded font. For drafts, check invoice text and business details in Settings; issued records stay locked. Your invoice is unchanged.`,
      );
  }
  return text;
}

export function safePdfFilename(invoice, demo) {
  const reference =
    (invoice.number || `draft-${invoice.id}`)
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'invoice';
  return `Accordiv-${reference}${demo ? '-demo' : ''}.pdf`;
}

export function safeInvoiceFilename(invoice) {
  return safePdfFilename(invoice, true);
}


export function buildInvoicePdfDefinition(data, id, today, generatedAt, demo) {
  const invoice = data.invoices.find((record) => record.id === id);
  if (!invoice) throw new Error(demo ? 'Invoice not found. Reset Demo may have removed it.' : 'Invoice not found in the supplied records.');
  const billing = invoiceBilling(invoice, data.clients);
  const issuer = invoice.issuerSnapshot || issuerFromSettings(data.settings);
  const payments = data.payments.filter((payment) => payment.invoiceId === id);
  const displayText = [
    invoice.number,
    invoice.notes,
    invoice.paymentInstructions,
    invoice.cancellationReason,
    invoice.migrationNote,
    ...invoice.items.map((item) => item.description),
    ...Object.values(billing),
    ...Object.values(issuer),
    ...payments.map((payment) => payment.reference),
  ];
  displayText.forEach(checkText);
  const marker =
    invoice.status === 'draft' ? ' | DRAFT' : invoice.status === 'cancelled' ? ' | CANCELLED' : '';
  const billingLines = (details) =>
    [
      details.name,
      details.contact !== details.name ? details.contact : '',
      details.address,
      details.email,
      details.phone,
      details.website,
    ]
      .filter(Boolean)
      .map(wrapPdfText)
      .join('\n');
  const chargeHeader = ['Description', 'Qty', 'Unit price', 'Amount'].map((text) => ({
    text,
    bold: true,
    color: '#334766',
    fillColor: '#edf2ff',
    fontSize: 9,
  }));
  const content = [
    // Preserve the former heading's line height so branding does not move invoice page breaks.
    { svg: ACCORDIV_LOGO_SVG, width: 163.45, height: 33.75, margin: [0, 0, 0, 8] },
    {
      text: wrapPdfText(invoice.number || 'Unnumbered draft'),
      fontSize: 19,
      bold: true,
      margin: [0, 0, 0, 8],
    },
    {
      text: `${invoice.status.toUpperCase()} · ${invoiceStatusText(invoice, data.payments, today)}`,
      color: '#425571',
      margin: [0, 0, 0, 18],
    },
    { text: demo ? 'From · Demo issuer' : 'From · Business', style: 'section' },
    { text: billingLines(issuer), margin: [0, 0, 0, 14] },
    {
      text:
        invoice.status === 'draft'
          ? 'Bill to · Current client details'
          : 'Bill to · Issued billing snapshot',
      style: 'section',
    },
    { text: billingLines(billing), margin: [0, 0, 0, 14] },
    {
      text: `Issue date: ${formatDate(invoice.issuedDate, { year: 'numeric' })}    Due date: ${formatDate(invoice.dueDate, { year: 'numeric' })}`,
      margin: [0, 0, 0, 18],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 32, 99, 105],
        body: [
          chargeHeader,
          ...invoice.items.map((item) => [
            { text: wrapPdfText(item.description), margin: [0, 4, 0, 4] },
            { text: String(item.quantity), alignment: 'right', fontSize: 9 },
            { text: pdfMoney(item.unitAmount), alignment: 'right', fontSize: 8.5 },
            { text: pdfMoney(lineTotal(item)), alignment: 'right', fontSize: 8.5 },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 16],
    },
    {
      text: `Invoice total: ${pdfMoney(invoiceTotal(invoice))}`,
      bold: true,
      fontSize: 13,
      margin: [0, 0, 0, 8],
    },
    {
      text: `Payments received (active records): ${pdfMoney(invoicePaid(invoice, data.payments))}`,
      margin: [0, 0, 0, 5],
    },
    {
      text: `Outstanding balance: ${pdfMoney(invoiceBalance(invoice, data.payments))}`,
      bold: true,
      margin: [0, 0, 0, 5],
    },
    {
      text: `Settlement as of ${generatedAt.toISOString()} · Drafts and cancellations are not receivables.`,
      fontSize: 8,
      color: '#53647c',
      margin: [0, 0, 0, 16],
    },
  ];
  if (payments.length)
    content.push(
      { text: 'Payment history · Manual records only', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: [75, '*', 108, 55],
          body: [
            ['Date', 'Method / reference', 'Amount', 'Record'].map((text) => ({
              text,
              bold: true,
              fontSize: 9,
            })),
            ...payments.map((payment) => [
              { text: formatDate(payment.date, { year: 'numeric' }), fontSize: 9 },
              {
                text: wrapPdfText(
                  `${PAYMENT_METHODS[payment.method]}${payment.reference ? `\n${payment.reference}` : ''}`,
                ),
                fontSize: 9,
              },
              { text: pdfMoney(payment.amount), fontSize: 8.5, alignment: 'right' },
              { text: payment.status === 'voided' ? 'VOIDED' : 'Active', fontSize: 9 },
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      },
    );
  for (const [label, value] of [
    ['Notes', invoice.notes],
    ['Payment instructions', invoice.paymentInstructions],
    ['Cancellation reason', invoice.cancellationReason],
    ['Historical record note', invoice.migrationNote],
  ]) {
    if (value)
      content.push(
        { text: label, style: 'section' },
        { text: wrapPdfText(value), margin: [0, 0, 0, 14] },
      );
  }
  content.push({
    text: demo
      ? 'For demonstration only. Not a tax document. Issuing does not email the client. Recording or voiding payments does not collect or refund money.'
      : 'Issuing does not email the client. Recording or voiding payments does not collect or refund money.',
    fontSize: 9,
    color: '#53647c',
    margin: [0, 12, 0, 0],
  });
  return {
    pageSize: 'A4',
    pageMargins: [40, 58, 40, 52],
    ...(demo ? { background: demoWatermarkBackground } : {}),
    info: { title: `Accordiv ${invoice.number || 'draft'}${demo ? ' — DEMO' : ''}`, author: issuer.name },
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2, color: '#1e2a40' },
    styles: { section: { bold: true, fontSize: 11, margin: [0, 6, 0, 7] } },
    header: {
      text: demo ? `DEMO — Sample document${marker}` : `INVOICE${marker}`,
      margin: [40, 20, 40, 0],
      fontSize: 10,
      bold: true,
      color: '#234bbe',
    },
    footer: (page, count) => ({
      text: `Accordiv${demo ? ' · Fictional demo' : ''} · Page ${page} of ${count}`,
      margin: [40, 18, 40, 0],
      alignment: 'center',
      fontSize: 9,
      color: '#53647c',
    }),
    content,
  };
}

export function invoicePdfDefinition(data, id, today = todayDate(), generatedAt = new Date()) {
  return buildInvoicePdfDefinition(data, id, today, generatedAt, true);
}

// Load the embedded PDF fonts only on demand; document text must never trigger remote resource fetches.
export async function definitionBlob(definition) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  pdfMake.addVirtualFileSystem(fonts);
  pdfMake.addFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  });
  pdfMake.setUrlAccessPolicy(() => false);
  return pdfMake.createPdf(definition).getBlob();
}

export async function createInvoicePdfBlob(data, id, today = todayDate()) {
  return definitionBlob(invoicePdfDefinition(data, id, today));
}


export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function downloadInvoicePdf(data, id, today) {
  downloadBlob(await createInvoicePdfBlob(data, id, today), safeInvoiceFilename(data.invoices.find(invoice => invoice.id === id)));
}

