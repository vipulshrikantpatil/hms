package com.hms.service;

import com.hms.dto.*;
import com.hms.entity.*;
import com.hms.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class Mapper {

    private final AppointmentRepository appointmentRepository;

    public DoctorDto toDto(Doctor d) {
        return new DoctorDto(d.getId(), d.getFullName(), d.getSpecialty(), d.getQualification(), d.getPhone(),
                d.getYearsExperience(), d.getConsultationFee(), d.getSlotMinutes(), d.getAvailableFrom(),
                d.getAvailableTo(), d.getDepartment().getId(), d.getDepartment().getName(), d.isActive());
    }

    public DepartmentDto toDto(Department dep, long doctorCount) {
        return new DepartmentDto(dep.getId(), dep.getName(), dep.getDescription(), dep.isActive(), doctorCount);
    }

    public RoomDto toDto(Room r) {
        return new RoomDto(r.getId(), r.getRoomNumber(), r.getRoomType(), r.getFloorNo(), r.isActive());
    }

    public PatientDto toDto(Patient p) {
        return new PatientDto(p.getId(), p.getFullName(), p.getUser() != null ? p.getUser().getEmail() : null,
                p.getPhone(), p.getDateOfBirth(), p.getGender(), p.getBloodGroup(), p.getAddress(),
                p.getStatus());
    }

    public AppointmentDto toDto(Appointment a) {
        Payment pay = a.getPayment();
        String timeline = a.getEndTime().isBefore(LocalDateTime.now()) ? "VISITED" : "UPCOMING";
        boolean firstVisit = a.getId() == null
                || appointmentRepository.countByPatientIdAndStartTimeBefore(
                        a.getPatient().getId(), a.getStartTime()) == 0;
        return new AppointmentDto(
                a.getId(),
                a.getPatient().getId(), a.getPatient().getFullName(),
                a.getDoctor().getId(), a.getDoctor().getFullName(), a.getDoctor().getSpecialty(),
                a.getRoom() != null ? a.getRoom().getId() : null,
                a.getRoom() != null ? a.getRoom().getRoomNumber() : null,
                a.getStartTime(), a.getEndTime(), a.getStatus(), a.getReason(), a.getAdminRemarks(),
                a.getCancellationReason(),
                pay != null ? pay.getAmount() : null,
                pay != null ? pay.getStatus() : null,
                pay != null ? pay.getReceiptNo() : null,
                pay != null ? pay.getMaskedCard() : null,
                timeline, firstVisit);
    }
}
