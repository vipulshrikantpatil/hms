import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Appointment, Department, Doctor, Patient, Receipt, Room, Slot } from '../models';

export const API_BASE = 'http://localhost:8080/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ---- Public ----
  doctors(departmentId?: number, q?: string) {
    let params = new HttpParams();
    if (departmentId) { params = params.set('departmentId', departmentId); }
    if (q) { params = params.set('q', q); }
    return this.http.get<Doctor[]>(API_BASE + '/public/doctors', { params });
  }

  departments() {
    return this.http.get<Department[]>(API_BASE + '/public/departments');
  }

  slots(doctorId: number, date: string) {
    return this.http.get<Slot[]>(API_BASE + '/public/doctors/' + doctorId + '/slots',
      { params: new HttpParams().set('date', date) });
  }

  // ---- Patient ----
  profile() { return this.http.get<Patient>(API_BASE + '/patient/profile'); }
  updateProfile(body: unknown) { return this.http.put<Patient>(API_BASE + '/patient/profile', body); }
  myAppointments() { return this.http.get<Appointment[]>(API_BASE + '/patient/appointments'); }
  book(body: unknown) { return this.http.post<Appointment>(API_BASE + '/patient/appointments', body); }
  requestCancellation(id: number, remarks: string) {
    return this.http.patch<Appointment>(
      API_BASE + '/patient/appointments/' + id + '/cancel-request', { remarks });
  }
  pay(appointmentId: number, card: unknown) {
    return this.http.post<Receipt>(API_BASE + '/patient/appointments/' + appointmentId + '/pay', card);
  }
  receipt(appointmentId: number) {
    return this.http.get<Receipt>(API_BASE + '/patient/appointments/' + appointmentId + '/receipt');
  }
  freeRooms(start: string, end: string) {
    return this.http.get<Room[]>(API_BASE + '/patient/rooms/free',
      { params: new HttpParams().set('start', start).set('end', end) });
  }

  // ---- Admin ----
  pending() { return this.http.get<Appointment[]>(API_BASE + '/admin/appointments/pending'); }
  allAppointments() { return this.http.get<Appointment[]>(API_BASE + '/admin/appointments'); }
  approve(id: number, roomId?: number) {
    let params = new HttpParams();
    if (roomId) { params = params.set('roomId', roomId); }
    return this.http.patch<Appointment>(API_BASE + '/admin/appointments/' + id + '/approve', {}, { params });
  }
  reject(id: number, remarks: string) {
    return this.http.patch<Appointment>(API_BASE + '/admin/appointments/' + id + '/reject', { remarks });
  }
  deleteAppointment(id: number) { return this.http.delete<void>(API_BASE + '/admin/appointments/' + id); }
  cancellationRequests() {
    return this.http.get<Appointment[]>(API_BASE + '/admin/appointments/cancellation-requests');
  }
  approveCancellation(id: number) {
    return this.http.patch<Appointment>(API_BASE + '/admin/appointments/' + id + '/cancellation/approve', {});
  }
  rejectCancellation(id: number, remarks: string) {
    return this.http.patch<Appointment>(
      API_BASE + '/admin/appointments/' + id + '/cancellation/reject', { remarks });
  }
  markPaid(id: number) { return this.http.patch<void>(API_BASE + '/admin/appointments/' + id + '/mark-paid', {}); }

  adminDoctors() { return this.http.get<Doctor[]>(API_BASE + '/admin/doctors'); }
  createDoctor(body: unknown) { return this.http.post<Doctor>(API_BASE + '/admin/doctors', body); }
  updateDoctor(id: number, body: unknown) { return this.http.put<Doctor>(API_BASE + '/admin/doctors/' + id, body); }
  deleteDoctor(id: number) { return this.http.delete<void>(API_BASE + '/admin/doctors/' + id); }

  adminDepartments() { return this.http.get<Department[]>(API_BASE + '/admin/departments'); }
  createDepartment(body: unknown) { return this.http.post<Department>(API_BASE + '/admin/departments', body); }
  updateDepartment(id: number, body: unknown) { return this.http.put<Department>(API_BASE + '/admin/departments/' + id, body); }
  deleteDepartment(id: number) { return this.http.delete<void>(API_BASE + '/admin/departments/' + id); }

  adminRooms() { return this.http.get<Room[]>(API_BASE + '/admin/rooms'); }
  createRoom(body: unknown) { return this.http.post<Room>(API_BASE + '/admin/rooms', body); }
  updateRoom(id: number, body: unknown) { return this.http.put<Room>(API_BASE + '/admin/rooms/' + id, body); }
  deleteRoom(id: number) { return this.http.delete<void>(API_BASE + '/admin/rooms/' + id); }

  adminPatients() { return this.http.get<Patient[]>(API_BASE + '/admin/patients'); }
  updatePatientStatus(id: number, status: string) {
    return this.http.patch<Patient>(API_BASE + '/admin/patients/' + id + '/status', {},
      { params: new HttpParams().set('status', status) });
  }
  deletePatients(ids: number[]) {
    return this.http.delete<void>(API_BASE + '/admin/patients',
      { params: new HttpParams().set('ids', ids.join(',')) });
  }
  deleteAppointments(ids: number[]) {
    return this.http.delete<void>(API_BASE + '/admin/appointments',
      { params: new HttpParams().set('ids', ids.join(',')) });
  }
  updatePatient(id: number, body: unknown) { return this.http.put<Patient>(API_BASE + '/admin/patients/' + id, body); }
  deletePatient(id: number) { return this.http.delete<void>(API_BASE + '/admin/patients/' + id); }
}
