import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import {
  checkBirthDate, checkMobile, checkPersonName, digitsOnly, earliestBirthDate, firstError
} from '../services/validators';
import { Appointment, Patient } from '../models';

type View = 'profile' | 'appointments';
type Filter = 'UPCOMING' | 'VISITED' | 'CANCELLED' | 'ALL';

/** Statuses that put an appointment in the Cancelled tab. */
const CLOSED: string[] = ['CANCEL_REQUESTED', 'CANCELLED', 'REJECTED'];

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <h1>My Account</h1>

    <div class="tabbar">
      <button type="button" class="tab" (click)="view.set('profile')" [disabled]="view() === 'profile'">Profile</button>
      <button type="button" class="tab" (click)="view.set('appointments')" [disabled]="view() === 'appointments'">
        Appointments ({{ appointments().length }})
      </button>
      <span class="spacer"></span>
      <a routerLink="/book"><button type="button" class="primary">Book an appointment</button></a>
    </div>

    @if (view() === 'profile') {
      <h2>My Profile</h2>
      @if (profile(); as p) {
        <label for="fullName">Full name *</label>
        <input id="fullName" name="fullName" maxlength="100" [(ngModel)]="form.fullName">

        <label for="phone">Mobile number *</label>
        <input id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10 digits, starts 6-9"
               [ngModel]="form.phone" (ngModelChange)="onPhone($event)">

        <label for="dob">Date of birth</label>
        <input id="dob" name="dateOfBirth" type="date" [min]="earliestDob" [max]="today"
               [(ngModel)]="form.dateOfBirth">
        <div class="muted">Past date only, and not more than 100 years ago.</div>

        <label for="gender">Gender</label>
        <select id="gender" name="gender" [(ngModel)]="form.gender">
          <option value="">-- select --</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>

        <label for="blood">Blood group</label>
        <select id="blood" name="bloodGroup" [(ngModel)]="form.bloodGroup">
          <option value="">-- select --</option>
          @for (bg of bloodGroups; track bg) { <option [value]="bg">{{ bg }}</option> }
        </select>

        <label for="address">Address</label>
        <textarea id="address" name="address" rows="3" maxlength="255" [(ngModel)]="form.address"></textarea>

        <p class="muted">Registered email: {{ p.email }}</p>
        <p><button type="button" class="primary" (click)="save()">Save profile</button></p>
      }
    }

    @if (view() === 'appointments') {
      <h2 id="appointments">My Appointments</h2>
      <div class="tabbar">
        <button type="button" class="tab" (click)="filter.set('UPCOMING')" [disabled]="filter() === 'UPCOMING'">
          Upcoming ({{ upcoming().length }})
        </button>
        <button type="button" class="tab" (click)="filter.set('VISITED')" [disabled]="filter() === 'VISITED'">
          Visited ({{ visited().length }})
        </button>
        <button type="button" class="tab" (click)="filter.set('CANCELLED')" [disabled]="filter() === 'CANCELLED'">
          Cancelled ({{ cancelled().length }})
        </button>
        <button type="button" class="tab" (click)="filter.set('ALL')" [disabled]="filter() === 'ALL'">
          All ({{ appointments().length }})
        </button>
      </div>

      <table>
        <thead>
          <tr><th>Visit</th><th>Date &amp; time</th><th>Doctor</th><th>Specialty</th><th>Room</th>
              <th>Status</th><th>Admin remarks</th><th>Fee</th><th>Payment</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (a of shown(); track a.id) {
            <tr>
              <td class="status-{{ a.timeline === 'UPCOMING' ? 'APPROVED' : 'COMPLETED' }}">
                <strong>{{ a.timeline === 'UPCOMING' ? 'Upcoming' : 'Visited' }}</strong>
              </td>
              <td>{{ a.startTime | date:'dd MMM yyyy, HH:mm' }} - {{ a.endTime | date:'HH:mm' }}</td>
              <td>{{ a.doctorName }}</td>
              <td>{{ a.specialty }}</td>
              <td>{{ a.roomNumber || '-' }}</td>
              <td class="status-{{ a.status }}"><strong>{{ a.status }}</strong></td>
              <td class="remarks-cell">
                {{ a.adminRemarks || '-' }}
                @if (a.cancellationReason) {
                  <br><span class="muted">Your reason: {{ a.cancellationReason }}</span>
                }
              </td>
              <td>{{ a.amount ? '&#8377;' + a.amount : '-' }}</td>
              <td>
                {{ a.paymentStatus || '-' }}
                @if (a.maskedCard) { <br><span class="muted">{{ a.maskedCard }}</span> }
              </td>
              <td>
                @if (a.paymentStatus === 'PENDING' && a.status !== 'REJECTED' && a.status !== 'CANCELLED') {
                  <button type="button" class="primary" (click)="pay(a)">Pay</button>
                }
                @if (a.paymentStatus === 'PAID') {
                  <button type="button" (click)="pay(a)">Receipt</button>
                }
                @if (a.timeline === 'UPCOMING' && (a.status === 'PENDING' || a.status === 'APPROVED')) {
                  <button type="button" class="danger" (click)="cancel(a)">Request cancellation</button>
                }
                @if (a.status === 'CANCEL_REQUESTED') {
                  <span class="muted">Awaiting front-desk decision</span>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="10" class="muted">No {{ filter() === 'ALL' ? '' : filter().toLowerCase() }} appointments.</td></tr>
          }
        </tbody>
      </table>
    }
  `
})
export class PatientDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private popup = inject(PopupService);
  private router = inject(Router);

  profile = signal<Patient | null>(null);
  appointments = signal<Appointment[]>([]);
  view = signal<View>('profile');
  filter = signal<Filter>('UPCOMING');

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  today = new Date().toISOString().substring(0, 10);
  earliestDob = earliestBirthDate();

  form = { fullName: '', phone: '', dateOfBirth: '', gender: '', bloodGroup: '', address: '' };

  upcoming = computed(() =>
    this.appointments().filter(a => a.timeline === 'UPCOMING' && !CLOSED.includes(a.status)));
  visited = computed(() =>
    this.appointments().filter(a => a.timeline === 'VISITED' && !CLOSED.includes(a.status)));
  cancelled = computed(() => this.appointments().filter(a => CLOSED.includes(a.status)));
  shown = computed(() => {
    switch (this.filter()) {
      case 'UPCOMING': return this.upcoming();
      case 'VISITED': return this.visited();
      case 'CANCELLED': return this.cancelled();
      default: return this.appointments();
    }
  });

  ngOnInit(): void {
    if (window.location.hash.includes('appointments')) { this.view.set('appointments'); }
    this.loadProfile();
    this.loadAppointments();
  }

  onPhone(value: string): void { this.form.phone = digitsOnly(value, 10); }

  private loadProfile(): void {
    this.api.profile().subscribe({
      next: p => {
        this.profile.set(p);
        this.form = {
          fullName: p.fullName, phone: p.phone,
          dateOfBirth: p.dateOfBirth ?? '', gender: p.gender ?? '',
          bloodGroup: p.bloodGroup ?? '', address: p.address ?? ''
        };
      },
      error: err => this.popup.error(readError(err), 'Could not load profile')
    });
  }

  private loadAppointments(): void {
    this.api.myAppointments().subscribe({
      next: list => this.appointments.set(list),
      error: err => this.popup.error(readError(err), 'Could not load appointments')
    });
  }

  save(): void {
    const problem = firstError(
      checkPersonName('Full name', this.form.fullName),
      checkMobile(this.form.phone),
      checkBirthDate(this.form.dateOfBirth));
    if (problem) { this.popup.error(problem, 'Please fix the form'); return; }

    const payload = {
      ...this.form,
      dateOfBirth: this.form.dateOfBirth || null,
      gender: this.form.gender || null,
      bloodGroup: this.form.bloodGroup || null,
      address: this.form.address || null
    };
    this.api.updateProfile(payload).subscribe({
      next: p => { this.profile.set(p); this.popup.success('Your profile has been updated.', 'Profile saved'); },
      error: err => this.popup.error(readError(err), 'Update failed')
    });
  }

  pay(a: Appointment): void {
    this.router.navigate(['/payment', a.id]);
  }

  /**
   * Patients cannot cancel directly - they raise a request with a reason and the front
   * desk approves or declines it.
   */
  cancel(a: Appointment): void {
    this.popup.confirm({
      title: 'Request cancellation',
      message: 'Your appointment with ' + a.doctorName + ' on '
        + new Date(a.startTime).toLocaleString()
        + ' will stay booked until the front desk approves this request.',
      input: {
        label: 'Reason for cancelling *',
        placeholder: 'e.g. I am travelling that week',
        maxLength: 255,
        requiredMessage: 'Please tell the front desk why you want to cancel.'
      },
      confirmLabel: 'Send request',
      cancelLabel: 'Keep appointment',
      onConfirm: reason => this.api.requestCancellation(a.id, reason).subscribe({
        next: () => {
          this.popup.success(
            'Your cancellation request has been sent to the front desk. You will see the decision here, '
            + 'and any payment is refunded once it is approved.', 'Request sent');
          this.loadAppointments();
        },
        error: err => this.popup.error(readError(err), 'Request failed')
      })
    });
  }
}
