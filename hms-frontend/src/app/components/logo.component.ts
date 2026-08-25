import { Component, Input } from '@angular/core';

/** Inline SVG so the logo needs no asset pipeline and prints correctly. */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <span class="logo">
      <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 48 48" role="img"
           aria-label="City Care Hospital logo">
        <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b5c8a" stroke="#083f5f" stroke-width="2"/>
        <path d="M20 9h8v11h11v8H28v11h-8V28H9v-8h11z" fill="#ffffff"/>
      </svg>
      @if (showText) {
        <span class="logo-text">
          <span class="logo-name">City Care</span>
          <span class="logo-sub">Hospital &amp; Diagnostics</span>
        </span>
      }
    </span>
  `
})
export class LogoComponent {
  @Input() size = 38;
  @Input() showText = true;
}
