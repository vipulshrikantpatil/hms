package com.hms.dto;

public record DepartmentDto(Long id, String name, String description, boolean active, long doctorCount) {
}
