package com.hms.service;

import com.hms.dto.CardPaymentRequest;
import com.hms.dto.ReceiptDto;
import com.hms.entity.Appointment;
import com.hms.entity.Payment;

/**
 * Placeholder payment abstraction. Swap MockPaymentService for a Razorpay/Stripe
 * implementation without touching the appointment flow.
 */
public interface PaymentService {

    Payment createPendingPayment(Appointment appointment);

    /** Charges the card and returns the printable receipt. Only the last 4 digits are retained. */
    ReceiptDto pay(Long appointmentId, CardPaymentRequest card, String patientEmail);

    ReceiptDto receipt(Long appointmentId);

    Payment markPaid(Long appointmentId, String method, String transactionRef);

    Payment refund(Long appointmentId);
}
