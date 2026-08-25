package com.hms.dto;

/** Shared regex constants so every layer validates identically. */
public final class ValidationPatterns {

    /** Indian mobile: exactly 10 digits, starts 6-9, no spaces or symbols. */
    public static final String MOBILE = "^[6-9][0-9]{9}$";
    public static final String MOBILE_MSG = "Mobile number must be exactly 10 digits and start with 6, 7, 8 or 9";

    /** 8-50 chars, at least one uppercase, one lowercase, one digit, one special character, no spaces. */
    public static final String PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S{8,50}$";
    public static final String PASSWORD_MSG =
            "Password must be 8-50 characters with at least one uppercase letter, one lowercase letter, one digit and one special character";

    public static final String PERSON_NAME = "^[A-Za-z][A-Za-z .'-]{1,99}$";
    public static final String PERSON_NAME_MSG = "Name may contain letters, spaces, dots, apostrophes and hyphens only";

    public static final String TEXT_NAME = "^[A-Za-z][A-Za-z0-9 &/()-]{1,79}$";
    public static final String TEXT_NAME_MSG = "Only letters, digits, spaces and & / ( ) - are allowed";

    public static final String BLOOD_GROUP = "^(A|B|AB|O)[+-]$";
    public static final String CARD_NUMBER = "^[0-9]{13,19}$";
    public static final String CVV = "^[0-9]{3,4}$";
    public static final String CARD_EXPIRY = "^(0[1-9]|1[0-2])/([0-9]{2})$";

    /** Oldest date of birth the system accepts. */
    public static final int MAX_AGE_YEARS = 100;

    public static boolean isBirthDateInRange(java.time.LocalDate dob) {
        if (dob == null) {
            return true;
        }
        java.time.LocalDate today = java.time.LocalDate.now();
        return !dob.isAfter(today) && !dob.isBefore(today.minusYears(MAX_AGE_YEARS));
    }

    private ValidationPatterns() {
    }
}
