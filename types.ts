
export interface VendorMachine {
  name: string;
  brand?: string;
  origin?: string;
  description?: string;
}

export interface LicenseInfo {
  name: string;
  number?: string;
  issueDate?: string;
  expiryDate?: string;
  renewalLeadDays?: number;
  renewalSource?: string;
  notes?: string;
}

export interface MaintenanceContract {
  id: string;
  equipmentId: string;
  equipmentName: string;
  companyId: string;
  companyName: string;
  engineerIds: string[];
  startDate: string;
  endDate: string;
  amount: number;
  description: string;
  status: 'Active' | 'Expired';
  type: 'AMC' | 'CMC';
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Check' | 'Bank Transfer' | 'Mobile Banking' | 'Other';
  note: string;
  createdAt: string;
}

export interface PaymentReminder {
  id: string;
  sourceId: string;
  sourceType: 'service' | 'equipment';
  name: string;
  provider: string;
  amountToPay: number;
  scheduledDate: string;
  leadDays: number;
  status: 'Pending' | 'Paid' | 'Cancelled';
  notes: string;
  createdAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  groupName?: string;
  brand: string;
  type: string;
  model: string;
  serialNumber: string;
  quantity: number;
  purchasePrice: number;
  paidAmount: number;
  remainingAmount: number;
  purchaseDate: string;
  hasWarranty: boolean;
  warrantyDurationDays?: number; 
  warrantyExpiryDate?: string; 
  manufacturer: string;
  supplierId: string;
  supplierName: string;
  contractorIds: string[];
  warrantyPeriod: string; 
  amcType: 'AMC' | 'CMC' | 'None';
  amcProvider?: string;
  amcExpiry?: string;
  location: string;
  installationDate: string;
  expectedLifecycle: number;
  notes: string;
  status: 'Operational' | 'Under Maintenance' | 'Down' | 'Scrapped';
  documents: string[];
  licenseRequired: boolean;
  licenseInfo?: LicenseInfo;
  paymentHistory?: PaymentRecord[];
}

export interface Engineer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyId: string;
  companyName: string;
  specialties: string;
}

export interface ServiceLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  date: string;
  type: 'Preventive' | 'Corrective' | 'Calibration';
  description: string;
  partsReplaced: string[];
  cost: number;
  paidAmount: number;
  remainingAmount: number;
  companyName?: string;
  technicianName: string;
  remarks: string;
  documentUrl?: string;
  paymentHistory?: PaymentRecord[];
}

export interface SparePart {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  price: number;
  supplier: string;
  compatibility: string[];
}

export interface Vendor {
  id: string;
  companyName: string;
  email: string;
  address: string;
  machines: VendorMachine[];
  rating: number; 
  quotations: string[]; 
}

export interface Document {
  id: string;
  name: string;
  category: 'Manual' | 'Certificate' | 'Bill' | 'Quotation' | 'Other';
  equipmentId?: string;
  url: string;
  uploadDate: string;
}
