package com.hms.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

public record DoctorDto(Long id, String fullName, String specialty, String qualification, String phone,
                        Integer yearsExperience, BigDecimal consultationFee, Integer slotMinutes,
                        LocalTime availableFrom, LocalTime availableTo, Long departmentId,
                        String departmentName, boolean active) {
}
