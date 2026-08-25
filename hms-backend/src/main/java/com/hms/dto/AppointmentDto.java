package com.hms.dto;

import com.hms.entity.enums.AppointmentStatus;
import com.hms.entity.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AppointmentDto(Long id, Long patientId, String patientName, Long doctorId, String doctorName,
                             String specialty, Long roomId, String roomNumber, LocalDateTime startTime,
                             LocalDateTime endTime, AppointmentStatus status, String reason, String adminRemarks,
                             String cancellationReason,
                             BigDecimal amount, PaymentStatus paymentStatus, String receiptNo, String maskedCard,
                             /** UPCOMING for future visits, VISITED once the slot has passed. */
                             String timeline,
                             /** True when the patient has no earlier appointment - a first-time visitor. */
                             boolean firstVisit) {
}
