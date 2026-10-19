// Sample tickets shown as one-click buttons. The "expected" note is for you, not the model.
export const SAMPLES = [
  {
    label: 'Angry, minor issue',
    expected: 'billing / low / negative',
    text: `THIS IS RIDICULOUS. I just opened my invoice and you spelled my company name wrong. It says "Brightwave Ltd" instead of "Brightwave Labs". Do you people even check anything?? I'm honestly considering switching providers over this. Fix it NOW.`,
  },
  {
    label: 'Polite, hidden outage',
    expected: 'account access or bug / high / positive or neutral',
    text: `Hi there, hope you're having a good week! Just a small note, no rush at all: since about 8am this morning none of the 40 people on our team have been able to log in. We get a spinning wheel and then a "session error" message. We're mostly catching up on email in the meantime, so whenever you get a chance! Thanks so much, Priya`,
  },
  {
    label: 'Two issues in one',
    expected: 'billing / medium / neutral (plus a feature request)',
    text: `Hello, two things. First, I was charged twice for my October subscription ($49 each, both on Oct 3). Can you refund the duplicate? Second, it would be great if you could add a dark mode to the dashboard, my eyes would thank you. Thanks, Marco`,
  },
  {
    label: 'Plain bug report',
    expected: 'bug / medium / neutral',
    text: `When I export a report to CSV, the dates come out as MM/DD instead of DD/MM, even though my account locale is set to UK. Steps: Reports > Monthly > Export CSV. Browser: Chrome 130 on macOS.`,
  },
  {
    label: 'Locked out (2FA)',
    expected: 'account access / medium / neutral',
    text: `I'm locked out of my account after enabling two-factor authentication. I got a new phone and the authenticator app didn't transfer over, and I don't have the backup codes. Can you help me get back in? My login email is j.ortega@example.com.`,
  },
];
