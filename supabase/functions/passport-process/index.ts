// =============================================================================
// FILE:        passport-process/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// AUTHOR:      Lead Backend Engineer
// DATE:        2025-01-27
// VERSION:     1.0.0
//
// DESCRIPTION:
// This Edge Function processes passport documents using Mindee API to extract
// personal information and automatically populate application forms.
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';

// =============================================================================
// TYPES
// =============================================================================

interface MindeeField {
  value: string;
  locations: Array<{
    page: number;
    polygon: number[][];
  }>;
  confidence: number | null;
}

interface MindeeResponse {
  fields: {
    sex?: MindeeField;
    surnames?: MindeeField;
    mrz_line_1?: MindeeField;
    mrz_line_2?: MindeeField;
    given_names?: MindeeField;
    nationality?: MindeeField;
    date_of_birth?: MindeeField;
    date_of_issue?: MindeeField;
    date_of_expiry?: MindeeField;
    place_of_birth?: MindeeField;
    issuing_country?: MindeeField;
    passport_number?: MindeeField;
  };
  raw_text: string | null;
}

interface ExtractedPassportData {
  firstName?: string;
  lastName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  nationality?: string;
  placeOfBirth?: string;
  passportNumber?: string;
  issuingCountry?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

interface ProcessPassportRequest {
  applicationId: string;
  documentId: string;
  documentPath: string;
}

// =============================================================================
// COUNTRY CODE MAPPING
// =============================================================================

const COUNTRY_CODE_MAPPING: Record<string, string> = {
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
  'BGL': '1139', // Bulgaria
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
};

const GENDER_MAPPING: Record<string, 'Male' | 'Female' | 'Other'> = {
  'Male': 'Male',
  'Female': 'Female',
  'M': 'Male',
  'F': 'Female',
  'MALE': 'Male',
  'FEMALE': 'Female',
  'OTHER': 'Other',
  'Other': 'Other',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function mapCountryCode(mindeeCode: string): string | null {
  if (!mindeeCode) return null;
  return COUNTRY_CODE_MAPPING[mindeeCode.toUpperCase()] || null;
}

function mapGender(mindeeGender: string): 'Male' | 'Female' | 'Other' | null {
  if (!mindeeGender) return null;
  return GENDER_MAPPING[mindeeGender] || null;
}

function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
}

function isValidName(name: string): boolean {
  if (!name) return false;
  return /^[a-zA-Z\s]+$/.test(name.trim());
}

function isValidPassportNumber(passportNumber: string): boolean {
  if (!passportNumber) return false;
  return /^[A-Z0-9]{6,12}$/.test(passportNumber.trim());
}

// =============================================================================
// MINDEE API INTEGRATION
// =============================================================================

async function pollForResult(pollingUrl: string, apiKey: string): Promise<any> {
  const maxAttempts = 30; // 30 attempts
  const delayMs = 2000; // 2 seconds between attempts
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[PASSPORT_DEBUG] Polling attempt ${attempt}/${maxAttempts}`);
    
    const pollResponse = await fetch(pollingUrl, {
      headers: {
        'Authorization': apiKey,
      },
    });
    
    if (!pollResponse.ok) {
      throw new ValidationError(`Polling failed: ${pollResponse.status}`);
    }
    
    const pollData = await pollResponse.json();
    console.log(`[PASSPORT_DEBUG] Poll response data:`, JSON.stringify(pollData, null, 2));
    
    // Check if this is a completed inference (direct result) or a job status
    if (pollData.inference) {
      console.log(`[PASSPORT_DEBUG] Job completed - returning inference result directly`);
      return pollData;
    }
    
    const job = pollData.job;
    if (!job) {
      throw new ValidationError(`Invalid polling response: no job or inference data`);
    }
    
    console.log(`[PASSPORT_DEBUG] Job status: ${job.status}`);
    
    if (job.status === 'Processed') {
      // Get the result from the result_url
      if (job.result_url) {
        const resultResponse = await fetch(job.result_url, {
          headers: {
            'Authorization': apiKey,
          },
        });
        
        if (!resultResponse.ok) {
          throw new ValidationError(`Failed to get result: ${resultResponse.status}`);
        }
        
        return await resultResponse.json();
      } else {
        throw new ValidationError('No result URL provided');
      }
    } else if (job.status === 'Failed') {
      throw new ValidationError(`Job failed: ${job.error?.detail || 'Unknown error'}`);
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new ValidationError('Polling timeout - job did not complete in time');
}

async function processPassportWithMindee(documentPath: string): Promise<ExtractedPassportData> {
  const apiKey = Deno.env.get('MINDEE_API_KEY');
  const modelId = Deno.env.get('MINDEE_MODEL_ID');
  
  console.log(`[PASSPORT_DEBUG] API Key present: ${!!apiKey}`);
  console.log(`[PASSPORT_DEBUG] API Key length: ${apiKey?.length || 0}`);
  console.log(`[PASSPORT_DEBUG] API Key starts with: ${apiKey?.substring(0, 10) || 'N/A'}`);
  console.log(`[PASSPORT_DEBUG] Model ID: ${modelId}`);
  
  // Debug: List all environment variables that start with MINDEE
  const envVars = Object.keys(Deno.env.toObject()).filter(key => key.startsWith('MINDEE'));
  console.log(`[PASSPORT_DEBUG] Available MINDEE env vars: ${envVars.join(', ')}`);
  
  if (!apiKey || !modelId) {
    throw new ValidationError('Mindee API configuration is missing');
  }

  // Download the document from Supabase Storage
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!serviceKey) {
    throw new ValidationError('Supabase service key is missing');
  }

  // Construct the correct storage URL for local development
  // The documentPath already includes the bucket name (e.g., "student-docs/applications/123/uploads/file.pdf")
  console.log(`[PASSPORT_DEBUG] Document path received: ${documentPath}`);
  const documentUrl = `${supabaseUrl}/storage/v1/object/${documentPath}`;
  console.log(`[PASSPORT_DEBUG] Attempting to download document from: ${documentUrl}`);
  
  const documentResponse = await fetch(documentUrl, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  console.log(`[PASSPORT_DEBUG] Document download response status: ${documentResponse.status}`);

  if (!documentResponse.ok) {
    const errorText = await documentResponse.text();
    console.log(`[PASSPORT_DEBUG] Document download error: ${errorText}`);
    throw new ValidationError(`Failed to download document from storage: ${documentResponse.status} - ${errorText}`);
  }

  const documentBuffer = await documentResponse.arrayBuffer();
  
  // Create FormData for Mindee API v2
  const formData = new FormData();
  const blob = new Blob([documentBuffer]);
  formData.append('file', blob, 'passport.pdf');
  formData.append('model_id', modelId);

  // Call Mindee API v2
  console.log(`[PASSPORT_DEBUG] Making Mindee API v2 call with Authorization: Token ${apiKey.substring(0, 10)}...`);
  console.log(`[PASSPORT_DEBUG] Full API Key: ${apiKey}`);
  console.log(`[PASSPORT_DEBUG] API Key length: ${apiKey.length}`);
  console.log(`[PASSPORT_DEBUG] Model ID: ${modelId}`);
  
  const mindeeResponse = await fetch(`https://api-v2.mindee.net/v2/inferences/enqueue`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
    },
    body: formData,
  });

  if (!mindeeResponse.ok) {
    const errorText = await mindeeResponse.text();
    throw new ValidationError(`Mindee API error: ${mindeeResponse.status} - ${errorText}`);
  }

  const jobResponse = await mindeeResponse.json();
  console.log(`[PASSPORT_DEBUG] Mindee API v2 job response:`, JSON.stringify(jobResponse, null, 2));
  
  // The v2 API returns a job that needs to be polled for results
  const job = jobResponse.job;
  if (!job || !job.polling_url) {
    throw new ValidationError('Invalid job response from Mindee API');
  }
  
  // Poll for the result
  console.log(`[PASSPORT_DEBUG] Polling for results at: ${job.polling_url}`);
  const result = await pollForResult(job.polling_url, apiKey);
  
  console.log(`[PASSPORT_DEBUG] Mindee API v2 final result:`, JSON.stringify(result, null, 2));
  
  // Extract and validate data from the result
  const extracted: ExtractedPassportData = {};
  
  // Extract first name
  if (result.inference?.result?.fields?.given_names?.value && isValidName(result.inference.result.fields.given_names.value)) {
    extracted.firstName = result.inference.result.fields.given_names.value.trim();
  }
  
  // Extract last name
  if (result.inference?.result?.fields?.surnames?.value && isValidName(result.inference.result.fields.surnames.value)) {
    extracted.lastName = result.inference.result.fields.surnames.value.trim();
  }
  
  // Extract gender
  if (result.inference?.result?.fields?.sex?.value) {
    const mappedGender = mapGender(result.inference.result.fields.sex.value);
    if (mappedGender) {
      extracted.gender = mappedGender;
    }
  }
  
  // Extract date of birth
  if (result.inference?.result?.fields?.date_of_birth?.value && isValidDateFormat(result.inference.result.fields.date_of_birth.value)) {
    extracted.dateOfBirth = result.inference.result.fields.date_of_birth.value;
  }
  
  // Extract nationality
  if (result.inference?.result?.fields?.nationality?.value) {
    extracted.nationality = result.inference.result.fields.nationality.value.trim();
  }
  
  // Extract place of birth
  if (result.inference?.result?.fields?.place_of_birth?.value) {
    extracted.placeOfBirth = result.inference.result.fields.place_of_birth.value.trim();
  }
  
  // Extract passport number
  if (result.inference?.result?.fields?.passport_number?.value && isValidPassportNumber(result.inference.result.fields.passport_number.value)) {
    extracted.passportNumber = result.inference.result.fields.passport_number.value.trim();
  }
  
  // Extract issuing country
  if (result.inference?.result?.fields?.issuing_country?.value) {
    extracted.issuingCountry = result.inference.result.fields.issuing_country.value.trim();
  }
  
  // Extract date of issue
  if (result.inference?.result?.fields?.date_of_issue?.value && isValidDateFormat(result.inference.result.fields.date_of_issue.value)) {
    extracted.dateOfIssue = result.inference.result.fields.date_of_issue.value;
  }
  
  // Extract date of expiry
  if (result.inference?.result?.fields?.date_of_expiry?.value && isValidDateFormat(result.inference.result.fields.date_of_expiry.value)) {
    extracted.dateOfExpiry = result.inference.result.fields.date_of_expiry.value;
  }
  
  // Extract MRZ data
  if (result.inference?.result?.fields?.mrz_line_1?.value) {
    extracted.mrzLine1 = result.inference.result.fields.mrz_line_1.value.trim();
  }
  
  if (result.inference?.result?.fields?.mrz_line_2?.value) {
    extracted.mrzLine2 = result.inference.result.fields.mrz_line_2.value.trim();
  }

  return extracted;
}

// =============================================================================
// APPLICATION UPDATE LOGIC
// =============================================================================

async function updateApplicationWithPassportData(applicationId: string, extractedData: ExtractedPassportData): Promise<void> {
  // Get current application data
  const application = await db.selectFrom('sms_op.applications')
    .select(['application_payload'])
    .where('id', '=', applicationId)
    .executeTakeFirst();

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  const currentPayload = application.application_payload as Record<string, any>;
  
  // Prepare updates
  const updates: Record<string, any> = {};
  
  // Update personal details if available
  if (extractedData.firstName || extractedData.lastName || extractedData.gender || extractedData.dateOfBirth) {
    updates.personalDetails = {
      ...currentPayload.personalDetails,
      ...(extractedData.firstName && { firstName: extractedData.firstName }),
      ...(extractedData.lastName && { lastName: extractedData.lastName }),
      ...(extractedData.gender && { gender: extractedData.gender }),
      ...(extractedData.dateOfBirth && { dateOfBirth: extractedData.dateOfBirth }),
    };
  }
  
  // Update CRICOS details if international student and passport data available
  if (currentPayload.isInternationalStudent && (extractedData.passportNumber || extractedData.issuingCountry || extractedData.dateOfExpiry)) {
    updates.cricosDetails = {
      ...currentPayload.cricosDetails,
      ...(extractedData.passportNumber && { passportNumber: extractedData.passportNumber }),
      ...(extractedData.issuingCountry && { 
        countryOfCitizenshipId: mapCountryCode(extractedData.issuingCountry) || extractedData.issuingCountry 
      }),
      ...(extractedData.dateOfExpiry && { passportExpiryDate: extractedData.dateOfExpiry }),
    };
  }
  
  // Update AVETMISS details if nationality available
  if (extractedData.nationality) {
    const countryId = mapCountryCode(extractedData.nationality);
    if (countryId) {
      updates.avetmissDetails = {
        ...currentPayload.avetmissDetails,
        countryOfBirthId: countryId,
      };
    }
  }
  
  // Store raw passport data for reference
  updates.passportExtractionData = {
    ...currentPayload.passportExtractionData,
    extractedAt: new Date().toISOString(),
    rawData: extractedData,
  };

  // Update application if there are changes
  if (Object.keys(updates).length > 0) {
    const updatedPayload = {
      ...currentPayload,
      ...updates,
    };

    await db.updateTable('sms_op.applications')
      .set({
        application_payload: updatedPayload,
        updated_at: new Date(),
      })
      .where('id', '=', applicationId)
      .execute();
  }
}

// =============================================================================
// MAIN PROCESSING LOGIC
// =============================================================================

const processPassportLogic = async (req: Request, _ctx: ApiContext, body: unknown): Promise<Response> => {
  try {
    const { applicationId, documentId, documentPath } = body as ProcessPassportRequest;

    if (!applicationId || !documentId || !documentPath) {
      return new Response(JSON.stringify({ 
        message: 'Missing required fields: applicationId, documentId, documentPath' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate application exists
    const application = await db.selectFrom('sms_op.applications')
      .select(['id', 'status'])
      .where('id', '=', applicationId)
      .executeTakeFirst();

    if (!application) {
      return new Response(JSON.stringify({ message: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process passport with Mindee
    const extractedData = await processPassportWithMindee(documentPath);
    
    // Update application with extracted data
    await updateApplicationWithPassportData(applicationId, extractedData);

    // Log the processing
    console.log(`[PASSPORT_PROCESSED] Application: ${applicationId}, Document: ${documentId}`, {
      extractedFields: Object.keys(extractedData),
      extractedData,
    });

    return new Response(JSON.stringify({
      message: 'Passport processed successfully',
      extractedData,
      fieldsExtracted: Object.keys(extractedData),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[PASSPORT_PROCESS_ERROR]', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({
      message: 'Failed to process passport',
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// =============================================================================
// ROUTER
// =============================================================================

const passportProcessRouter = async (req: Request, ctx: ApiContext, body: unknown): Promise<Response> => {
  const method = req.method;

  if (method === 'POST') {
    return await processPassportLogic(req, ctx, body);
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: { ...corsHeaders, 'Allow': 'POST' } 
  });
};

const handler = createApiRoute(passportProcessRouter);

serve(handler);
