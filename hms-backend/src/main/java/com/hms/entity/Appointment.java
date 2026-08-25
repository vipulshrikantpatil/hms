package com.hms.entity;

import com.hms.entity.enums.AppointmentStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointments", indexes = {
        @Index(name = "idx_appt_doctor_slot", columnList = "doctor_id, start_time, end_time"),
        @Index(name = "idx_appt_room_slot", columnList = "room_id, start_time, end_time"),
        @Index(name = "idx_appt_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Builder.Default
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Size(max = 255)
    @Column(length = 255)
    private String reason;

    @Size(max = 255)
    @Column(name = "admin_remarks", length = 255)
    private String adminRemarks;

    /** Reason the patient gave when requesting cancellation. */
    @Size(max = 255)
    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    /** Status to restore if the front desk turns down a cancellation request. */
    @Enumerated(EnumType.STRING)
    @Column(name = "prev_status", length = 20)
    private AppointmentStatus prevStatus;

    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Payment payment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @AssertTrue(message = "End time must be after start time")
    public boolean isValidWindow() {
        return startTime != null && endTime != null && endTime.isAfter(startTime);
    }

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
