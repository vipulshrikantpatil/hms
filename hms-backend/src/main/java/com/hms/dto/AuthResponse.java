package com.hms.dto;

public record AuthResponse(String token, String email, String role, String fullName, Long patientId) {
}
