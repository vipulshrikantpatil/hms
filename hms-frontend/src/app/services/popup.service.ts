import { Injectable, signal } from '@angular/core';

export interface PopupInput {
  label: string;
  placeholder?: string;
  maxLength?: number;
  requiredMessage?: string;
}

export interface PopupState {
  kind: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  input?: PopupInput;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (value: string) => void;
}

@Injectable({ providedIn: 'root' })
export class PopupService {
  readonly current = signal<PopupState | null>(null);

  success(message: string, title = 'Success'): void {
    this.current.set({ kind: 'success', title, message });
  }

  error(message: string, title = 'Error'): void {
    this.current.set({ kind: 'error', title, message });
  }

  /**
   * Confirmation dialog. Pass `input` to collect a mandatory reason or remark;
   * `onConfirm` receives its trimmed value (empty string when no input is asked for).
   */
  confirm(options: {
    title?: string;
    message: string;
    input?: PopupInput;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (value: string) => void;
  }): void {
    this.current.set({
      kind: 'confirm',
      title: options.title ?? 'Please confirm',
      message: options.message,
      input: options.input,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Go back',
      onConfirm: options.onConfirm
    });
  }

  close(): void {
    this.current.set(null);
  }
}
