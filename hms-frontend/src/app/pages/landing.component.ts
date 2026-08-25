import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import { Department, Doctor } from '../models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Quality care, without the queue</h1>
    <p>Book an appointment with a specialist in a few clicks. Requests are confirmed by our front desk,
       and you can track the status from your dashboard.</p>
    <p><button type="button" class="primary" (click)="book()">Book an appointment</button></p>

    <h2>About Us</h2>
    <p>City Care Hospital is a multi-speciality facility offering outpatient consultation, diagnostics and
       day-care procedures. Our departments are staffed by consultants with post-graduate qualifications,
       supported by round-the-clock nursing and an in-house pharmacy.</p>

    <h2>Our Specialists @if (filterName()) { <span class="muted">— {{ filterName() }}</span> }</h2>
    @if (filterName()) { <p><button class="link" type="button" (click)="clearFilter()">Clear filter</button></p> }
    <table>
      <thead>
        <tr><th>Doctor</th><th>Specialty</th><th>Department</th><th>Qualification</th><th>Experience</th>
            <th>Fee</th><th>Hours</th><th>Action</th></tr>
      </thead>
      <tbody>
        @for (d of doctors(); track d.id) {
          <tr>
            <td>{{ d.fullName }}</td>
            <td>{{ d.specialty }}</td>
            <td>{{ d.departmentName }}</td>
            <td>{{ d.qualification || '-' }}</td>
            <td>{{ d.yearsExperience }} yr{{ d.yearsExperience === 1 ? '' : 's' }}</td>
            <td>&#8377;{{ d.consultationFee }}</td>
            <td>{{ d.availableFrom }} - {{ d.availableTo }}</td>
            <td><button type="button" class="primary" (click)="book(d.id)">Book</button></td>
          </tr>
        } @empty {
          <tr><td colspan="8" class="muted">No doctors match your search.</td></tr>
        }
      </tbody>
    </table>

    <h2>Departments</h2>
    <table>
      <thead><tr><th>Department</th><th>Description</th><th>Doctors</th><th>Action</th></tr></thead>
      <tbody>
        @for (dep of departments(); track dep.id) {
          <tr>
            <td>{{ dep.name }}</td>
            <td>{{ dep.description || '-' }}</td>
            <td>{{ dep.doctorCount }}</td>
            <td><button type="button" (click)="filterByDepartment(dep)">View specialists</button></td>
          </tr>
        } @empty {
          <tr><td colspan="4" class="muted">No departments listed.</td></tr>
        }
      </tbody>
    </table>

    <h2>Contact</h2>
    <p>
      Outpatient desk: 08:00 - 20:00, Monday to Saturday<br>
      Phone: +91 22 4971 3052<br>
      Email: care&#64;citycare.local<br>
      Address: 104, 1st Floor, Sujata Chambers, Katha Bazaar, Masjid Station (W), Mumbai 400009
    </p>
    @if (!auth.isLoggedIn()) {
      <p class="muted">Already registered? <a routerLink="/login">Log in</a> to manage your appointments.</p>
    }
  `
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  private popup = inject(PopupService);

  doctors = signal<Doctor[]>([]);
  departments = signal<Department[]>([]);
  filterName = signal<string>('');

  private departmentId?: number;
  private searchTerm = '';

  ngOnInit(): void {
    this.api.departments().subscribe({
      next: list => this.departments.set(list),
      error: err => this.popup.error(readError(err), 'Could not load departments')
    });

    this.route.queryParams.subscribe(params => {
      const q = params['q'] as string | undefined;
      this.searchTerm = q ?? '';
      this.filterName.set(q ? 'search: ' + q : '');
      this.departmentId = undefined;
      this.load(undefined, q);
    });
  }

  private load(departmentId?: number, q?: string): void {
    this.api.doctors(departmentId, q).subscribe({
      next: list => this.doctors.set(list),
      error: err => this.popup.error(readError(err), 'Could not load doctors')
    });
  }

  filterByDepartment(dep: Department): void {
    this.departmentId = dep.id;
    this.searchTerm = '';
    this.filterName.set(dep.name);
    this.load(dep.id);
  }

  clearFilter(): void {
    this.departmentId = undefined;
    this.filterName.set('');
    this.searchTerm = '';
    this.router.navigate(['/'], { queryParams: {} });
    this.load();
  }

  book(doctorId?: number): void {
    if (!this.auth.isLoggedIn()) {
      this.popup.error('Please log in or register to book an appointment.', 'Login required');
      this.router.navigate(['/login'], { queryParams: { redirect: '/book' } });
      return;
    }
    this.router.navigate(['/book'], { queryParams: doctorId ? { doctorId } : {} });
  }
}
