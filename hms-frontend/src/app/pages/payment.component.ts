import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import { Appointment, Receipt } from '../models';
import {
  CARD_RE, CVV_RE, EXPIRY_RE, checkPersonName, digitsOnly, firstError, maskCard
} from '../services/validators';
import { LogoComponent } from '../components/logo.component';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, LogoComponent],
  template: `
    @if (receipt(); as r) {
      <!-- ================= RECEIPT ================= -->
      <div class="no-print">
        <h1>Payment Receipt</h1>
        <p>
          <button type="button" class="primary" (click)="print()">Print / save as PDF</button>
          <a routerLink="/dashboard"><button type="button">Back to my appointments</button></a>
        </p>
      </div>

      <div class="receipt" id="receipt">
        <div class="receipt-head">
          <app-logo [size]="44"></app-logo>
          <div class="receipt-org">
            104, 1st Floor, Sujata Chambers, Katha Bazaar,<br>
            Masjid Station (W), Mumbai 400009<br>
            Phone: +91 22 4971 3052 &middot; GSTIN: 27AAAAA0000A1Z5
          </div>
        </div>

        <h2 class="receipt-title">Consultation Fee Receipt</h2>

        <table class="receipt-meta">
          <tbody>
            <tr>
              <th>Receipt No.</th><td>{{ r.receiptNo || '-' }}</td>
              <th>Date</th><td>{{ r.paidAt ? (r.paidAt | date:'dd MMM yyyy, HH:mm') : '-' }}</td>
            </tr>
            <tr>
              <th>Patient</th><td>{{ r.patientName }}</td>
              <th>Mobile</th><td>{{ r.patientPhone }}</td>
            </tr>
            <tr>
              <th>Doctor</th><td>{{ r.doctorName }}</td>
              <th>Department</th><td>{{ r.departmentName }}</td>
            </tr>
            <tr>
              <th>Appointment</th>
              <td>{{ r.appointmentStart | date:'dd MMM yyyy, HH:mm' }} - {{ r.appointmentEnd | date:'HH:mm' }}</td>
              <th>Room</th><td>{{ r.roomNumber || 'To be assigned' }}</td>
            </tr>
          </tbody>
        </table>

        <table class="receipt-lines">
          <thead>
            <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Consultation — {{ r.specialty }} ({{ r.doctorName }})</td>
              <td style="text-align:right">&#8377;{{ r.amount }}</td>
            </tr>
            <tr>
              <th>Total paid</th>
              <th style="text-align:right">&#8377;{{ r.amount }}</th>
            </tr>
          </tbody>
        </table>

        <table class="receipt-meta">
          <tbody>
            <tr>
              <th>Payment status</th><td><strong>{{ r.status }}</strong></td>
              <th>Method</th><td>{{ r.method || '-' }}</td>
            </tr>
            <tr>
              <th>Card</th><td>{{ r.maskedCard || 'Not applicable' }}</td>
              <th>Card holder</th><td>{{ r.cardHolderName || '-' }}</td>
            </tr>
            <tr>
              <th>Transaction ref.</th><td colspan="3">{{ r.transactionRef || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <p class="receipt-note">
          Only the last four digits of the card are retained. This is a computer-generated receipt and
          does not require a signature. Please carry it on the day of your visit.
        </p>
      </div>
    } @else {
      <!-- ================= CARD FORM ================= -->
      <h1>Payment</h1>

      @if (appointment(); as a) {
        <table style="max-width:520px">
          <tbody>
            <tr><th>Doctor</th><td>{{ a.doctorName }} — {{ a.specialty }}</td></tr>
            <tr><th>Appointment</th><td>{{ a.startTime | date:'dd MMM yyyy, HH:mm' }} - {{ a.endTime | date:'HH:mm' }}</td></tr>
            <tr><th>Status</th><td class="status-{{ a.status }}"><strong>{{ a.status }}</strong></td></tr>
            <tr><th>Amount due</th><td><strong>&#8377;{{ a.amount }}</strong></td></tr>
          </tbody>
        </table>
      }

      <fieldset style="max-width:520px">
        <legend>Card details</legend>

        <label for="holder">Card holder name *</label>
        <input id="holder" name="holder" maxlength="60" [(ngModel)]="card.cardHolderName">

        <label for="number">Card number *</label>
        <input id="number" name="number" inputmode="numeric" autocomplete="off" maxlength="23"
               [value]="numberFocused ? rawNumber : maskedNumber()"
               (input)="onNumber($any($event.target).value)"
               (focus)="numberFocused = true" (blur)="numberFocused = false"
               placeholder="13-19 digits">
        <div class="muted">
          Stored as: <strong>{{ rawNumber.length >= 4 ? ('**** **** **** ' + rawNumber.slice(-4)) : '—' }}</strong>
          — the full number and CVV are never saved.
        </div>

        <label for="expiry">Expiry (MM/YY) *</label>
        <input id="expiry" name="expiry" inputmode="numeric" maxlength="5" placeholder="MM/YY"
               [ngModel]="card.expiry" (ngModelChange)="onExpiry($event)">

        <label for="cvv">CVV *</label>
        <input id="cvv" name="cvv" type="password" inputmode="numeric" maxlength="4" style="width:80px"
               [ngModel]="card.cvv" (ngModelChange)="onCvv($event)">

        <p class="muted">
          This is a simulated gateway (MockPaymentService). Do not enter a real card number.
        </p>
      </fieldset>

      <fieldset class="terms" style="max-width:520px">
        <legend>Terms and conditions</legend>
        <ol class="terms-list">
          <li>The consultation fee is charged per booked slot and covers one consultation with the
              selected doctor. Diagnostics, procedures, medicines and room charges are billed separately.</li>
          <li>Your booking stays <strong>Pending</strong> until the front desk approves it. If it is
              rejected, the full amount is refunded to the original payment method.</li>
          <li>Cancellations made before the appointment start time are refunded in full. The refund is
              initiated immediately and reaches your account in 5-7 working days.</li>
          <li>Arriving more than 15 minutes late may mean the slot is released to the next patient and
              the fee is treated as a no-show charge.</li>
          <li>Card details are handled by the payment gateway. This hospital stores only the last four
              digits, the card holder name and a transaction reference — never the full number or CVV.</li>
          <li>Your personal and medical information is used solely to deliver care and is retained as
              required by law. You may request a copy or a correction at any time.</li>
          <li>This receipt is a computer-generated document and is valid without a signature.</li>
        </ol>

        <label for="agree" class="agree-row">
          <input id="agree" name="agree" type="checkbox" [(ngModel)]="agreed">
          <span>I have read and agree to the terms and conditions above. <span class="req">*</span></span>
        </label>
        @if (!agreed) {
          <div class="field-error">You must accept the terms and conditions before paying.</div>
        }
      </fieldset>

      <p>
        <button type="button" class="primary" (click)="submit()" [disabled]="busy() || !agreed">
          {{ busy() ? 'Processing...' : 'Pay ' + (appointment()?.amount ? '\u20B9' + appointment()!.amount : '') }}
        </button>
        <a routerLink="/dashboard"><button type="button">Cancel</button></a>
      </p>
    }
  `
})
export class PaymentComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private popup = inject(PopupService);

  appointment = signal<Appointment | null>(null);
  receipt = signal<Receipt | null>(null);
  busy = signal(false);

  appointmentId = 0;
  rawNumber = '';
  numberFocused = false;
  agreed = false;
  card = { cardHolderName: '', expiry: '', cvv: '' };

  ngOnInit(): void {
    this.appointmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.api.myAppointments().subscribe({
      next: list => {
        const found = list.find(a => a.id === this.appointmentId) ?? null;
        this.appointment.set(found);
        if (!found) {
          this.popup.error('Appointment #' + this.appointmentId + ' was not found in your account.', 'Not found');
          return;
        }
        if (found.paymentStatus === 'PAID') { this.loadReceipt(); }
      },
      error: err => this.popup.error(readError(err), 'Could not load the appointment')
    });
  }

  private loadReceipt(): void {
    this.api.receipt(this.appointmentId).subscribe({
      next: r => this.receipt.set(r),
      error: err => this.popup.error(readError(err), 'Could not load the receipt')
    });
  }

  maskedNumber(): string { return maskCard(this.rawNumber); }

  onNumber(value: string): void { this.rawNumber = digitsOnly(value, 19); }

  onExpiry(value: string): void {
    const digits = digitsOnly(value, 4);
    this.card.expiry = digits.length <= 2 ? digits : digits.slice(0, 2) + '/' + digits.slice(2);
  }

  onCvv(value: string): void { this.card.cvv = digitsOnly(value, 4); }

  print(): void { window.print(); }

  submit(): void {
    if (!this.agreed) {
      this.popup.error('Please tick "I agree" to accept the terms and conditions before paying.',
        'Terms not accepted');
      return;
    }
    const problem = firstError(
      checkPersonName('Card holder name', this.card.cardHolderName),
      CARD_RE.test(this.rawNumber) ? null : 'Card number must be 13-19 digits',
      EXPIRY_RE.test(this.card.expiry) ? null : 'Expiry must be in MM/YY format',
      CVV_RE.test(this.card.cvv) ? null : 'CVV must be 3 or 4 digits');
    if (problem) { this.popup.error(problem, 'Please fix the card details'); return; }

    this.busy.set(true);
    this.api.pay(this.appointmentId, {
      cardHolderName: this.card.cardHolderName,
      cardNumber: this.rawNumber,
      expiry: this.card.expiry,
      cvv: this.card.cvv
    }).subscribe({
      next: r => {
        this.busy.set(false);
        this.rawNumber = '';
        this.agreed = false;
        this.card = { cardHolderName: '', expiry: '', cvv: '' };
        this.receipt.set(r);
        this.popup.success('Payment of \u20B9' + r.amount + ' received. Receipt ' + r.receiptNo + ' is ready to print.',
          'Payment successful');
      },
      error: err => {
        this.busy.set(false);
        this.popup.error(readError(err), 'Payment failed');
      }
    });
  }
}
