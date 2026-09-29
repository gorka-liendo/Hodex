/**
 * Países habituales (UE + principales socios). Los nombres los da el propio
 * navegador (Intl.DisplayNames), así que no hay tabla de traducciones que
 * mantener. España primero; el resto por orden alfabético.
 */
const CODES = [
  'DE', 'AT', 'BE', 'BG', 'CY', 'HR', 'DK', 'SK', 'SI', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'CZ', 'RO', 'SE',
  'AD', 'GB', 'CH', 'NO', 'US', 'CA', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'MA', 'CN', 'JP', 'AU',
]

const names = new Intl.DisplayNames(['es'], { type: 'region' })

export const countryName = (code: string) => names.of(code) ?? code

export const COUNTRY_OPTIONS = [
  { value: 'ES', label: countryName('ES') },
  ...CODES.map((code) => ({ value: code, label: countryName(code) })).sort((a, b) =>
    a.label.localeCompare(b.label, 'es'),
  ),
]
