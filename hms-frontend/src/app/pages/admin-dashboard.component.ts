import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../services/api.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import {
  checkMobile, checkPersonName, checkTextName, digitsOnly, firstError
} from '../services/validators';
import { Appointment, Department, Doctor, Patient, Room } from '../models';

type Tab = 'queue' | 'cancellations' | 'appointments' | 'doctors' | 'departments' | 'rooms' | 'patients';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Admin Dashboard</h1>

    <div class="tabbar">
      @for (t of tabs; track t) {
        <button type="button" class="tab" (click)="select(t)" [disabled]="tab() === t">{{ labels[t] }}</button>
      }
    </div>

    <!-- ================= REQUEST QUEUE ================= -->
    @if (tab() === 'queue') {
      <h2>Pending Requests ({{ pending().length }})</h2>
      <table>
        <thead>
          <tr><th>Patient</th><th>Doctor</th><th>Date &amp; time</th><th>Room</th><th>Reason</th>
              <th>Assign room</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (a of pending(); track a.id) {
            <tr>
              <td>
                {{ a.patientName }}<br><span class="muted">Patient #{{ a.patientId }}</span>
                @if (a.firstVisit) { <br><span class="muted"><strong>First visit</strong></span> }
              </td>
              <td>{{ a.doctorName }}<br><span class="muted">{{ a.specialty }}</span></td>
              <td>{{ a.startTime | date:'dd MMM yyyy, HH:mm' }} - {{ a.endTime | date:'HH:mm' }}</td>
              <td>{{ a.roomNumber || '-' }}</td>
              <td>{{ a.reason || '-' }}</td>
              <td>
                <select name="assign-{{ a.id }}" [(ngModel)]="assignedRoom[a.id]" style="width:150px">
                  <option [ngValue]="null">-- keep as is --</option>
                  @for (r of roomsFor(a); track r.id) {
                    <option [ngValue]="r.id">{{ r.roomNumber }} ({{ r.roomType }})</option>
                  }
                </select>
                @if (a.firstVisit) {
                  <br><span class="muted">First visit — consultation rooms only</span>
                }
              </td>
              <td>
                <button type="button" class="success" (click)="approve(a)">Approve</button>
                <button type="button" class="danger" (click)="reject(a)">Reject</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="muted">The queue is empty.</td></tr>
          }
        </tbody>
      </table>
    }

    <!-- ================= CANCELLATION REQUESTS ================= -->
    @if (tab() === 'cancellations') {
      <h2>Cancellation Requests ({{ cancellations().length }})</h2>
      <p class="muted">
        Patients cannot cancel on their own. Approving releases the slot and refunds any payment
        automatically; declining puts the appointment back to its previous status.
      </p>
      <table>
        <thead>
          <tr><th>#</th><th>Patient</th><th>Doctor</th><th>Date &amp; time</th><th>Room</th>
              <th>Patient's reason</th><th>Payment</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (a of cancellations(); track a.id) {
            <tr>
              <td>{{ a.id }}</td>
              <td>{{ a.patientName }}<br><span class="muted">#{{ a.patientId }}</span></td>
              <td>{{ a.doctorName }}<br><span class="muted">{{ a.specialty }}</span></td>
              <td>{{ a.startTime | date:'dd MMM yyyy, HH:mm' }} - {{ a.endTime | date:'HH:mm' }}</td>
              <td>{{ a.roomNumber || '-' }}</td>
              <td class="remarks-cell">{{ a.cancellationReason || '-' }}</td>
              <td>
                {{ a.paymentStatus || '-' }}
                @if (a.amount) { <span class="muted">(&#8377;{{ a.amount }})</span> }
              </td>
              <td>
                <button type="button" class="success" (click)="approveCancellation(a)">Approve</button>
                <button type="button" class="danger" (click)="rejectCancellation(a)">Decline</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="muted">No cancellation requests waiting.</td></tr>
          }
        </tbody>
      </table>
    }

    <!-- ================= ALL APPOINTMENTS ================= -->
    @if (tab() === 'appointments') {
      <h2>All Appointments</h2>

      <div class="searchbar">
        <span>
          <label for="apptId">Appointment ID</label>
          <input id="apptId" name="apptId" inputmode="numeric" placeholder="e.g. 14"
                 [(ngModel)]="apptId" (ngModelChange)="apptId = digits(apptId)">
        </span>
        <span>
          <label for="apptDate">Appointment date</label>
          <input id="apptDate" name="apptDate" type="date" [(ngModel)]="apptDate">
        </span>
        <span class="searchbar-actions">
          <button type="button" (click)="clearAppointmentSearch()">Clear</button>
          <button type="button" class="danger" (click)="deleteSelectedAppointments()"
                  [disabled]="!selectedAppointments.size">
            Delete selected ({{ selectedAppointments.size }})
          </button>
        </span>
      </div>
      <p class="muted">Showing {{ filteredAppointments().length }} of {{ appointments().length }} appointments.</p>

      <table>
        <thead>
          <tr>
            <th style="width:34px">
              <input type="checkbox" name="allAppts" [checked]="allAppointmentsChecked()"
                     (change)="toggleAllAppointments($any($event.target).checked)"
                     aria-label="Select all appointments">
            </th>
            <th>#</th><th>Patient</th><th>Doctor</th><th>Date &amp; time</th><th>Room</th>
            <th>Status</th><th>Remarks</th><th>Payment</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (a of filteredAppointments(); track a.id) {
            <tr>
              <td>
                <input type="checkbox" name="appt-{{ a.id }}" [checked]="selectedAppointments.has(a.id)"
                       (change)="toggleAppointment(a.id)" attr.aria-label="Select appointment {{ a.id }}">
              </td>
              <td>{{ a.id }}</td>
              <td>{{ a.patientName }}<br><span class="muted">#{{ a.patientId }}</span></td>
              <td>{{ a.doctorName }}</td>
              <td>{{ a.startTime | date:'dd MMM yyyy, HH:mm' }}</td>
              <td>{{ a.roomNumber || '-' }}</td>
              <td class="status-{{ a.status }}"><strong>{{ a.status }}</strong></td>
              <td class="remarks-cell">{{ a.adminRemarks || '-' }}</td>
              <td>{{ a.paymentStatus || '-' }} @if (a.amount) { <span class="muted">(&#8377;{{ a.amount }})</span> }</td>
              <td>
                @if (a.paymentStatus === 'PENDING') {
                  <button type="button" (click)="markPaid(a)">Mark paid</button>
                }
                <button type="button" class="danger" (click)="deleteAppointment(a)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="10" class="muted">No appointments match this search.</td></tr>
          }
        </tbody>
      </table>
    }

    <!-- ================= DOCTORS ================= -->
    @if (tab() === 'doctors') {
      <h2>Doctors</h2>

      <div class="searchbar">
        <span>
          <label for="docId">Doctor ID</label>
          <input id="docId" name="docId" inputmode="numeric" placeholder="e.g. 3"
                 [(ngModel)]="docId" (ngModelChange)="docId = digits(docId)">
        </span>
        <span>
          <label for="docText">Specialization or department</label>
          <input id="docText" name="docText" placeholder="e.g. Cardiology" [(ngModel)]="docText">
        </span>
        <span class="searchbar-actions">
          <button type="button" (click)="clearDoctorSearch()">Clear</button>
        </span>
      </div>
      <p class="muted">Showing {{ filteredDoctors().length }} of {{ doctors().length }} doctors.</p>

      <fieldset>
        <legend>{{ doctorForm.id ? 'Edit doctor #' + doctorForm.id : 'Add doctor' }}</legend>
        <div class="row">
          <div>
            <label for="dFullName">Full name *</label>
            <input id="dFullName" name="dFullName" [(ngModel)]="doctorForm.fullName" maxlength="100">
            <label for="dSpecialty">Specialty *</label>
            <input id="dSpecialty" name="dSpecialty" [(ngModel)]="doctorForm.specialty" maxlength="80">
            <label for="dQual">Qualification</label>
            <input id="dQual" name="dQual" [(ngModel)]="doctorForm.qualification" maxlength="120">
            <label for="dPhone">Mobile number *</label>
            <input id="dPhone" name="dPhone" inputmode="numeric" maxlength="10"
                   placeholder="10 digits, starts 6-9"
                   [ngModel]="doctorForm.phone" (ngModelChange)="onDoctorPhone($event)">
            <label for="dYears">Years of experience * <span class="muted">(1-70)</span></label>
            <input id="dYears" name="dYears" type="number" min="1" max="70" style="width:110px"
                   [(ngModel)]="doctorForm.yearsExperience">
          </div>
          <div>
            <label for="dDept">Department *</label>
            <select id="dDept" name="dDept" [(ngModel)]="doctorForm.departmentId">
              <option [ngValue]="null">-- select --</option>
              @for (dep of departments(); track dep.id) { <option [ngValue]="dep.id">{{ dep.name }}</option> }
            </select>
            <label for="dFee">Consultation fee * <span class="muted">(max &#8377;10,000)</span></label>
            <input id="dFee" name="dFee" type="number" min="0" max="10000"
                   [(ngModel)]="doctorForm.consultationFee">
            <label for="dSlot">Slot minutes *</label>
            <input id="dSlot" name="dSlot" type="number" min="5" max="240" [(ngModel)]="doctorForm.slotMinutes">
            <label for="dFrom">Available from *</label>
            <input id="dFrom" name="dFrom" type="time" [(ngModel)]="doctorForm.availableFrom">
            <label for="dTo">Available to *</label>
            <input id="dTo" name="dTo" type="time" [(ngModel)]="doctorForm.availableTo">
            <label for="dActive"><input id="dActive" name="dActive" type="checkbox" [(ngModel)]="doctorForm.active"> Active</label>
          </div>
        </div>
        <p>
          <button type="button" class="primary" (click)="saveDoctor()">
            {{ doctorForm.id ? 'Update doctor' : 'Add doctor' }}
          </button>
          @if (doctorForm.id) { <button type="button" (click)="resetDoctor()">Cancel</button> }
        </p>
      </fieldset>

      <table>
        <thead>
          <tr><th>#</th><th>Name</th><th>Specialty</th><th>Department</th><th>Experience</th><th>Fee</th>
              <th>Slot</th><th>Hours</th><th>Active</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (d of filteredDoctors(); track d.id) {
            <tr>
              <td>{{ d.id }}</td><td>{{ d.fullName }}</td><td>{{ d.specialty }}</td>
              <td>{{ d.departmentName }}</td>
              <td>{{ d.yearsExperience }} yr{{ d.yearsExperience === 1 ? '' : 's' }}</td>
              <td>&#8377;{{ d.consultationFee }}</td>
              <td>{{ d.slotMinutes }} min</td><td>{{ d.availableFrom }}-{{ d.availableTo }}</td>
              <td>{{ d.active ? 'Yes' : 'No' }}</td>
              <td>
                <button type="button" (click)="editDoctor(d)">Edit</button>
                <button type="button" class="danger" (click)="deleteDoctor(d)">Deactivate</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="10" class="muted">No doctors match this search.</td></tr> }
        </tbody>
      </table>
    }

    <!-- ================= DEPARTMENTS ================= -->
    @if (tab() === 'departments') {
      <h2>Departments</h2>
      <fieldset>
        <legend>{{ deptForm.id ? 'Edit department #' + deptForm.id : 'Add department' }}</legend>
        <label for="depName">Name *</label>
        <input id="depName" name="depName" [(ngModel)]="deptForm.name" maxlength="80">
        <label for="depDesc">Description</label>
        <textarea id="depDesc" name="depDesc" rows="2" maxlength="500" [(ngModel)]="deptForm.description"></textarea>
        <label for="depActive"><input id="depActive" name="depActive" type="checkbox" [(ngModel)]="deptForm.active"> Active</label>
        <p>
          <button type="button" class="primary" (click)="saveDepartment()">
            {{ deptForm.id ? 'Update department' : 'Add department' }}
          </button>
          @if (deptForm.id) { <button type="button" (click)="resetDepartment()">Cancel</button> }
        </p>
      </fieldset>

      <table>
        <thead><tr><th>#</th><th>Name</th><th>Description</th><th>Doctors</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          @for (dep of departments(); track dep.id) {
            <tr>
              <td>{{ dep.id }}</td><td>{{ dep.name }}</td><td>{{ dep.description || '-' }}</td>
              <td>{{ dep.doctorCount }}</td><td>{{ dep.active ? 'Yes' : 'No' }}</td>
              <td>
                <button type="button" (click)="editDepartment(dep)">Edit</button>
                <button type="button" class="danger" (click)="deleteDepartment(dep)">Delete</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="6" class="muted">No departments.</td></tr> }
        </tbody>
      </table>
    }

    <!-- ================= ROOMS ================= -->
    @if (tab() === 'rooms') {
      <h2>Rooms</h2>
      <fieldset>
        <legend>{{ roomForm.id ? 'Edit room #' + roomForm.id : 'Add room' }}</legend>
        <label for="rNumber">Room number *</label>
        <input id="rNumber" name="rNumber" [(ngModel)]="roomForm.roomNumber" maxlength="20">
        <label for="rType">Type *</label>
        <select id="rType" name="rType" [(ngModel)]="roomForm.roomType">
          @for (t of roomTypes; track t) { <option [value]="t">{{ t }}</option> }
        </select>
        <label for="rFloor">Floor</label>
        <input id="rFloor" name="rFloor" type="number" min="0" max="50" [(ngModel)]="roomForm.floorNo">
        <label for="rActive"><input id="rActive" name="rActive" type="checkbox" [(ngModel)]="roomForm.active"> Active</label>
        <p>
          <button type="button" class="primary" (click)="saveRoom()">
            {{ roomForm.id ? 'Update room' : 'Add room' }}
          </button>
          @if (roomForm.id) { <button type="button" (click)="resetRoom()">Cancel</button> }
        </p>
      </fieldset>

      <table>
        <thead><tr><th>#</th><th>Number</th><th>Type</th><th>Floor</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          @for (r of rooms(); track r.id) {
            <tr>
              <td>{{ r.id }}</td><td>{{ r.roomNumber }}</td><td>{{ r.roomType }}</td>
              <td>{{ floorLabel(r.floorNo) }}</td><td>{{ r.active ? 'Yes' : 'No' }}</td>
              <td>
                <button type="button" (click)="editRoom(r)">Edit</button>
                <button type="button" class="danger" (click)="deleteRoom(r)">Deactivate</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="6" class="muted">No rooms.</td></tr> }
        </tbody>
      </table>
    }

    <!-- ================= PATIENTS ================= -->
    @if (tab() === 'patients') {
      <h2>Patients</h2>

      <div class="searchbar">
        <span>
          <label for="patId">Patient ID</label>
          <input id="patId" name="patId" inputmode="numeric" placeholder="e.g. 7"
                 [(ngModel)]="patId" (ngModelChange)="patId = digits(patId)">
        </span>
        <span>
          <label for="patDate">Appointment date</label>
          <input id="patDate" name="patDate" type="date" [(ngModel)]="patDate">
        </span>
        <span class="searchbar-actions">
          <button type="button" (click)="clearPatientSearch()">Clear</button>
          <button type="button" class="danger" (click)="deleteSelectedPatients()"
                  [disabled]="!selectedPatients.size">
            Delete selected ({{ selectedPatients.size }})
          </button>
        </span>
      </div>
      <p class="muted">Showing {{ filteredPatients().length }} of {{ patients().length }} patients.</p>

      @if (patientForm.id) {
        <fieldset>
          <legend>Edit patient #{{ patientForm.id }}</legend>
          <label for="pName">Full name *</label>
          <input id="pName" name="pName" [(ngModel)]="patientForm.fullName" maxlength="100">
          <label for="pPhone">Mobile number *</label>
          <input id="pPhone" name="pPhone" inputmode="numeric" maxlength="10"
                 placeholder="10 digits, starts 6-9"
                 [ngModel]="patientForm.phone" (ngModelChange)="onPatientPhone($event)">
          <label for="pAddress">Address</label>
          <textarea id="pAddress" name="pAddress" rows="2" maxlength="255" [(ngModel)]="patientForm.address"></textarea>
          <p>
            <button type="button" class="primary" (click)="savePatient()">Update patient</button>
            <button type="button" (click)="resetPatient()">Cancel</button>
          </p>
        </fieldset>
      }

      <table>
        <thead>
          <tr>
            <th style="width:34px">
              <input type="checkbox" name="allPatients" [checked]="allPatientsChecked()"
                     (change)="toggleAllPatients($any($event.target).checked)"
                     aria-label="Select all patients">
            </th>
            <th>#</th><th>Name</th><th>Email</th><th>Mobile</th><th>DOB</th><th>Blood</th>
            <th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (p of filteredPatients(); track p.id) {
            <tr>
              <td>
                <input type="checkbox" name="pat-{{ p.id }}" [checked]="selectedPatients.has(p.id)"
                       (change)="togglePatient(p.id)" attr.aria-label="Select patient {{ p.id }}">
              </td>
              <td>{{ p.id }}</td><td>{{ p.fullName }}</td><td>{{ p.email }}</td><td>{{ p.phone }}</td>
              <td>{{ p.dateOfBirth || '-' }}</td><td>{{ p.bloodGroup || '-' }}</td>
              <td class="pstatus-{{ p.status }}"><strong>{{ p.status }}</strong></td>
              <td>
                @if (p.status !== 'ADMITTED') {
                  <button type="button" class="success" (click)="setStatus(p, 'ADMITTED')">Admit</button>
                } @else {
                  <button type="button" (click)="setStatus(p, 'DISCHARGED')">Discharge</button>
                }
                <button type="button" (click)="editPatient(p)">Edit</button>
                <button type="button" class="danger" (click)="deletePatient(p)">Delete</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="9" class="muted">No patients match this search.</td></tr> }
        </tbody>
      </table>
      <p class="muted">
        A patient is discharged automatically once their last appointment has finished.
      </p>
    }
  `
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private popup = inject(PopupService);

  tabs: Tab[] = ['queue', 'cancellations', 'appointments', 'doctors', 'departments', 'rooms', 'patients'];
  labels: Record<Tab, string> = {
    queue: 'Request Queue', cancellations: 'Cancellation Requests', appointments: 'Appointments',
    doctors: 'Doctors', departments: 'Departments', rooms: 'Rooms', patients: 'Patients'
  };
  roomTypes = ['CONSULTATION', 'OPERATION', 'WARD', 'ICU'];

  tab = signal<Tab>('queue');

  pending = signal<Appointment[]>([]);
  cancellations = signal<Appointment[]>([]);
  appointments = signal<Appointment[]>([]);
  doctors = signal<Doctor[]>([]);
  departments = signal<Department[]>([]);
  rooms = signal<Room[]>([]);
  patients = signal<Patient[]>([]);

  // ---- search state (plain fields: two-way bound, so Clear resets the inputs too) ----
  apptId = '';
  apptDate = '';
  docId = '';
  docText = '';
  patId = '';
  patDate = '';

  // ---- multi-select state ----
  selectedAppointments = new Set<number>();
  selectedPatients = new Set<number>();

  assignedRoom: Record<number, number | null> = {};

  doctorForm = this.blankDoctor();
  private static readonly FIRST_VISIT_ROOM = 'CONSULTATION';
  deptForm = { id: 0, name: '', description: '', active: true };
  roomForm = { id: 0, roomNumber: '', roomType: 'CONSULTATION', floorNo: null as number | null, active: true };
  patientForm = { id: 0, fullName: '', phone: '', address: '', dateOfBirth: '', gender: '', bloodGroup: '' };

  // ---- filtered views (plain methods so they re-evaluate on every change detection run) ----
  filteredAppointments(): Appointment[] {
    const id = this.apptId.trim();
    const date = this.apptDate;
    return this.appointments().filter(a =>
      (!id || String(a.id) === id) &&
      (!date || a.startTime.substring(0, 10) === date));
  }

  filteredDoctors(): Doctor[] {
    const id = this.docId.trim();
    const text = this.docText.trim().toLowerCase();
    return this.doctors().filter(d =>
      (!id || String(d.id) === id) &&
      (!text || d.specialty.toLowerCase().includes(text)
             || d.departmentName.toLowerCase().includes(text)
             || d.fullName.toLowerCase().includes(text)));
  }

  filteredPatients(): Patient[] {
    const id = this.patId.trim();
    const date = this.patDate;
    const idsOnDate = date
      ? new Set(this.appointments().filter(a => a.startTime.substring(0, 10) === date).map(a => a.patientId))
      : null;
    return this.patients().filter(p =>
      (!id || String(p.id) === id) &&
      (!idsOnDate || idsOnDate.has(p.id)));
  }

  allAppointmentsChecked(): boolean {
    const rows = this.filteredAppointments();
    return rows.length > 0 && rows.every(a => this.selectedAppointments.has(a.id));
  }

  allPatientsChecked(): boolean {
    const rows = this.filteredPatients();
    return rows.length > 0 && rows.every(p => this.selectedPatients.has(p.id));
  }

  ngOnInit(): void {
    this.loadPending();
    this.loadCancellations();
    this.loadRooms();
    this.loadDepartments();
  }

  digits(value: string): string { return digitsOnly(value, 9); }

  activeRooms(): Room[] { return this.rooms().filter(r => r.active); }

  /** First-time visitors are seen in a consultation room only. */
  roomsFor(a: Appointment): Room[] {
    const rooms = this.activeRooms();
    return a.firstVisit
      ? rooms.filter(r => r.roomType === AdminDashboardComponent.FIRST_VISIT_ROOM)
      : rooms;
  }

  floorLabel(floor: number | null | undefined): string {
    if (floor === null || floor === undefined) { return '-'; }
    return floor === 0 ? 'Ground floor' : 'Floor ' + floor;
  }

  select(t: Tab): void {
    this.tab.set(t);
    if (t === 'queue') { this.loadPending(); this.loadRooms(); }
    if (t === 'cancellations') { this.loadCancellations(); }
    if (t === 'appointments') { this.loadAppointments(); }
    if (t === 'doctors') { this.loadDoctors(); this.loadDepartments(); }
    if (t === 'departments') { this.loadDepartments(); }
    if (t === 'rooms') { this.loadRooms(); }
    if (t === 'patients') { this.loadPatients(); this.loadAppointments(); }
  }

  private fail = (err: unknown) => this.popup.error(readError(err), 'Request failed');
  private ok(msg: string, title = 'Success'): void { this.popup.success(msg, title); }
  private invalid(msg: string): void { this.popup.error(msg, 'Please fix the form'); }

  onDoctorPhone(value: string): void { this.doctorForm.phone = digitsOnly(value, 10); }
  onPatientPhone(value: string): void { this.patientForm.phone = digitsOnly(value, 10); }

  // ---- loaders ----
  loadPending(): void { this.api.pending().subscribe({ next: v => this.pending.set(v), error: this.fail }); }
  loadCancellations(): void {
    this.api.cancellationRequests().subscribe({ next: v => this.cancellations.set(v), error: this.fail });
  }
  loadAppointments(): void {
    this.api.allAppointments().subscribe({
      next: v => { this.appointments.set(v); this.prune(this.selectedAppointments, v.map(a => a.id)); },
      error: this.fail
    });
  }
  loadDoctors(): void { this.api.adminDoctors().subscribe({ next: v => this.doctors.set(v), error: this.fail }); }
  loadDepartments(): void { this.api.adminDepartments().subscribe({ next: v => this.departments.set(v), error: this.fail }); }
  loadRooms(): void { this.api.adminRooms().subscribe({ next: v => this.rooms.set(v), error: this.fail }); }
  loadPatients(): void {
    this.api.adminPatients().subscribe({
      next: v => { this.patients.set(v); this.prune(this.selectedPatients, v.map(p => p.id)); },
      error: this.fail
    });
  }

  private prune(selection: Set<number>, existing: number[]): void {
    const alive = new Set(existing);
    [...selection].filter(id => !alive.has(id)).forEach(id => selection.delete(id));
  }

  // ---- search helpers ----
  clearAppointmentSearch(): void { this.apptId = ''; this.apptDate = ''; }
  clearDoctorSearch(): void { this.docId = ''; this.docText = ''; }
  clearPatientSearch(): void { this.patId = ''; this.patDate = ''; }

  // ---- selection ----
  toggleAppointment(id: number): void {
    if (this.selectedAppointments.has(id)) {
      this.selectedAppointments.delete(id);
    } else {
      this.selectedAppointments.add(id);
    }
  }

  toggleAllAppointments(checked: boolean): void {
    this.filteredAppointments().forEach(a =>
      checked ? this.selectedAppointments.add(a.id) : this.selectedAppointments.delete(a.id));
  }

  togglePatient(id: number): void {
    if (this.selectedPatients.has(id)) {
      this.selectedPatients.delete(id);
    } else {
      this.selectedPatients.add(id);
    }
  }

  toggleAllPatients(checked: boolean): void {
    this.filteredPatients().forEach(p =>
      checked ? this.selectedPatients.add(p.id) : this.selectedPatients.delete(p.id));
  }

  deleteSelectedAppointments(): void {
    const ids = [...this.selectedAppointments];
    if (!ids.length) { return; }
    this.popup.confirm({
      title: 'Delete appointments',
      message: 'Delete ' + ids.length + ' appointment(s)? This also removes their payment records and cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => this.api.deleteAppointments(ids).subscribe({
        next: () => {
          this.selectedAppointments.clear();
          this.ok(ids.length + ' appointment(s) deleted.', 'Deleted');
          this.loadAppointments();
        },
        error: this.fail
      })
    });
  }

  deleteSelectedPatients(): void {
    const ids = [...this.selectedPatients];
    if (!ids.length) { return; }
    this.popup.confirm({
      title: 'Delete patients',
      message: 'Delete ' + ids.length + ' patient(s)? This also removes their appointment history and cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => this.api.deletePatients(ids).subscribe({
        next: () => {
          this.selectedPatients.clear();
          this.ok(ids.length + ' patient(s) deleted.', 'Deleted');
          this.loadPatients();
        },
        error: this.fail
      })
    });
  }

  // ---- queue actions ----
  approve(a: Appointment): void {
    const roomId = this.assignedRoom[a.id] ?? undefined;
    this.api.approve(a.id, roomId).subscribe({
      next: () => { this.ok('Appointment #' + a.id + ' for ' + a.patientName + ' has been approved.', 'Approved'); this.loadPending(); },
      error: this.fail
    });
  }

  reject(a: Appointment): void {
    this.popup.confirm({
      title: 'Reject request',
      message: 'Reject appointment #' + a.id + ' for ' + a.patientName + '? The patient sees your remarks.',
      input: {
        label: 'Reason for rejecting *',
        placeholder: 'e.g. Doctor is on leave that day',
        maxLength: 255,
        requiredMessage: 'Rejection remarks are mandatory.'
      },
      confirmLabel: 'Reject request',
      onConfirm: remarks => this.api.reject(a.id, remarks).subscribe({
        next: () => {
          this.ok('Appointment #' + a.id + ' has been rejected and the patient can see your remarks.', 'Rejected');
          this.loadPending();
        },
        error: this.fail
      })
    });
  }

  approveCancellation(a: Appointment): void {
    this.popup.confirm({
      title: 'Approve cancellation',
      message: 'Cancel appointment #' + a.id + ' for ' + a.patientName + '? The slot is released and '
        + (a.paymentStatus === 'PAID' ? 'the payment is refunded automatically.' : 'no payment was collected.'),
      confirmLabel: 'Approve cancellation',
      onConfirm: () => this.api.approveCancellation(a.id).subscribe({
        next: () => {
          this.ok('Appointment #' + a.id + ' cancelled and the patient notified in their remarks.', 'Cancelled');
          this.loadCancellations();
        },
        error: this.fail
      })
    });
  }

  rejectCancellation(a: Appointment): void {
    this.popup.confirm({
      title: 'Decline cancellation',
      message: 'Appointment #' + a.id + ' goes back to its previous status and the patient sees your reason.',
      input: {
        label: 'Reason for declining *',
        placeholder: 'e.g. Within 24 hours of the slot - please attend or call the desk',
        maxLength: 255,
        requiredMessage: 'Remarks are mandatory when declining a request.'
      },
      confirmLabel: 'Decline request',
      onConfirm: remarks => this.api.rejectCancellation(a.id, remarks).subscribe({
        next: () => { this.ok('Cancellation request declined.', 'Declined'); this.loadCancellations(); },
        error: this.fail
      })
    });
  }

  markPaid(a: Appointment): void {
    this.api.markPaid(a.id).subscribe({
      next: () => { this.ok('Payment recorded for #' + a.id + '.'); this.loadAppointments(); },
      error: this.fail
    });
  }

  deleteAppointment(a: Appointment): void {
    this.popup.confirm({
      title: 'Delete appointment',
      message: 'Delete appointment #' + a.id + ' for ' + a.patientName + '? This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => this.api.deleteAppointment(a.id).subscribe({
        next: () => { this.ok('Appointment deleted.'); this.loadAppointments(); },
        error: this.fail
      })
    });
  }

  // ---- doctors ----
  private blankDoctor() {
    return {
      id: 0, departmentId: null as number | null, fullName: '', specialty: '', qualification: '',
      phone: '', yearsExperience: 1, consultationFee: 0, slotMinutes: 30,
      availableFrom: '09:00', availableTo: '17:00', active: true
    };
  }

  editDoctor(d: Doctor): void {
    this.doctorForm = {
      id: d.id, departmentId: d.departmentId, fullName: d.fullName, specialty: d.specialty,
      qualification: d.qualification ?? '', phone: d.phone ?? '', yearsExperience: d.yearsExperience,
      consultationFee: d.consultationFee, slotMinutes: d.slotMinutes,
      availableFrom: d.availableFrom.substring(0, 5), availableTo: d.availableTo.substring(0, 5),
      active: d.active
    };
  }

  resetDoctor(): void { this.doctorForm = this.blankDoctor(); }

  saveDoctor(): void {
    const f = this.doctorForm;
    const years = Number(f.yearsExperience);
    const problem = firstError(
      checkPersonName('Doctor name', f.fullName),
      checkTextName('Specialty', f.specialty, 3, 80),
      f.departmentId ? null : 'Please select a department',
      checkMobile(f.phone),
      f.qualification && f.qualification.length > 120 ? 'Qualification cannot exceed 120 characters' : null,
      f.yearsExperience === null || f.yearsExperience === undefined || isNaN(years)
        ? 'Years of experience is required'
        : (!Number.isInteger(years) ? 'Years of experience must be a whole number'
          : (years < 1 || years > 70 ? 'Years of experience must be between 1 and 70' : null)),
      f.consultationFee === null || f.consultationFee === undefined || isNaN(Number(f.consultationFee))
        ? 'Consultation fee is required'
        : (Number(f.consultationFee) < 0 ? 'Consultation fee cannot be negative'
          : (Number(f.consultationFee) > 10000 ? 'Consultation fee cannot exceed 10,000' : null)),
      !f.slotMinutes || f.slotMinutes < 5 || f.slotMinutes > 240
        ? 'Slot duration must be between 5 and 240 minutes' : null,
      !f.availableFrom || !f.availableTo ? 'Availability start and end times are required' : null,
      f.availableFrom && f.availableTo && f.availableTo <= f.availableFrom
        ? 'Availability end time must be after the start time' : null,
      this.windowTooShort(f) ? 'The working window is shorter than one appointment slot' : null);
    if (problem) { this.invalid(problem); return; }

    const body = {
      departmentId: f.departmentId, fullName: f.fullName, specialty: f.specialty,
      qualification: f.qualification || null, phone: f.phone,
      yearsExperience: years, consultationFee: f.consultationFee, slotMinutes: f.slotMinutes,
      availableFrom: f.availableFrom + ':00', availableTo: f.availableTo + ':00', active: f.active
    };
    const call = f.id ? this.api.updateDoctor(f.id, body) : this.api.createDoctor(body);
    call.subscribe({
      next: d => {
        this.ok(d.fullName + (f.id ? ' has been updated.' : ' has been added to ' + d.departmentName + '.'));
        this.resetDoctor();
        this.loadDoctors();
      },
      error: this.fail
    });
  }

  private windowTooShort(f: { availableFrom: string; availableTo: string; slotMinutes: number }): boolean {
    if (!f.availableFrom || !f.availableTo || !f.slotMinutes) { return false; }
    const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    return toMinutes(f.availableTo) - toMinutes(f.availableFrom) < f.slotMinutes;
  }

  /**
   * The server refuses if any patient is still linked to this doctor - that message is
   * what the error popup shows.
   */
  deleteDoctor(d: Doctor): void {
    this.popup.confirm({
      title: 'Deactivate doctor',
      message: 'Deactivate ' + d.fullName + '? They stop appearing in booking while their past '
        + 'appointments are kept.',
      confirmLabel: 'Deactivate',
      onConfirm: () => this.api.deleteDoctor(d.id).subscribe({
        next: () => { this.ok(d.fullName + ' has been deactivated.'); this.loadDoctors(); },
        error: err => this.popup.error(readError(err), 'Cannot deactivate this doctor')
      })
    });
  }

  // ---- departments ----
  editDepartment(dep: Department): void {
    this.deptForm = { id: dep.id, name: dep.name, description: dep.description ?? '', active: dep.active };
  }

  resetDepartment(): void { this.deptForm = { id: 0, name: '', description: '', active: true }; }

  saveDepartment(): void {
    const f = this.deptForm;
    const problem = firstError(
      checkTextName('Department name', f.name, 3, 80),
      f.description && f.description.length > 500 ? 'Description cannot exceed 500 characters' : null,
      !f.id && this.departments().some(d => d.name.trim().toLowerCase() === f.name.trim().toLowerCase())
        ? 'A department with this name already exists' : null);
    if (problem) { this.invalid(problem); return; }

    const body = { name: f.name, description: f.description || null, active: f.active };
    const call = f.id ? this.api.updateDepartment(f.id, body) : this.api.createDepartment(body);
    call.subscribe({
      next: d => {
        this.ok('Department "' + d.name + '" has been ' + (f.id ? 'updated' : 'created') + '.');
        this.resetDepartment();
        this.loadDepartments();
      },
      error: this.fail
    });
  }

  deleteDepartment(dep: Department): void {
    this.popup.confirm({
      title: 'Delete department',
      message: 'Delete ' + dep.name + '? Departments with active doctors cannot be removed.',
      confirmLabel: 'Delete',
      onConfirm: () => this.api.deleteDepartment(dep.id).subscribe({
        next: () => { this.ok('Department deleted.'); this.loadDepartments(); },
        error: err => this.popup.error(readError(err), 'Cannot delete this department')
      })
    });
  }

  // ---- rooms ----
  editRoom(r: Room): void {
    this.roomForm = { id: r.id, roomNumber: r.roomNumber, roomType: r.roomType, floorNo: r.floorNo ?? null, active: r.active };
  }

  resetRoom(): void {
    this.roomForm = { id: 0, roomNumber: '', roomType: 'CONSULTATION', floorNo: null, active: true };
  }

  saveRoom(): void {
    const f = this.roomForm;
    const problem = firstError(
      !f.roomNumber.trim() ? 'Room number is required' : null,
      !/^[A-Za-z0-9-]{2,20}$/.test(f.roomNumber.trim())
        ? 'Room number may contain letters, digits and hyphens only (2-20 characters)' : null,
      f.floorNo !== null && (f.floorNo < 0 || f.floorNo > 50) ? 'Floor must be between 0 and 50' : null,
      !f.id && this.rooms().some(r => r.roomNumber.toLowerCase() === f.roomNumber.trim().toLowerCase())
        ? 'This room number already exists' : null);
    if (problem) { this.invalid(problem); return; }

    const body = { roomNumber: f.roomNumber, roomType: f.roomType, floorNo: f.floorNo, active: f.active };
    const call = f.id ? this.api.updateRoom(f.id, body) : this.api.createRoom(body);
    call.subscribe({
      next: r => { this.ok('Room ' + r.roomNumber + ' has been ' + (f.id ? 'updated' : 'added') + '.');
                   this.resetRoom(); this.loadRooms(); },
      error: this.fail
    });
  }

  /** The server refuses while a patient is still booked into the room. */
  deleteRoom(r: Room): void {
    this.popup.confirm({
      title: 'Deactivate room',
      message: 'Deactivate room ' + r.roomNumber + '? It stops being offered for new bookings.',
      confirmLabel: 'Deactivate',
      onConfirm: () => this.api.deleteRoom(r.id).subscribe({
        next: () => { this.ok('Room ' + r.roomNumber + ' has been deactivated.'); this.loadRooms(); },
        error: err => this.popup.error(readError(err), 'Cannot deactivate this room')
      })
    });
  }

  // ---- patients ----
  editPatient(p: Patient): void {
    this.patientForm = {
      id: p.id, fullName: p.fullName, phone: p.phone, address: p.address ?? '',
      dateOfBirth: p.dateOfBirth ?? '', gender: p.gender ?? '', bloodGroup: p.bloodGroup ?? ''
    };
  }

  resetPatient(): void {
    this.patientForm = { id: 0, fullName: '', phone: '', address: '', dateOfBirth: '', gender: '', bloodGroup: '' };
  }

  savePatient(): void {
    const f = this.patientForm;
    const problem = firstError(
      checkPersonName('Full name', f.fullName),
      checkMobile(f.phone));
    if (problem) { this.invalid(problem); return; }

    const body = {
      fullName: f.fullName, phone: f.phone, address: f.address || null,
      dateOfBirth: f.dateOfBirth || null, gender: f.gender || null, bloodGroup: f.bloodGroup || null
    };
    this.api.updatePatient(f.id, body).subscribe({
      next: () => { this.ok('Patient updated.'); this.resetPatient(); this.loadPatients(); }, error: this.fail
    });
  }

  setStatus(p: Patient, status: 'ADMITTED' | 'DISCHARGED'): void {
    this.api.updatePatientStatus(p.id, status).subscribe({
      next: updated => {
        this.ok(p.fullName + ' has been marked ' + updated.status.toLowerCase() + '.', 'Status updated');
        this.loadPatients();
      },
      error: this.fail
    });
  }

  deletePatient(p: Patient): void {
    this.popup.confirm({
      title: 'Delete patient',
      message: 'Delete ' + p.fullName + '? This also removes their appointment history and cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => this.api.deletePatient(p.id).subscribe({
        next: () => { this.ok('Patient deleted.'); this.loadPatients(); },
        error: this.fail
      })
    });
  }
}
