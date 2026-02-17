export interface DispatchItem {
  product: string;
  variety: string;
  size: string;
  trayType: string;
  quantity: number;
  weight?: number; // kg per unit (unit_weight)
}

export interface Dispatch {
  id: string;
  growerName: string;
  growerCode: string;
  dispatchDate: string;
  expectedArrival: string;
  conNoteNumber: string;
  carrier: string;
  totalPallets: number;
  items: DispatchItem[];
  notes: string;
  status: 'pending' | 'in-transit' | 'arrived' | 'received' | 'issue';
  createdAt: string;
  issues?: ReceivingIssue[];
}

export interface ReceivingIssue {
  type: 'damage' | 'missing-paperwork' | 'quantity-short' | 'quality' | 'temperature' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  itemIndex?: number;
}

export const PRODUCE_CATEGORIES = [
  'Apples', 'Avocados', 'Bananas', 'Berries', 'Broccoli', 'Capsicum',
  'Carrots', 'Celery', 'Cherries', 'Citrus', 'Corn', 'Grapes',
  'Herbs', 'Kiwifruit', 'Lettuce', 'Mangoes', 'Melons', 'Mushrooms',
  'Onions', 'Pears', 'Potatoes', 'Pumpkin', 'Spinach', 'Stonefruit',
  'Tomatoes', 'Zucchini', 'Other'
];

export const TRAY_TYPES = [
  'Standard Tray', 'Half Tray', 'Bulk Bin', 'Carton', 'Crate', 'Pallet', 'Bag', 'Punnet', 'Other'
];

export const SIZES = [
  'Small', 'Medium', 'Large', 'Extra Large', 'Mixed', 'N/A'
];

export const ISSUE_TYPES: { value: ReceivingIssue['type']; label: string }[] = [
  { value: 'damage', label: 'Stock Damaged (Transport)' },
  { value: 'quality', label: 'Poor Quality / Condition' },
  { value: 'temperature', label: 'Temperature Breach' },
  { value: 'quantity-short', label: 'Quantity Short' },
  { value: 'missing-paperwork', label: 'Missing Paperwork' },
  { value: 'other', label: 'Other' },
];
