package com.hms.dto;

import java.time.LocalDateTime;

public record SlotDto(LocalDateTime startTime, LocalDateTime endTime, boolean available) {
}
