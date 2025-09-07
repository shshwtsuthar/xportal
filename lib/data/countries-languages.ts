import countries from 'i18n-iso-countries';

// =============================================================================
// COUNTRIES AND LANGUAGES DATA
// Uses i18n-iso-countries package for comprehensive country data
// Formats data to match backend ReferenceCode schema
// =============================================================================

// Register English locale for country names
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

// Common languages with their ISO codes
const COMMON_LANGUAGES = [
  { code: '1101', description: 'English' },
  { code: '1102', description: 'Mandarin' },
  { code: '1103', description: 'Arabic' },
  { code: '1104', description: 'Cantonese' },
  { code: '1105', description: 'Vietnamese' },
  { code: '1106', description: 'Italian' },
  { code: '1107', description: 'Greek' },
  { code: '1108', description: 'German' },
  { code: '1109', description: 'Spanish' },
  { code: '1110', description: 'French' },
  { code: '1111', description: 'Hindi' },
  { code: '1112', description: 'Japanese' },
  { code: '1113', description: 'Korean' },
  { code: '1114', description: 'Portuguese' },
  { code: '1115', description: 'Russian' },
  { code: '1116', description: 'Thai' },
  { code: '1117', description: 'Turkish' },
  { code: '1118', description: 'Polish' },
  { code: '1119', description: 'Dutch' },
  { code: '1120', description: 'Indonesian' },
  { code: '1121', description: 'Malay' },
  { code: '1122', description: 'Tamil' },
  { code: '1123', description: 'Bengali' },
  { code: '1124', description: 'Punjabi' },
  { code: '1125', description: 'Urdu' },
  { code: '1126', description: 'Filipino' },
  { code: '1127', description: 'Swahili' },
  { code: '1128', description: 'Amharic' },
  { code: '1129', description: 'Somali' },
  { code: '1130', description: 'Other' },
];

// Interface matching backend ReferenceCode schema
export interface ReferenceCode {
  code: string;
  description: string;
}

// Get all countries formatted for backend compatibility
export const getCountries = (): ReferenceCode[] => {
  const countryCodes = countries.getAlpha2Codes();
  const countryList: ReferenceCode[] = [];

  // Add Australia first (most common for RTOs)
  countryList.push({ code: '1101', description: 'Australia' });

  // Add other countries
  Object.entries(countryCodes).forEach(([code, name]) => {
    if (code !== 'AU') { // Skip Australia as we added it first
      countryList.push({
        code: `11${code.charCodeAt(0).toString().padStart(2, '0')}${code.charCodeAt(1).toString().padStart(2, '0')}`,
        description: countries.getName(code, 'en') || name as string
      });
    }
  });

  // Sort alphabetically by description
  return countryList.sort((a, b) => a.description.localeCompare(b.description));
};

// Get all languages formatted for backend compatibility
export const getLanguages = (): ReferenceCode[] => {
  return COMMON_LANGUAGES.sort((a, b) => a.description.localeCompare(b.description));
};

// Helper function to transform data for select components
export const transformReferenceData = (data: ReferenceCode[]) => {
  return data.map(item => ({
    value: item.code,
    label: `${item.code} - ${item.description}`,
    description: item.description,
  }));
};

// Helper function to find description by code
export const findDescriptionByCode = (
  data: ReferenceCode[], 
  code: string
): string => {
  const item = data.find(item => item.code === code);
  return item?.description || '';
};
