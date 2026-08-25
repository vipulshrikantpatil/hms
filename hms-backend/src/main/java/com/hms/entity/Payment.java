package com.hms.entity;

import com.hms.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    @NotNull @DecimalMin(value = "0.0")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Size(max = 20)
    @Column(length = 20)
    private String method;

    @Size(max = 80)
    @Column(name = "transaction_ref", length = 80)
    private String transactionRef;

    @Size(max = 30)
    @Column(name = "receipt_no", length = 30, unique = true)
    private String receiptNo;

    /** Only the last four digits of the card are ever stored. */
    @Size(max = 4)
    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Size(max = 60)
    @Column(name = "card_holder_name", length = 60)
    private String cardHolderName;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Transient
    public String getMaskedCard() {
        return cardLast4 == null ? null : "**** **** **** " + cardLast4;
    }

    @PrePersist
    void onCreate() { this.createdAt = LocalDateTime.now(); }
}
