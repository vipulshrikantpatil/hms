import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import {
  checkBirthDate, checkEmail, checkMobile, checkPassword, checkPersonName, digitsOnly,
  earliestBirthDate, firstError
} from '../services/validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1>Patient Registration</h1>

    <fieldset>
      <legend>Login details</legend>

      <label for="email">Email *</label>
      <input id="email" name="email" type="email" maxlength="120"
             [(ngModel)]="form.email" (blur)="touch('email')">
      @if (touched['email'] && errors().email) { <div class="field-error">{{ errors().email }}</div> }

      <label for="password">Password *</label>
      <input id="password" name="password" [type]="showPassword ? 'text' : 'password'" maxlength="50"
             [(ngModel)]="form.password" (blur)="touch('password')">
      @if (touched['password'] && errors().password) { <div class="field-error">{{ errors().password }}</div> }

      <label for="confirmPassword">Confirm password *</label>
      <input id="confirmPassword" name="confirmPassword" [type]="showPassword ? 'text' : 'password'" maxlength="50"
             [(ngModel)]="form.confirmPassword" (blur)="touch('confirmPassword')">
      @if (touched['confirmPassword'] && errors().confirmPassword) {
        <div class="field-error">{{ errors().confirmPassword }}</div>
      }

      <label for="showPw" style="font-weight:normal">
        <input id="showPw" name="showPw" type="checkbox" [(ngModel)]="showPassword"> Show passwords
      </label>
      <p class="muted" style="max-width:420px">
        8-50 characters, with at least one uppercase letter, one lowercase letter, one digit and one
        special character. Spaces are not allowed.
      </p>
    </fieldset>

    <fieldset>
      <legend>Personal details</legend>

      <label for="fullName">Full name *</label>
      <input id="fullName" name="fullName" maxlength="100"
             [(ngModel)]="form.fullName" (blur)="touch('fullName')">
      @if (touched['fullName'] && errors().fullName) { <div class="field-error">{{ errors().fullName }}</div> }

      <label for="phone">Mobile number *</label>
      <input id="phone" name="phone" inputmode="numeric" maxlength="10" placeholder="10 digits, starts 6-9"
             [ngModel]="form.phone" (ngModelChange)="onPhone($event)" (blur)="touch('phone')">
      @if (touched['phone'] && errors().phone) { <div class="field-error">{{ errors().phone }}</div> }

      <label for="dob">Date of birth</label>
      <input id="dob" name="dateOfBirth" type="date" [min]="earliestDob" [max]="today"
             [ngModel]="form.dateOfBirth" (ngModelChange)="onDob($event)" (blur)="touch('dateOfBirth')">
      @if (touched['dateOfBirth'] && errors()['dateOfBirth']) {
        <div class="field-error">{{ errors()['dateOfBirth'] }}</div>
      }
      <p class="muted" style="max-width:420px">
        Must be a past date, and not more than 100 years ago.
      </p>

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
    </fieldset>

    <p>
      <button type="button" class="primary" (click)="submit()" [disabled]="busy()">
        {{ busy() ? 'Creating account...' : 'Register' }}
      </button>
      <button type="button" (click)="reset()" [disabled]="busy()">Clear</button>
    </p>
    <p class="muted">Already registered? <a routerLink="/login">Login</a>.</p>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private popup = inject(PopupService);

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  today = new Date().toISOString().substring(0, 10);
  earliestDob = earliestBirthDate();
  busy = signal(false);
  showPassword = false;
  touched: Record<string, boolean> = {};

  form = this.blank();

  private blank() {
    return {
      email: '', password: '', confirmPassword: '', fullName: '', phone: '',
      dateOfBirth: '', gender: '', bloodGroup: '', address: ''
    };
  }

  touch(field: string): void { this.touched[field] = true; }

  onPhone(value: string): void { this.form.phone = digitsOnly(value, 10); }

  onDob(value: string): void { this.form.dateOfBirth = value; this.touch('dateOfBirth'); }

  errors(): Record<string, string | null> {
    const f = this.form;
    return {
      email: checkEmail(f.email),
      password: checkPassword(f.password),
      confirmPassword: !f.confirmPassword
        ? 'Please confirm your password'
        : (f.password !== f.confirmPassword ? 'Password and confirm password do not match' : null),
      fullName: checkPersonName('Full name', f.fullName),
      phone: checkMobile(f.phone),
      dateOfBirth: checkBirthDate(f.dateOfBirth)
    };
  }

  reset(): void {
    this.form = this.blank();
    this.touched = {};
    this.showPassword = false;
  }

  submit(): void {
    const e = this.errors();
    ['email', 'password', 'confirmPassword', 'fullName', 'phone', 'dateOfBirth']
      .forEach(k => this.touched[k] = true);
    const firstProblem = firstError(e['email'], e['password'], e['confirmPassword'], e['fullName'],
      e['phone'], e['dateOfBirth']);
    if (firstProblem) {
      this.popup.error(firstProblem, 'Please fix the form');
      return;
    }

    this.busy.set(true);
    const payload = {
      ...this.form,
      dateOfBirth: this.form.dateOfBirth || null,
      gender: this.form.gender || null,
      bloodGroup: this.form.bloodGroup || null,
      address: this.form.address || null
    };

    this.auth.register(payload).subscribe({
      next: res => {
        this.busy.set(false);
        this.reset();
        this.popup.success(
          'Welcome ' + res.fullName + '. Your patient account is ready — browse our specialists and book '
          + 'an appointment, or open My profile from the menu.',
          'Registration successful');
        this.router.navigate(['/']);
      },
      error: err => {
        this.busy.set(false);
        this.popup.error(readError(err), 'Registration failed');
      }
    });
  }
}
