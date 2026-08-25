package com.hms.service;

import com.hms.dto.CardPaymentRequest;
import com.hms.dto.ReceiptDto;
import com.hms.entity.Appointment;
import com.hms.entity.Payment;
import com.hms.entity.enums.AppointmentStatus;
import com.hms.entity.enums.PaymentStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class MockPaymentService implements PaymentService {

    private static final DateTimeFormatter RECEIPT_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final PaymentRepository paymentRepository;

    @Override
    @Transactional
    public Payment createPendingPayment(Appointment appointment) {
        Payment payment = Payment.builder()
                .appointment(appointment)
                .amount(appointment.getDoctor().getConsultationFee())
                .status(PaymentStatus.PENDING)
                .build();
        return paymentRepository.save(payment);
    }

    @Override
    @Transactional
    public ReceiptDto pay(Long appointmentId, CardPaymentRequest card, String patientEmail) {
        Payment payment = find(appointmentId);

        if (patientEmail != null && !payment.getAppointment().getPatient().getUser().getEmail()
                .equalsIgnoreCase(patientEmail)) {
            throw new BadRequestException("You can only pay for your own appointments");
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("This appointment is already paid. Open the receipt instead.");
        }
        if (payment.getAppointment().getStatus() == AppointmentStatus.REJECTED
                || payment.getAppointment().getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Cannot pay for a cancelled or rejected appointment");
        }

        // Card number and CVV are used for the charge only and are never written to the database.
        String digits = card.cardNumber();
        if (!luhnValid(digits)) {
            throw new BadRequestException("Card number failed the checksum test — please re-enter it");
        }

        payment.setCardLast4(digits.substring(digits.length() - 4));
        payment.setCardHolderName(card.cardHolderName());
        payment.setMethod("CARD");
        payment.setTransactionRef("TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        payment.setReceiptNo(nextReceiptNo());
        payment.setPaidAt(LocalDateTime.now());
        payment.setStatus(PaymentStatus.PAID);

        return toReceipt(paymentRepository.save(payment));
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptDto receipt(Long appointmentId) {
        return toReceipt(find(appointmentId));
    }

    @Override
    @Transactional
    public Payment markPaid(Long appointmentId, String method, String transactionRef) {
        Payment payment = find(appointmentId);
        payment.setStatus(PaymentStatus.PAID);
        payment.setMethod(method != null ? method : "CASH");
        payment.setTransactionRef(transactionRef != null ? transactionRef
                : "TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        if (payment.getReceiptNo() == null) {
            payment.setReceiptNo(nextReceiptNo());
        }
        payment.setPaidAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }

    @Override
    @Transactional
    public Payment refund(Long appointmentId) {
        Payment payment = find(appointmentId);
        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Only a paid appointment can be refunded");
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        return paymentRepository.save(payment);
    }

    private Payment find(Long appointmentId) {
        return paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment for appointment", appointmentId));
    }

    private String nextReceiptNo() {
        return "RCPT-" + LocalDateTime.now().format(RECEIPT_DATE) + "-"
                + ThreadLocalRandom.current().nextInt(100000, 999999);
    }

    private ReceiptDto toReceipt(Payment p) {
        Appointment a = p.getAppointment();
        return new ReceiptDto(
                p.getReceiptNo(), a.getId(),
                a.getPatient().getFullName(), a.getPatient().getPhone(),
                a.getDoctor().getFullName(), a.getDoctor().getSpecialty(),
                a.getDoctor().getDepartment().getName(),
                a.getRoom() != null ? a.getRoom().getRoomNumber() : null,
                a.getStartTime(), a.getEndTime(),
                p.getAmount(), p.getStatus(), p.getMethod(),
                p.getMaskedCard(), p.getCardHolderName(), p.getTransactionRef(), p.getPaidAt());
    }

    /** Standard Luhn checksum — catches typos before a real gateway would reject the card. */
    private boolean luhnValid(String number) {
        int sum = 0;
        boolean alternate = false;
        for (int i = number.length() - 1; i >= 0; i--) {
            int digit = number.charAt(i) - '0';
            if (alternate) {
                digit *= 2;
                if (digit > 9) { digit -= 9; }
            }
            sum += digit;
            alternate = !alternate;
        }
        return sum % 10 == 0;
    }
}
