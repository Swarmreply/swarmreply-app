// src/constants/businessTypes.js
// Single source of truth for the business-type list across the app
// (Settings → Account business-type field, and anywhere else it's needed).
// Mirrors the list collected on the marketing signup page.
// Sorted A–Z, with "Other" pinned at the end.

const RAW = [
  'Restaurant / Food', 'Cafe / Coffee Shop', 'Bar / Brewery', 'Grocery / Convenience',
  'Home Services (general)', 'HVAC / Plumbing / Electrical', 'Cleaning Services',
  'Landscaping / Lawn Care', 'Roofing / Construction', 'Moving / Storage', 'Pest Control',
  'Retail / Shop', 'E-commerce',
  'Healthcare / Medical', 'Dental', 'Veterinary', 'Chiropractic', 'Mental Health / Therapy', 'Optometry',
  'Professional Services', 'Legal', 'Accounting / Tax', 'Real Estate', 'Insurance',
  'Financial Services', 'Marketing / Agency', 'IT / Tech Services',
  'Beauty / Salon / Spa', 'Barber Shop', 'Nail Salon', 'Tattoo / Piercing',
  'Automotive', 'Auto Repair', 'Car Dealership', 'Car Wash / Detailing',
  'Fitness / Wellness', 'Gym / Personal Training', 'Yoga / Pilates Studio',
  'Education / Tutoring', 'Childcare / Daycare',
  'Hotel / Hospitality', 'Event Services', 'Photography', 'Pet Services / Grooming',
  'Other',
];

export const BUSINESS_TYPES = RAW
  .filter(x => x !== 'Other')
  .sort((a, b) => a.localeCompare(b))
  .concat(['Other']);

export default BUSINESS_TYPES;
