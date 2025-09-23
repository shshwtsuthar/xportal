// =============================================================================
// COUNTRY CODE MAPPING UTILITIES
// Maps Mindee country codes to our system's country identifiers
// =============================================================================

// Mindee country codes to our country ID mapping
// This maps the 3-letter country codes from Mindee to our system's country IDs
export const COUNTRY_CODE_MAPPING: Record<string, string> = {
  // Common countries for international students
  'IND': '1101', // India
  'CHN': '1102', // China
  'PAK': '1103', // Pakistan
  'BGD': '1104', // Bangladesh
  'NPL': '1105', // Nepal
  'LKA': '1106', // Sri Lanka
  'PHL': '1107', // Philippines
  'VNM': '1108', // Vietnam
  'THA': '1109', // Thailand
  'IDN': '1110', // Indonesia
  'MYS': '1111', // Malaysia
  'SGP': '1112', // Singapore
  'KOR': '1113', // South Korea
  'JPN': '1114', // Japan
  'TWN': '1115', // Taiwan
  'HKG': '1116', // Hong Kong
  'AUS': '1101', // Australia (default)
  'USA': '1117', // United States
  'CAN': '1118', // Canada
  'GBR': '1119', // United Kingdom
  'DEU': '1120', // Germany
  'FRA': '1121', // France
  'ITA': '1122', // Italy
  'ESP': '1123', // Spain
  'NLD': '1124', // Netherlands
  'BEL': '1125', // Belgium
  'CHE': '1126', // Switzerland
  'AUT': '1127', // Austria
  'SWE': '1128', // Sweden
  'NOR': '1129', // Norway
  'DNK': '1130', // Denmark
  'FIN': '1131', // Finland
  'IRL': '1132', // Ireland
  'PRT': '1133', // Portugal
  'GRC': '1134', // Greece
  'POL': '1135', // Poland
  'CZE': '1136', // Czech Republic
  'HUN': '1137', // Hungary
  'ROU': '1138', // Romania
  'BGR': '1139', // Bulgaria
  'HRV': '1140', // Croatia
  'SVK': '1141', // Slovakia
  'SVN': '1142', // Slovenia
  'EST': '1143', // Estonia
  'LVA': '1144', // Latvia
  'LTU': '1145', // Lithuania
  'LUX': '1146', // Luxembourg
  'MLT': '1147', // Malta
  'CYP': '1148', // Cyprus
  'ISL': '1149', // Iceland
  'LIE': '1150', // Liechtenstein
  'MCO': '1151', // Monaco
  'SMR': '1152', // San Marino
  'VAT': '1153', // Vatican City
  'AND': '1154', // Andorra
  'BRA': '1155', // Brazil
  'ARG': '1156', // Argentina
  'CHL': '1157', // Chile
  'COL': '1158', // Colombia
  'PER': '1159', // Peru
  'VEN': '1160', // Venezuela
  'ECU': '1161', // Ecuador
  'BOL': '1162', // Bolivia
  'PRY': '1163', // Paraguay
  'URY': '1164', // Uruguay
  'GUY': '1165', // Guyana
  'SUR': '1166', // Suriname
  'TTO': '1167', // Trinidad and Tobago
  'JAM': '1168', // Jamaica
  'HTI': '1169', // Haiti
  'DOM': '1170', // Dominican Republic
  'CUB': '1171', // Cuba
  'MEX': '1172', // Mexico
  'GTM': '1173', // Guatemala
  'BLZ': '1174', // Belize
  'SLV': '1175', // El Salvador
  'HND': '1176', // Honduras
  'NIC': '1177', // Nicaragua
  'CRI': '1178', // Costa Rica
  'PAN': '1179', // Panama
  'RUS': '1180', // Russia
  'UKR': '1181', // Ukraine
  'BLR': '1182', // Belarus
  'MDA': '1183', // Moldova
  'GEO': '1184', // Georgia
  'ARM': '1185', // Armenia
  'AZE': '1186', // Azerbaijan
  'KAZ': '1187', // Kazakhstan
  'UZB': '1188', // Uzbekistan
  'TKM': '1189', // Turkmenistan
  'TJK': '1190', // Tajikistan
  'KGZ': '1191', // Kyrgyzstan
  'MNG': '1192', // Mongolia
  'AFG': '1193', // Afghanistan
  'IRN': '1194', // Iran
  'IRQ': '1195', // Iraq
  'SYR': '1196', // Syria
  'LBN': '1197', // Lebanon
  'JOR': '1198', // Jordan
  'ISR': '1199', // Israel
  'PSE': '1200', // Palestine
  'SAU': '1201', // Saudi Arabia
  'ARE': '1202', // United Arab Emirates
  'QAT': '1203', // Qatar
  'BHR': '1204', // Bahrain
  'KWT': '1205', // Kuwait
  'OMN': '1206', // Oman
  'YEM': '1207', // Yemen
  'TUR': '1208', // Turkey
  'CYP': '1209', // Cyprus
  'EGY': '1210', // Egypt
  'LBY': '1211', // Libya
  'TUN': '1212', // Tunisia
  'DZA': '1213', // Algeria
  'MAR': '1214', // Morocco
  'SDN': '1215', // Sudan
  'SSD': '1216', // South Sudan
  'ETH': '1217', // Ethiopia
  'ERI': '1218', // Eritrea
  'DJI': '1219', // Djibouti
  'SOM': '1220', // Somalia
  'KEN': '1221', // Kenya
  'UGA': '1222', // Uganda
  'TZA': '1223', // Tanzania
  'RWA': '1224', // Rwanda
  'BDI': '1225', // Burundi
  'MWI': '1226', // Malawi
  'ZMB': '1227', // Zambia
  'ZWE': '1228', // Zimbabwe
  'BWA': '1229', // Botswana
  'NAM': '1230', // Namibia
  'ZAF': '1231', // South Africa
  'LSO': '1232', // Lesotho
  'SWZ': '1233', // Eswatini
  'MOZ': '1234', // Mozambique
  'MDG': '1235', // Madagascar
  'MUS': '1236', // Mauritius
  'SYC': '1237', // Seychelles
  'COM': '1238', // Comoros
  'CPV': '1239', // Cape Verde
  'STP': '1240', // São Tomé and Príncipe
  'GNB': '1241', // Guinea-Bissau
  'GIN': '1242', // Guinea
  'SLE': '1243', // Sierra Leone
  'LBR': '1244', // Liberia
  'CIV': '1245', // Côte d'Ivoire
  'GHA': '1246', // Ghana
  'TGO': '1247', // Togo
  'BEN': '1248', // Benin
  'NER': '1249', // Niger
  'BFA': '1250', // Burkina Faso
  'MLI': '1251', // Mali
  'SEN': '1252', // Senegal
  'GMB': '1253', // Gambia
  'GNQ': '1254', // Equatorial Guinea
  'GAB': '1255', // Gabon
  'CMR': '1256', // Cameroon
  'CAF': '1257', // Central African Republic
  'TCD': '1258', // Chad
  'NGA': '1259', // Nigeria
  'AGO': '1260', // Angola
  'COD': '1261', // Democratic Republic of the Congo
  'COG': '1262', // Republic of the Congo
  'GNQ': '1263', // Equatorial Guinea
  'STP': '1264', // São Tomé and Príncipe
  'GAB': '1265', // Gabon
  'CMR': '1266', // Cameroon
  'CAF': '1267', // Central African Republic
  'TCD': '1268', // Chad
  'NGA': '1269', // Nigeria
  'AGO': '1270', // Angola
  'COD': '1271', // Democratic Republic of the Congo
  'COG': '1272', // Republic of the Congo
};

// Gender mapping from Mindee to our system
export const GENDER_MAPPING: Record<string, 'Male' | 'Female' | 'Other'> = {
  'Male': 'Male',
  'Female': 'Female',
  'M': 'Male',
  'F': 'Female',
  'MALE': 'Male',
  'FEMALE': 'Female',
  'OTHER': 'Other',
  'Other': 'Other',
};

/**
 * Maps Mindee country code to our system's country ID
 * @param mindeeCode - 3-letter country code from Mindee
 * @returns Our system's country ID or null if not found
 */
export function mapCountryCode(mindeeCode: string): string | null {
  if (!mindeeCode) return null;
  return COUNTRY_CODE_MAPPING[mindeeCode.toUpperCase()] || null;
}

/**
 * Maps Mindee gender to our system's gender
 * @param mindeeGender - Gender string from Mindee
 * @returns Our system's gender or null if not found
 */
export function mapGender(mindeeGender: string): 'Male' | 'Female' | 'Other' | null {
  if (!mindeeGender) return null;
  return GENDER_MAPPING[mindeeGender] || null;
}

/**
 * Validates if a date string is in YYYY-MM-DD format
 * @param dateString - Date string to validate
 * @returns True if valid, false otherwise
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
}

/**
 * Validates if a string contains only letters and spaces
 * @param name - Name string to validate
 * @returns True if valid, false otherwise
 */
export function isValidName(name: string): boolean {
  if (!name) return false;
  return /^[a-zA-Z\s]+$/.test(name.trim());
}

/**
 * Validates if a string is a valid passport number
 * @param passportNumber - Passport number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPassportNumber(passportNumber: string): boolean {
  if (!passportNumber) return false;
  // Basic validation - alphanumeric, 6-12 characters
  return /^[A-Z0-9]{6,12}$/.test(passportNumber.trim());
}
