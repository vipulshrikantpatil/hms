package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        @NotBlank(message = "Department name is required")
        @Size(min = 3, max = 80, message = "Department name must be 3-80 characters")
        @Pattern(regexp = ValidationPatterns.TEXT_NAME, message = "Department name " + ValidationPatterns.TEXT_NAME_MSG)
        String name,

        @Size(max = 500, message = "Description cannot exceed 500 characters") String description,
        boolean active) {
}
