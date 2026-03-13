import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type * as TypeEnums from './enums';
import * as Enums from './enums';
import Moment from 'moment';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function currencyFormat(value: number | string): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
  };

  const numberValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numberValue)) return '';

  return new Intl.NumberFormat('en-US', options).format(numberValue);
}

export function percentFormat(value: number | string, decimals: number = 2): string {
  const options: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };

  const numberValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numberValue)) return '';

  return new Intl.NumberFormat('en-US', options).format(numberValue);
}

export function dateFormat2(value: string | Date | null | undefined, format = "MM/DD/YYYY"): string {
  if (!value) return "";
  return Moment.parseZone(value).format(format);
}

type CSharpEnums = Omit<typeof TypeEnums, 'GetEnumDescription' | 'EnumToDictionary' | 'EnumToArray' | 'EnumDescriptions'>;
type ObjectValue = string | "Unknow"
type CSharpItems = CSharpEnums[keyof CSharpEnums];
export function FindLabelOfEnum<T extends CSharpEnums>(nameEnum: keyof T | CSharpItems, value?: number): ObjectValue {
  const defaultResponse = "Unknow"
  let response: ObjectValue = defaultResponse
  try {
    const enumSelected = typeof nameEnum === "string" ? (Enums as any)[nameEnum] : nameEnum
    if (!enumSelected) return response
    const item = Enums.EnumToArray(enumSelected)?.filter((x) => x.value === value)[0] as any
    response = ((item?.label !== "") && !item?.label) ?
      "Unknow" : item?.label?.split('_')?.map((word: string) => word?.charAt(0)?.toUpperCase() + word?.slice(1)?.toLowerCase())?.join(' ')
  } catch {
    response = defaultResponse
  }
  return response;
}

export const stateAbbreviations: Record<string, string> = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
  "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
  "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
  "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
  "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
  "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
  "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
  "DC": "District of Columbia", "PR": "Puerto Rico"
};

export function getFullStateName(abbr: string): string {
  if (!abbr) return "";
  const normalized = abbr.toUpperCase().trim();
  return stateAbbreviations[normalized] || abbr;
}