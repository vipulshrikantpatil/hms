import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopupService } from '../services/popup.service';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (popup.current(); as p) {
      <div class="popup-backdrop" (click)="dismiss(p.kind)"></div>
      <div class="popup-box popup-{{ p.kind }}" role="alertdialog" aria-modal="true">
        <h3 class="popup-title">
          {{ p.kind === 'success' ? '\u2714' : (p.kind === 'confirm' ? '?' : '\u26A0') }} {{ p.title }}
        </h3>
        <p class="popup-message">{{ p.message }}</p>

        @if (p.input; as inp) {
          <label for="popupInput">{{ inp.label }}</label>
          <textarea id="popupInput" name="popupInput" rows="3" style="width:100%"
                    [attr.maxlength]="inp.maxLength || 255" [placeholder]="inp.placeholder || ''"
                    [(ngModel)]="value"></textarea>
          @if (touched() && !value.trim()) {
            <div class="field-error">{{ inp.requiredMessage || 'This field is required.' }}</div>
          }
        }

        <p class="popup-actions">
          @if (p.kind === 'confirm') {
            <button type="button" (click)="popup.close()">{{ p.cancelLabel }}</button>
            <button type="button" class="primary" (click)="accept()">{{ p.confirmLabel }}</button>
          } @else {
            <button type="button" class="primary" (click)="popup.close()" autofocus>OK</button>
          }
        </p>
      </div>
    }
  `
})
export class PopupComponent {
  popup = inject(PopupService);
  value = '';
  touched = signal(false);

  dismiss(kind: string): void {
    if (kind !== 'confirm') { this.popup.close(); }
  }

  accept(): void {
    const state = this.popup.current();
    if (!state) { return; }
    this.touched.set(true);
    if (state.input && !this.value.trim()) { return; }
    const value = this.value.trim();
    this.value = '';
    this.touched.set(false);
    this.popup.close();
    state.onConfirm?.(value);
  }
}
