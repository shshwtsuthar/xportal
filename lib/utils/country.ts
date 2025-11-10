import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

// Register English locale for country names
countries.registerLocale(enLocale);

/**
 * Get the country name from an ISO alpha-2 code
 * @param code - ISO alpha-2 country code (e.g., "AU", "US", "GB")
 * @returns Country name in English, or the code itself if not found
 */
export const getCountryName = (code: string | null | undefined): string => {
  if (!code) return '';
  const name = countries.getName(code, 'en');
  return name || code;
};

/**
 * Get all countries as a sorted array of {code, name} objects
 * @returns Array of country objects sorted alphabetically by name
 */
export const getAllCountries = (): Array<{ code: string; name: string }> => {
  const countryCodes = countries.getAlpha2Codes();
  const countryList = Object.keys(countryCodes).map((code) => ({
    code,
    name: countries.getName(code, 'en') || code,
  }));

  // Sort alphabetically by country name
  return countryList.sort((a, b) => a.name.localeCompare(b.name));
};
