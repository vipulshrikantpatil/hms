package com.hms.entity.enums;

public enum AppointmentStatus {
    PENDING,
    APPROVED,
    REJECTED,
    /** Patient has asked the front desk to cancel; awaiting an admin decision. */
    CANCEL_REQUESTED,
    CANCELLED,
    COMPLETED
}
