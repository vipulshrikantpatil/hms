package com.hms.entity;

import com.hms.entity.enums.RoomType;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "rooms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank @Size(max = 20)
    @Column(name = "room_number", nullable = false, unique = true, length = 20)
    private String roomNumber;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 20)
    private RoomType roomType;

    @Min(0) @Max(50)
    @Column(name = "floor_no")
    private Integer floorNo;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
