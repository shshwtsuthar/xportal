/**
 * AVETMISS NAT00120: Funding source - national
 * Predominant source of funding for the specific unit of competency (subject).
 * 2-char alphanumeric codes.
 */

export type FundingSourceNationalCode =
  | '11'
  | '13'
  | '15'
  | '20'
  | '30'
  | '31'
  | '32'
  | '80';

export type FundingSourceNationalOption = {
  value: FundingSourceNationalCode;
  label: string;
};

export const FUNDING_SOURCE_NATIONAL_OPTIONS: FundingSourceNationalOption[] = [
  {
    value: '11',
    label: '11 – Commonwealth and State general purpose recurrent',
  },
  {
    value: '13',
    label: '13 – Commonwealth specific purpose programs',
  },
  {
    value: '15',
    label: '15 – State specific purpose programs',
  },
  {
    value: '20',
    label: '20 – Domestic client - fee for service',
  },
  {
    value: '30',
    label: '30 – International full fee paying client',
  },
  {
    value: '31',
    label: '31 – International client - exemption',
  },
  {
    value: '32',
    label: '32 – International client - offshore',
  },
  {
    value: '80',
    label: '80 – Revenue from industry',
  },
];
