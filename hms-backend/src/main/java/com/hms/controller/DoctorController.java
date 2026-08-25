package com.hms.controller;

import com.hms.dto.AppointmentDto;
import com.hms.entity.Doctor;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.service.Mapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final Mapper mapper;

    @GetMapping("/appointments")
    public List<AppointmentDto> myAppointments(@AuthenticationPrincipal UserDetails user) {
        Doctor doctor = doctorRepository.findAll().stream()
                .filter(d -> d.getUser() != null && d.getUser().getEmail().equalsIgnoreCase(user.getUsername()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found for " + user.getUsername()));
        return appointmentRepository.findByDoctorIdOrderByStartTimeDesc(doctor.getId())
                .stream().map(mapper::toDto).toList();
    }
}
