package com.hms.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "doctors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @NotBlank @Size(max = 100)
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @NotBlank @Size(max = 80)
    @Column(nullable = false, length = 80)
    private String specialty;

    @Size(max = 120)
    @Column(length = 120)
    private String qualification;

    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Mobile number must be exactly 10 digits and start with 6, 7, 8 or 9")
    @Column(length = 15)
    private String phone;

    @Builder.Default
    @NotNull
    @Min(value = 1, message = "Years of experience must be at least 1")
    @Max(value = 70, message = "Years of experience cannot exceed 70")
    @Column(name = "years_experience", nullable = false)
    private Integer yearsExperience = 0;

    @NotNull @DecimalMin(value = "0.0")
    @Column(name = "consultation_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal consultationFee;

    @Builder.Default
    @Min(5) @Max(240)
    @Column(name = "slot_minutes", nullable = false)
    private Integer slotMinutes = 30;

    @Builder.Default
    @NotNull
    @Column(name = "available_from", nullable = false)
    private LocalTime availableFrom = LocalTime.of(9, 0);

    @Builder.Default
    @NotNull
    @Column(name = "available_to", nullable = false)
    private LocalTime availableTo = LocalTime.of(17, 0);

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
