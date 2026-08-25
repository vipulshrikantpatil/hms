package com.hms.dto;

import com.hms.entity.enums.Gender;
import com.hms.entity.enums.PatientStatus;

import java.time.LocalDate;

public record PatientDto(Long id, String fullName, String email, String phone,
                         LocalDate dateOfBirth, Gender gender, String bloodGroup, String address,
                         PatientStatus status) {
}
