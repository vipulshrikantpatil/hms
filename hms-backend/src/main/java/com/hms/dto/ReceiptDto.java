package com.hms.dto;

import com.hms.entity.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReceiptDto(String receiptNo, Long appointmentId, String patientName, String patientPhone,
                         String doctorName, String specialty, String departmentName, String roomNumber,
                         LocalDateTime appointmentStart, LocalDateTime appointmentEnd,
                         BigDecimal amount, PaymentStatus status, String method,
                         String maskedCard, String cardHolderName, String transactionRef,
                         LocalDateTime paidAt) {
}
