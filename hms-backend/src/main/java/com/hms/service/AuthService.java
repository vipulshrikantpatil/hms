package com.hms.service;

import com.hms.dto.*;
import com.hms.entity.Patient;
import com.hms.entity.User;
import com.hms.entity.enums.Role;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import com.hms.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final Mapper mapper;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new BadRequestException("Email is already registered");
        }
        User user = userRepository.save(User.builder()
                .email(req.email().toLowerCase())
                .password(passwordEncoder.encode(req.password()))
                .role(Role.PATIENT)
                .enabled(true)
                .build());

        Patient patient = patientRepository.save(Patient.builder()
                .user(user)
                .fullName(req.fullName())
                .phone(req.phone())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .bloodGroup(req.bloodGroup())
                .address(req.address())
                .build());

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), patient.getFullName(), patient.getId());
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));

        User user = userRepository.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Patient patient = patientRepository.findByUserId(user.getId()).orElse(null);
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(),
                patient != null ? patient.getFullName() : user.getEmail(),
                patient != null ? patient.getId() : null);
    }

    @Transactional(readOnly = true)
    public PatientDto profile(String email) {
        return mapper.toDto(patientRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for " + email)));
    }

    @Transactional
    public PatientDto updateProfile(String email, PatientRequest req) {
        Patient patient = patientRepository.findByUserEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for " + email));
        patient.setFullName(req.fullName());
        patient.setPhone(req.phone());
        patient.setDateOfBirth(req.dateOfBirth());
        patient.setGender(req.gender());
        patient.setBloodGroup(req.bloodGroup());
        patient.setAddress(req.address());
        return mapper.toDto(patientRepository.save(patient));
    }
}
