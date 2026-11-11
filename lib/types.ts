export type TableShape = "circle" | "rect" | "oval" | "bar";

export interface CafeTable {
  id: string;
  name: string;
  hall: string;
  shape: TableShape;
  x: number;
  y: number;
  w: number;
  h: number;
  seats: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  toKitchen: boolean;
  active: boolean;
}

export type OrderStatus =
  | "draft"
  | "waiting_cashier"
  | "kitchen"
  | "ready"
  | "paid"
  | "canceled";

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  note: string;
}

export type OrderSource = "pos" | "ai" | "operator" | "online";

export interface Order {
  id: string;
  number: number;
  tableId: string | null;
  tableName: string;
  guestName: string;
  guestPhone: string;
  source: OrderSource;
  status: OrderStatus;
  items: OrderItem[];
  comment: string;
  createdAt: string;
  updatedAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  printedAt: string | null;
  paidAt: string | null;
  paymentMethod: "cash" | "card" | null;
  callId?: string;
}

export interface TranscriptLine {
  role: "ai" | "guest";
  text: string;
  at: string;
}

export interface Conversation {
  id: string;
  orderId: string | null;
  guestPhone: string;
  startedAt: string;
  endedAt: string | null;
  lines: TranscriptLine[];
  summary: string;
  recordingId?: string | null;
  externalId?: string;
}

export type Role = "admin" | "cashier" | "waiter" | "cook";

export interface Staff {
  id: string;
  name: string;
  role: Role;
  login: string;
  /** scrypt$salt$hash — mijozga hech qachon yuborilmaydi */
  passHash: string;
  active: boolean;
}

export type PublicStaff = Omit<Staff, "passHash"> & { hasPassword: boolean };

export interface Me {
  id: string;
  name: string;
  role: Role;
}

export interface Settings {
  cafeName: string;
  currency: string;
  serviceFeePercent: number;
  receiptHeader: string;
  receiptFooter: string;
  autoPrintKitchen: boolean;
  paperMm: number;
  branchesText: string;
  aboutText: string;
  instagram: string;
  aiGreeting: string;
  aiVoiceLang: string;
  aiEnabled: boolean;
  aiSystemExtra: string;
}

export interface DbState {
  tables: CafeTable[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  conversations: Conversation[];
  staff: Staff[];
  settings: Settings;
  counter: number;
  /** Printer signali: qaysi kompyuter oxirgi marta qachon "men printerga ulanganman" degan */
  printers?: { kitchen?: string; kassa?: string };
  /** sessiya imzosi uchun maxfiy kalit — hech qachon mijozga yuborilmaydi */
  authSecret: string;
}
