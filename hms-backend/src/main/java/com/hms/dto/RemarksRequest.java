package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RemarksRequest(
        @NotBlank(message = "Remarks are mandatory when rejecting a request")
        @Size(max = 255) String remarks) {
}
