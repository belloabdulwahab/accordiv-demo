import { ENQUIRY_TEMPLATE, MARKETING_CONTACT } from '../config/marketingContact.js';

export function salesContactLinks(contact = MARKETING_CONTACT) {
  const email = typeof contact?.email === 'string' ? contact.email.trim() : '';
  // Keep configuration to an ordinary mailbox, with no mailto headers or controls.
  const safeEmail =
    email.length <= 254 &&
    /^[a-zA-Z0-9.!#$%&'*+/=_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(
      email,
    );
  const number = typeof contact?.whatsapp === 'string' ? contact.whatsapp.trim() : '';
  const safeNumber = /^\+[1-9]\d{6,14}$/.test(number);
  return {
    email: safeEmail
      ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Accordiv enquiry')}&body=${encodeURIComponent(ENQUIRY_TEMPLATE)}`
      : '',
    whatsapp: safeNumber
      ? `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(ENQUIRY_TEMPLATE)}`
      : '',
  };
}
