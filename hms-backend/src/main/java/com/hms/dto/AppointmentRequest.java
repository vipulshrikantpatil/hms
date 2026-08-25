package com.hms.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record AppointmentRequest(
        @NotNull Long doctorId,
        Long roomId,
        @NotNull @Future(message = "Appointment must be in the future") LocalDateTime startTime,
        @Size(max = 255) String reason) {
}
