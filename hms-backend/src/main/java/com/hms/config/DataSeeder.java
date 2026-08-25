package com.hms.config;

import com.hms.entity.*;
import com.hms.entity.enums.Role;
import com.hms.entity.enums.RoomType;
import com.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmailIgnoreCase("admin@hms.local")) {
            return;
        }

        userRepository.save(User.builder()
                .email("admin@hms.local")
                .password(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN)
                .enabled(true)
                .build());

        Department cardio = departmentRepository.save(Department.builder()
                .name("Cardiology").description("Heart and vascular care").active(true).build());
        Department ortho = departmentRepository.save(Department.builder()
                .name("Orthopaedics").description("Bones, joints and spine").active(true).build());
        Department peds = departmentRepository.save(Department.builder()
                .name("Paediatrics").description("Child health and development").active(true).build());

        doctorRepository.saveAll(List.of(
                doctor("Dr. Anita Sharma", "Cardiologist", "MD, DM Cardiology", cardio, "1200", 30, "9820011221", 18),
                doctor("Dr. Rajesh Kulkarni", "Interventional Cardiologist", "MD, DNB", cardio, "1500", 30, "9820011222", 12),
                doctor("Dr. Farida Merchant", "Orthopaedic Surgeon", "MS Ortho", ortho, "1000", 45, "9820011223", 22),
                doctor("Dr. Sameer Rao", "Paediatrician", "MD Paediatrics", peds, "800", 20, "9820011224", 8)));

        roomRepository.saveAll(List.of(
                Room.builder().roomNumber("C-101").roomType(RoomType.CONSULTATION).floorNo(1).active(true).build(),
                Room.builder().roomNumber("C-102").roomType(RoomType.CONSULTATION).floorNo(1).active(true).build(),
                Room.builder().roomNumber("OT-201").roomType(RoomType.OPERATION).floorNo(2).active(true).build(),
                Room.builder().roomNumber("W-301").roomType(RoomType.WARD).floorNo(3).active(true).build()));
    }

    private Doctor doctor(String name, String specialty, String qualification,
                          Department dep, String fee, int slot, String phone, int years) {
        return Doctor.builder()
                .fullName(name).specialty(specialty).qualification(qualification).phone(phone)
                .yearsExperience(years)
                .department(dep).consultationFee(new BigDecimal(fee)).slotMinutes(slot)
                .availableFrom(LocalTime.of(9, 0)).availableTo(LocalTime.of(17, 0))
                .active(true).build();
    }
}
