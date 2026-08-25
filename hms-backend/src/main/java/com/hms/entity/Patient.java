package com.hms.entity;

import com.hms.entity.enums.Gender;
import com.hms.entity.enums.PatientStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "patients")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @NotBlank @Size(max = 100)
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @NotBlank
    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Mobile number must be exactly 10 digits and start with 6, 7, 8 or 9")
    @Column(nullable = false, length = 15)
    private String phone;

    @Past
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Pattern(regexp = "^(A|B|AB|O)[+-]$", message = "Invalid blood group")
    @Column(name = "blood_group", length = 5)
    private String bloodGroup;

    @Size(max = 255)
    @Column(length = 255)
    private String address;

    /** Ward status maintained by the front desk. */
    @Builder.Default
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PatientStatus status = PatientStatus.REGISTERED;
}
