export var EnumDescriptions = new Map<any, Map<number, string>>();

export enum BooleanEnum {
  NO = 0,
  YES = 1,
}

EnumDescriptions.set(
  BooleanEnum,
  new Map<number, string>([
    [BooleanEnum.NO, 'No'],
    [BooleanEnum.YES, 'Yes'],
  ]),
);


export enum LoanStatusForFCIWebEnum {
  PERFORMING = 0,
  CLOSED = 1,
  PAID_OFF = 2,
  TRANSFERRED = 3,
  BANKRUPTCY = 4,
  FORECLOSURE = 5,
  REO = 6,
  CHARGE_OFF = 7,
  COMPLETE_CHARGE_OFF = 8,
  TRANSFERRED_OUT = 9,
  PAYOFF_DEMAND = 10,
  PRE_BOARDING = 11,
  FINAL_BOARDING = 12,
  RESPA = 13,
  LOSS_MIT_REQUEST = 14,
  ON_HOLD = 15,
  IMPORTED = 16,
  ESCROW_IMPOUNDS = 17,
  PRE_FORECLOSURE = 18,
  DELINQUENCY = 19,
  ASSIGNED = -1,
}

EnumDescriptions.set(
  LoanStatusForFCIWebEnum,
  new Map<number, string>([
    [LoanStatusForFCIWebEnum.PERFORMING, 'Performing'],
    [LoanStatusForFCIWebEnum.CLOSED, 'Closed'],
    [LoanStatusForFCIWebEnum.PAID_OFF, 'Paid Off'],
    [LoanStatusForFCIWebEnum.TRANSFERRED, 'Transferred'],
    [LoanStatusForFCIWebEnum.BANKRUPTCY, 'Bankruptcy'],
    [LoanStatusForFCIWebEnum.FORECLOSURE, 'Foreclosure'],
    [LoanStatusForFCIWebEnum.REO, 'REO'],
    [LoanStatusForFCIWebEnum.CHARGE_OFF, 'Charge Off'],
    [LoanStatusForFCIWebEnum.COMPLETE_CHARGE_OFF, 'Complete Charge Off'],
    [LoanStatusForFCIWebEnum.TRANSFERRED_OUT, 'Transferred out'],
    [LoanStatusForFCIWebEnum.PAYOFF_DEMAND, 'Payoff Demand'],
    [LoanStatusForFCIWebEnum.PRE_BOARDING, 'Pre Boarding'],
    [LoanStatusForFCIWebEnum.FINAL_BOARDING, 'Final Boarding'],
    [LoanStatusForFCIWebEnum.RESPA, 'RESPA'],
    [LoanStatusForFCIWebEnum.LOSS_MIT_REQUEST, 'Loss-Mit Request'],
    [LoanStatusForFCIWebEnum.ON_HOLD, 'On Hold'],
    [LoanStatusForFCIWebEnum.IMPORTED, 'Imported'],
    [LoanStatusForFCIWebEnum.ESCROW_IMPOUNDS, 'Escrow/Impounds'],
    [LoanStatusForFCIWebEnum.PRE_FORECLOSURE, 'Pre Foreclosure'],
    [LoanStatusForFCIWebEnum.DELINQUENCY, 'Delinquency'],
    [LoanStatusForFCIWebEnum.ASSIGNED, 'Assigned'],
  ]),
);

export enum PriorityEnum {
  ONE = 0,
  TWO = 1,
  THREE = 2,
  FOUR = 3,
  FIVE = 4,
  SIX = 5,
  SEVEN = 6,
  EIGHT = 7,
  NINE = 8,
  TEN = 9,
  UNS = 10,
}

EnumDescriptions.set(
  PriorityEnum,
  new Map<number, string>([
    [PriorityEnum.ONE, '1st'],
    [PriorityEnum.TWO, '2nd'],
    [PriorityEnum.THREE, '3rd'],
    [PriorityEnum.FOUR, '4th'],
    [PriorityEnum.FIVE, '5th'],
    [PriorityEnum.SIX, '6th'],
    [PriorityEnum.SEVEN, '7th'],
    [PriorityEnum.EIGHT, '8th'],
    [PriorityEnum.NINE, '9th'],
    [PriorityEnum.TEN, '10th'],
    [PriorityEnum.UNS, 'Uns'],
  ]),
);

export enum NoteTypeEnum {
  OTHER = 0,
  CONVENTIONAL = 1,
  CONSTRUCTION = 2,
  LINE_OF_CREDIT = 3,
  AUTO = 4,
  BUSINESS_PURPOSE_LOAN = 5,
  CASH_ADVANCE = 6,
  FANNIE_MAE = 7,
  FHA = 8,
  FREDDIE_MAC = 9,
  HECM = 10,
  HUD = 11,
  LEASE = 12,
  PERSONAL = 13,
  PURCHASE_CONTRACT = 14,
  UNSECURED = 16,
  VA = 17,
  SECURITIZED_LOAN = 18,
  DRAW_LOAN = 19,
}

EnumDescriptions.set(
  NoteTypeEnum,
  new Map<number, string>([
    [NoteTypeEnum.OTHER, 'Other'],
    [NoteTypeEnum.CONVENTIONAL, 'Conventional'],
    [NoteTypeEnum.CONSTRUCTION, 'Construction'],
    [NoteTypeEnum.LINE_OF_CREDIT, 'Line Of Credit'],
    [NoteTypeEnum.AUTO, 'Auto'],
    [NoteTypeEnum.BUSINESS_PURPOSE_LOAN, 'Business Purpose Loan'],
    [NoteTypeEnum.CASH_ADVANCE, 'Cash Advance'],
    [NoteTypeEnum.FANNIE_MAE, 'Fannie Mae'],
    [NoteTypeEnum.FHA, 'FHA'],
    [NoteTypeEnum.FREDDIE_MAC, 'Freddie Mac'],
    [NoteTypeEnum.HECM, 'HECM'],
    [NoteTypeEnum.HUD, 'HUD'],
    [NoteTypeEnum.LEASE, 'Lease'],
    [NoteTypeEnum.PERSONAL, 'Personal'],
    [NoteTypeEnum.PURCHASE_CONTRACT, 'Purchase Contract'],
    [NoteTypeEnum.UNSECURED, 'Unsecured'],
    [NoteTypeEnum.VA, 'VA'],
    [NoteTypeEnum.SECURITIZED_LOAN, 'Securitized Loan'],
    [NoteTypeEnum.DRAW_LOAN, 'Draw Loan'],
  ]),
);

export enum RateTypeEnum {
  OTHER = 0,
  FIXED_RATE = 1,
  ARM = 2,
  GRADUATED_TERMS = 3,
}

EnumDescriptions.set(
  RateTypeEnum,
  new Map<number, string>([
    [RateTypeEnum.OTHER, 'Other'],
    [RateTypeEnum.FIXED_RATE, 'Fixed Rate'],
    [RateTypeEnum.ARM, 'ARM'],
    [RateTypeEnum.GRADUATED_TERMS, 'GTM'],
  ]),
);
export function EnumToArray(typeEnum: any, replaceGuionForSpace: boolean = true): any[] {
	let values: any[] = [];
	for (var key in typeEnum) {
		if (typeof typeEnum[key] === 'string')
			values.push({ value: Number(key), label: (replaceGuionForSpace ? GetEnumDescription(key, typeEnum) : typeEnum[key]) });
	}
	return values;
}
function GetEnumDescription(key: any, typeEnum: any): string {
	var listLabel = EnumDescriptions.get(typeEnum);
	var label = undefined;
	if (listLabel !== undefined) label = listLabel.get(parseInt(key));
	if (label === undefined) {
	label = typeEnum[key];
	return label.split('_').map((word:string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
	}
	return label;
}
