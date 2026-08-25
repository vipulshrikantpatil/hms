package com.hms.controller;

import com.hms.dto.DepartmentDto;
import com.hms.dto.DoctorDto;
import com.hms.dto.SlotDto;
import com.hms.service.AppointmentService;
import com.hms.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final CatalogService catalogService;
    private final AppointmentService appointmentService;

    @GetMapping("/doctors")
    public List<DoctorDto> doctors(@RequestParam(required = false) Long departmentId,
                                   @RequestParam(required = false) String q) {
        return catalogService.doctors(departmentId, q);
    }

    @GetMapping("/departments")
    public List<DepartmentDto> departments() {
        return catalogService.departments(true);
    }

    @GetMapping("/doctors/{id}/slots")
    public List<SlotDto> slots(@PathVariable Long id,
                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return appointmentService.availableSlots(id, date);
    }
}
