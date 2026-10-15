// Utility helper to generate and handle rich JPG/Image certificates for OD verification

export const generateSampleCertificate = (eventName = 'Inter-College Event', studentName = 'Student Delegate', date = '2026-09-23') => {
  const cleanEvent = eventName || 'Inter-College Technical Symposium';
  const cleanStudent = studentName || 'Student Participant';
  const cleanDate = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'September 2026';
  const serialNo = `SCGRS-OD-${Math.floor(100000 + Math.random() * 900000)}`;

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="900" height="620" style="background:#0c1122; font-family:'Segoe UI', Roboto, Helvetica, sans-serif;">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="900" height="620" fill="#0b1120" />
  <rect width="900" height="620" fill="url(#grid)" />

  <!-- Outer Double Gold Border -->
  <rect x="24" y="24" width="852" height="572" rx="12" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
  <rect x="36" y="36" width="828" height="548" rx="8" fill="#0f172a" fill-opacity="0.92" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1.5" />

  <!-- Corner Ornaments -->
  <path d="M 46 76 L 76 46 M 46 66 L 66 46 M 46 56 L 56 46" stroke="url(#goldGrad)" stroke-width="2" />
  <path d="M 854 76 L 824 46 M 854 66 L 834 46 M 854 56 L 844 46" stroke="url(#goldGrad)" stroke-width="2" />
  <path d="M 46 544 L 76 574 M 46 554 L 66 574 M 46 564 L 56 574" stroke="url(#goldGrad)" stroke-width="2" />
  <path d="M 854 544 L 824 574 M 854 554 L 834 574 M 854 564 L 844 574" stroke="url(#goldGrad)" stroke-width="2" />

  <!-- Header Crest Icon -->
  <circle cx="450" cy="95" r="28" fill="url(#goldGrad)" />
  <polygon points="450,75 456,88 470,89 459,99 462,112 450,105 438,112 441,99 430,89 444,88" fill="#0f172a" />

  <!-- Institution Title -->
  <text x="450" y="145" text-anchor="middle" fill="#93c5fd" font-size="13" font-weight="700" letter-spacing="4">SMART CAMPUS ACCREDITED COUNCIL</text>
  <text x="450" y="170" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="800" letter-spacing="1.5">OFFICIAL CERTIFICATE OF PARTICIPATION</text>
  
  <line x1="300" y1="185" x2="600" y2="185" stroke="url(#goldGrad)" stroke-width="2" />

  <!-- Subtitle -->
  <text x="450" y="220" text-anchor="middle" fill="#94a3b8" font-size="14" font-style="italic">This is to officially certify that</text>

  <!-- Student Name -->
  <text x="450" y="265" text-anchor="middle" fill="#38bdf8" font-size="26" font-weight="800" letter-spacing="0.5">${cleanStudent}</text>
  <line x1="280" y1="280" x2="620" y2="280" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1" stroke-dasharray="4,4" />

  <!-- Description Body -->
  <text x="450" y="318" text-anchor="middle" fill="#cbd5e1" font-size="14">has actively represented the institution in the official campus event</text>
  <text x="450" y="352" text-anchor="middle" fill="#fef08a" font-size="20" font-weight="700">"${cleanEvent}"</text>
  <text x="450" y="388" text-anchor="middle" fill="#94a3b8" font-size="13">conducted on ${cleanDate} and has fulfilled genuine event attendance requirements.</text>

  <!-- Left: Serial & Date -->
  <text x="120" y="460" fill="#64748b" font-size="11" font-weight="700" letter-spacing="1">EVENT DATE</text>
  <text x="120" y="480" fill="#e2e8f0" font-size="13" font-weight="600">${cleanDate}</text>
  <text x="120" y="515" fill="#64748b" font-size="10">CERTIFICATE NO: <tspan fill="#38bdf8">${serialNo}</tspan></text>

  <!-- Center Seal -->
  <g transform="translate(450, 480)">
    <circle cx="0" cy="0" r="42" fill="url(#sealGrad)" stroke="#fef08a" stroke-width="2" />
    <circle cx="0" cy="0" r="36" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="3,3" />
    <text x="0" y="-8" text-anchor="middle" fill="#fff" font-size="9" font-weight="800" letter-spacing="1">GENUINE</text>
    <text x="0" y="6" text-anchor="middle" fill="#fef08a" font-size="12" font-weight="900">VERIFIED</text>
    <text x="0" y="18" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">★ SCGRS OD ★</text>
  </g>

  <!-- Right: Signatures -->
  <line x1="660" y1="480" x2="790" y2="480" stroke="#94a3b8" stroke-width="1" />
  <path d="M 680 472 Q 710 450 735 470 T 775 465" fill="none" stroke="#38bdf8" stroke-width="2" />
  <text x="725" y="500" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Faculty In-Charge</text>
  <text x="725" y="518" text-anchor="middle" fill="#64748b" font-size="10">Authorized Signatory</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
};

// Preset sample certificates for quick 1-click OD attachment
export const PRESET_CERTIFICATES = [
  {
    id: 'symposium',
    name: 'National_Symposium_Certificate.jpg',
    label: '🏆 National Tech Symposium Certificate (JPG)',
    eventName: 'National Inter-College Technical Symposium 2026',
    date: '2026-09-23'
  },
  {
    id: 'hackathon',
    name: 'Smart_India_Hackathon_OD_Pass.jpg',
    label: '💻 Hackathon Finalist Certificate & OD Pass (JPG)',
    eventName: 'National Smart India Hackathon Grand Finale',
    date: '2026-09-18'
  },
  {
    id: 'sports',
    name: 'Inter_University_Sports_Certificate.jpg',
    label: '⚽ Inter-University Sports Meet Certificate (JPG)',
    eventName: 'State Level Inter-University Championship',
    date: '2026-09-15'
  }
];

export const getCertificateImageUrl = (proof, fallbackEventName = 'Inter-College Event', studentName = 'Student') => {
  if (!proof) return null;
  if (proof.startsWith('data:image/') || proof.startsWith('http://') || proof.startsWith('https://')) {
    return proof;
  }
  // If it's a preset or text description, generate high quality SVG/JPG data URL
  return generateSampleCertificate(fallbackEventName, studentName);
};
