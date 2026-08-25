package com.hms.dto;

import com.hms.entity.enums.RoomType;
import jakarta.validation.constraints.*;

public record RoomRequest(
        @NotBlank @Size(max = 20) String roomNumber,
        @NotNull RoomType roomType,
        @Min(0) @Max(50) Integer floorNo,
        boolean active) {
}
