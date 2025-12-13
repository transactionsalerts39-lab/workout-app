import { Prospect } from '../types';

function firstName(fullName: string): string {
  const [first] = fullName.split(' ');
  return first || fullName;
}

function renderContext(prospect: Prospect): string {
  const role = prospect.title ? `${prospect.title}` : 'your role';
  const company = prospect.company ? ` at ${prospect.company}` : '';
  return `${role}${company}`;
}

function renderNotes(prospect: Prospect): string {
  const tags = prospect.tags && prospect.tags.length ? `Focus areas: ${prospect.tags.join(', ')}.` : '';
  const notes = prospect.notes_raw ? `Notes from my manual research: ${prospect.notes_raw}` : '';
  return [tags, notes].filter(Boolean).join(' ');
}

export function buildOutreachDrafts(prospect: Prospect): { variant: string; body: string }[] {
  const name = prospect.full_name || 'there';
  const introContext = renderContext(prospect);
  const noteLine = renderNotes(prospect);
  const safeNote = noteLine ? `\n${noteLine}` : '';

  const referral = `Hi ${firstName(name)},

I’m reaching out on behalf of my partner (Instagram creator) after manually compiling a list of people who work with creators. Your ${introContext} looked relevant.

If you’re the right contact for creator/talent partnerships, could we do a brief intro? If not, a quick referral to the right teammate would be hugely appreciated.${safeNote}

Thanks for considering—happy to keep this to 5 minutes.`;

  const valuePitch = `Hi ${firstName(name)},

I noticed your ${introContext} and wanted to share a concise idea for how my partner could collaborate with your talent roster. We’re looking for thoughtful guidance on growth and partnership structure.

Would you be open to a short 10-minute call next week to see if there’s a fit? I’m only using information you’ve shared publicly and notes I captured manually.${safeNote}

Either way, appreciate your time.`;

  return [
    { variant: 'Referral / intro ask', body: referral },
    { variant: 'Short value pitch + call request', body: valuePitch },
  ];
}
