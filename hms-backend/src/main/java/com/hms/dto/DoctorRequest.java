package com.hms.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalTime;

public record DoctorRequest(
        @NotNull(message = "Department is required") Long departmentId,

        @NotBlank(message = "Doctor name is required") @Size(max = 100)
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MSG)
        String fullName,

        @NotBlank(message = "Specialty is required") @Size(min = 3, max = 80)
        @Pattern(regexp = ValidationPatterns.TEXT_NAME, message = "Specialty " + ValidationPatterns.TEXT_NAME_MSG)
        String specialty,

        @Size(max = 120) String qualification,

        @NotBlank(message = "Contact number is required")
        @Pattern(regexp = ValidationPatterns.MOBILE, message = ValidationPatterns.MOBILE_MSG)
        String phone,

        @NotNull(message = "Years of experience is required")
        @Min(value = 1, message = "Years of experience must be at least 1 year")
        @Max(value = 70, message = "Years of experience cannot exceed 70")
        Integer yearsExperience,

        @NotNull(message = "Consultation fee is required")
        @DecimalMin(value = "0.0", message = "Fee cannot be negative")
        @DecimalMax(value = "10000.0", message = "Consultation fee cannot exceed 10000")
        @Digits(integer = 5, fraction = 2, message = "Fee may have at most 2 decimal places")
        BigDecimal consultationFee,

        @NotNull(message = "Slot duration is required")
        @Min(value = 5, message = "Slot duration must be at least 5 minutes")
        @Max(value = 240, message = "Slot duration cannot exceed 240 minutes")
        Integer slotMinutes,

        @NotNull(message = "Availability start time is required") LocalTime availableFrom,
        @NotNull(message = "Availability end time is required") LocalTime availableTo,
        boolean active) {

    @AssertTrue(message = "Availability end time must be after start time")
    public boolean isAvailabilityValid() {
        return availableFrom == null || availableTo == null || availableTo.isAfter(availableFrom);
    }

    @AssertTrue(message = "The working window is shorter than one appointment slot")
    public boolean isSlotFittingWindow() {
        if (availableFrom == null || availableTo == null || slotMinutes == null) {
            return true;
        }
        return java.time.Duration.between(availableFrom, availableTo).toMinutes() >= slotMinutes;
    }
}
