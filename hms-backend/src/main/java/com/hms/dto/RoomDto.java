package com.hms.dto;

import com.hms.entity.enums.RoomType;

public record RoomDto(Long id, String roomNumber, RoomType roomType, Integer floorNo, boolean active) {
}
