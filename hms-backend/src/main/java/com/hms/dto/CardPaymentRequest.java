package com.hms.dto;

import jakarta.validation.constraints.*;

/**
 * Card details are validated and used in-memory only. Nothing beyond the last four
 * digits, the holder name and the brand is ever persisted.
 */
public record CardPaymentRequest(
        @NotBlank(message = "Card holder name is required") @Size(max = 60)
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MSG)
        String cardHolderName,

        @NotBlank(message = "Card number is required")
        @Pattern(regexp = ValidationPatterns.CARD_NUMBER, message = "Card number must be 13-19 digits with no spaces")
        String cardNumber,

        @NotBlank(message = "Expiry is required")
        @Pattern(regexp = ValidationPatterns.CARD_EXPIRY, message = "Expiry must be in MM/YY format")
        String expiry,

        @NotBlank(message = "CVV is required")
        @Pattern(regexp = ValidationPatterns.CVV, message = "CVV must be 3 or 4 digits")
        String cvv) {

    @AssertTrue(message = "Card has expired")
    public boolean isNotExpired() {
        if (expiry == null || !expiry.matches(ValidationPatterns.CARD_EXPIRY)) {
            return true;
        }
        int month = Integer.parseInt(expiry.substring(0, 2));
        int year = 2000 + Integer.parseInt(expiry.substring(3));
        java.time.YearMonth cardMonth = java.time.YearMonth.of(year, month);
        return !cardMonth.isBefore(java.time.YearMonth.now());
    }
}
