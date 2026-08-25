import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import { Doctor, Room, Slot } from '../models';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Book an Appointment</h1>
    <label for="doctor">Doctor *</label>
    <select id="doctor" name="doctorId" [(ngModel)]="doctorId" (ngModelChange)="onDoctorChange()">
      <option [ngValue]="null">-- select a doctor --</option>
      @for (d of doctors(); track d.id) {
        <option [ngValue]="d.id">{{ d.fullName }} — {{ d.specialty }} (&#8377;{{ d.consultationFee }})</option>
      }
    </select>

    @if (selectedDoctor(); as d) {
      <p class="muted">
        {{ d.departmentName }} &middot; consulting {{ d.availableFrom }}–{{ d.availableTo }}
        &middot; {{ d.slotMinutes }} minute slots &middot; fee &#8377;{{ d.consultationFee }}
      </p>
    }

    <label for="date">Date *</label>
    <input id="date" name="date" type="date" [min]="today" [(ngModel)]="date" (ngModelChange)="loadSlots()">

    <label for="slot">Available time slot *</label>
    <select id="slot" name="slot" [(ngModel)]="selectedSlot" (ngModelChange)="onSlotChange()" [disabled]="!slots().length">
      <option [ngValue]="null">-- select a slot --</option>
      @for (s of slots(); track s.startTime) {
        <option [ngValue]="s" [disabled]="!s.available">
          {{ s.startTime | date:'HH:mm' }} - {{ s.endTime | date:'HH:mm' }}
          {{ s.available ? '(available)' : '(booked)' }}
        </option>
      }
    </select>
    @if (doctorId && date && !slots().length) {
      <p class="muted">No slots published for this date.</p>
    }

    <label for="room">Room <span class="muted">(optional — front desk can assign one)</span></label>
    <select id="room" name="roomId" [(ngModel)]="roomId" [disabled]="!selectedSlot">
      <option [ngValue]="null">-- no room preference --</option>
      @for (r of freeRooms(); track r.id) {
        <option [ngValue]="r.id">{{ r.roomNumber }} ({{ r.roomType }})</option>
      }
    </select>
    @if (selectedSlot && !freeRooms().length) {
      <p class="muted">All rooms are occupied in this slot — the desk will reassign on approval.</p>
    }

    <label for="reason">Reason for visit</label>
    <textarea id="reason" name="reason" rows="3" maxlength="255" [(ngModel)]="reason"></textarea>

    <fieldset style="margin-top:12px">
      <legend>Payment</legend>
      <p class="muted">
        Consultation fee: <strong>&#8377;{{ selectedDoctor()?.consultationFee ?? '-' }}</strong>.
        Payment is recorded as PENDING and collected at the desk. The PaymentService placeholder is
        ready for a gateway integration.
      </p>
    </fieldset>

    <p>
      <button type="button" class="primary" (click)="submit()" [disabled]="busy() || !doctorId || !selectedSlot">
        {{ busy() ? 'Submitting...' : 'Request Appointment' }}
      </button>
    </p>
    <p class="muted">Your request goes to the front desk for approval. Track its status on your dashboard.</p>
  `
})
export class BookComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private popup = inject(PopupService);

  doctors = signal<Doctor[]>([]);
  slots = signal<Slot[]>([]);
  freeRooms = signal<Room[]>([]);
  selectedDoctor = signal<Doctor | null>(null);
  busy = signal(false);

  today = new Date().toISOString().substring(0, 10);
  doctorId: number | null = null;
  date = this.today;
  selectedSlot: Slot | null = null;
  roomId: number | null = null;
  reason = '';

  ngOnInit(): void {
    this.api.doctors().subscribe({
      next: list => {
        this.doctors.set(list);
        const preset = Number(this.route.snapshot.queryParams['doctorId']);
        if (preset) { this.doctorId = preset; this.onDoctorChange(); }
      },
      error: err => this.popup.error(readError(err), 'Could not load doctors')
    });
  }

  onDoctorChange(): void {
    this.selectedDoctor.set(this.doctors().find(d => d.id === this.doctorId) ?? null);
    this.selectedSlot = null;
    this.freeRooms.set([]);
    this.loadSlots();
  }

  loadSlots(): void {
    this.selectedSlot = null;
    if (!this.doctorId || !this.date) { this.slots.set([]); return; }
    this.api.slots(this.doctorId, this.date).subscribe({
      next: list => this.slots.set(list),
      error: err => { this.slots.set([]); this.popup.error(readError(err), 'Could not load slots'); }
    });
  }

  onSlotChange(): void {
    this.roomId = null;
    if (!this.selectedSlot) { this.freeRooms.set([]); return; }
    this.api.freeRooms(this.selectedSlot.startTime, this.selectedSlot.endTime).subscribe({
      next: list => this.freeRooms.set(list),
      error: err => this.popup.error(readError(err), 'Could not load rooms')
    });
  }

  submit(): void {
    if (!this.selectedSlot) { return; }
    this.busy.set(true);
    this.api.book({
      doctorId: this.doctorId,
      roomId: this.roomId,
      startTime: this.selectedSlot.startTime,
      reason: this.reason || null
    }).subscribe({
      next: a => {
        this.busy.set(false);
        this.reason = '';
        this.selectedSlot = null;
        this.popup.success(
          'Your request for ' + a.doctorName + ' has been submitted and is awaiting front-desk approval. '
          + 'Pay the consultation fee from your appointments list.',
          'Appointment requested');
        this.router.navigate(['/dashboard'], { fragment: 'appointments' });
      },
      error: err => { this.busy.set(false); this.popup.error(readError(err), 'Booking failed'); this.loadSlots(); }
    });
  }
}
