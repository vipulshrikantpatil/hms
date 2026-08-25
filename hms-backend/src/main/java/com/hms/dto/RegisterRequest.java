package com.hms.dto;

import com.hms.entity.enums.Gender;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.Objects;

public record RegisterRequest(
        @NotBlank @Email(message = "Enter a valid email address") @Size(max = 120) String email,

        @NotBlank(message = "Password is required")
        @Pattern(regexp = ValidationPatterns.PASSWORD, message = ValidationPatterns.PASSWORD_MSG)
        String password,

        @NotBlank(message = "Confirm password is required")
        String confirmPassword,

        @NotBlank @Size(max = 100)
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MSG)
        String fullName,

        @NotBlank @Pattern(regexp = ValidationPatterns.MOBILE, message = ValidationPatterns.MOBILE_MSG)
        String phone,

        LocalDate dateOfBirth,
        Gender gender,

        @Pattern(regexp = ValidationPatterns.BLOOD_GROUP, message = "Invalid blood group") String bloodGroup,
        @Size(max = 255) String address) {

    @AssertTrue(message = "Password and confirm password do not match")
    public boolean isConfirmPasswordMatching() {
        return Objects.equals(password, confirmPassword);
    }

    @AssertTrue(message = "Date of birth cannot be in the future or more than 100 years ago")
    public boolean isBirthDateValid() {
        return ValidationPatterns.isBirthDateInRange(dateOfBirth);
    }
}
