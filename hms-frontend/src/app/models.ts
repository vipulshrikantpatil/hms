export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type AppointmentStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'COMPLETED';
export type RoomType = 'CONSULTATION' | 'OPERATION' | 'WARD' | 'ICU';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PatientStatus = 'REGISTERED' | 'ADMITTED' | 'DISCHARGED';

export interface AuthResponse {
  token: string;
  email: string;
  role: Role;
  fullName: string;
  patientId: number | null;
}

export interface Doctor {
  id: number;
  fullName: string;
  specialty: string;
  qualification?: string;
  phone?: string;
  yearsExperience: number;
  consultationFee: number;
  slotMinutes: number;
  availableFrom: string;
  availableTo: string;
  departmentId: number;
  departmentName: string;
  active: boolean;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  doctorCount: number;
}

export interface Room {
  id: number;
  roomNumber: string;
  roomType: RoomType;
  floorNo?: number;
  active: boolean;
}

export interface Patient {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  address?: string;
  status: PatientStatus;
}

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  specialty: string;
  roomId?: number;
  roomNumber?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason?: string;
  adminRemarks?: string;
  cancellationReason?: string;
  amount?: number;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  receiptNo?: string;
  maskedCard?: string;
  timeline: 'UPCOMING' | 'VISITED';
  firstVisit: boolean;
}

export interface Receipt {
  receiptNo: string;
  appointmentId: number;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  specialty: string;
  departmentName: string;
  roomNumber?: string;
  appointmentStart: string;
  appointmentEnd: string;
  amount: number;
  status: string;
  method?: string;
  maskedCard?: string;
  cardHolderName?: string;
  transactionRef?: string;
  paidAt?: string;
}

export interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  fieldErrors: Record<string, string>;
}
