package com.hms.controller;

import com.hms.dto.*;
import com.hms.entity.enums.PatientStatus;
import com.hms.service.AppointmentService;
import com.hms.service.CatalogService;
import com.hms.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AppointmentService appointmentService;
    private final CatalogService catalogService;
    private final PaymentService paymentService;

    // ----- Appointment request queue -----
    @GetMapping("/appointments/pending")
    public List<AppointmentDto> pending() {
        return appointmentService.pendingQueue();
    }

    @GetMapping("/appointments")
    public List<AppointmentDto> appointments() {
        return appointmentService.all();
    }

    @PatchMapping("/appointments/{id}/approve")
    public AppointmentDto approve(@PathVariable Long id, @RequestParam(required = false) Long roomId) {
        return appointmentService.approve(id, roomId);
    }

    @PatchMapping("/appointments/{id}/reject")
    public AppointmentDto reject(@PathVariable Long id, @Valid @RequestBody RemarksRequest req) {
        return appointmentService.reject(id, req.remarks());
    }

    @GetMapping("/appointments/{id}/receipt")
    public ReceiptDto receipt(@PathVariable Long id) {
        return paymentService.receipt(id);
    }

    // ----- Cancellation requests -----
    @GetMapping("/appointments/cancellation-requests")
    public List<AppointmentDto> cancellationRequests() {
        return appointmentService.cancellationQueue();
    }

    @PatchMapping("/appointments/{id}/cancellation/approve")
    public AppointmentDto approveCancellation(@PathVariable Long id) {
        return appointmentService.approveCancellation(id);
    }

    @PatchMapping("/appointments/{id}/cancellation/reject")
    public AppointmentDto rejectCancellation(@PathVariable Long id, @Valid @RequestBody RemarksRequest req) {
        return appointmentService.rejectCancellation(id, req.remarks());
    }

    @PatchMapping("/appointments/{id}/mark-paid")
    public ResponseEntity<Void> markPaid(@PathVariable Long id, @RequestParam(required = false) String method) {
        paymentService.markPaid(id, method, null);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long id) {
        appointmentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Bulk delete: DELETE /api/admin/appointments?ids=3,7,9 */
    @DeleteMapping("/appointments")
    public ResponseEntity<Void> deleteAppointments(@RequestParam List<Long> ids) {
        appointmentService.deleteMany(ids);
        return ResponseEntity.noContent().build();
    }

    // ----- Doctors -----
    @GetMapping("/doctors")
    public List<DoctorDto> doctors() {
        return catalogService.allDoctors();
    }

    @PostMapping("/doctors")
    public DoctorDto createDoctor(@Valid @RequestBody DoctorRequest req) {
        return catalogService.createDoctor(req);
    }

    @PutMapping("/doctors/{id}")
    public DoctorDto updateDoctor(@PathVariable Long id, @Valid @RequestBody DoctorRequest req) {
        return catalogService.updateDoctor(id, req);
    }

    @DeleteMapping("/doctors/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable Long id) {
        catalogService.deleteDoctor(id);
        return ResponseEntity.noContent().build();
    }

    // ----- Departments -----
    @GetMapping("/departments")
    public List<DepartmentDto> departments() {
        return catalogService.departments(false);
    }

    @PostMapping("/departments")
    public DepartmentDto createDepartment(@Valid @RequestBody DepartmentRequest req) {
        return catalogService.createDepartment(req);
    }

    @PutMapping("/departments/{id}")
    public DepartmentDto updateDepartment(@PathVariable Long id, @Valid @RequestBody DepartmentRequest req) {
        return catalogService.updateDepartment(id, req);
    }

    @DeleteMapping("/departments/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        catalogService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    // ----- Rooms -----
    @GetMapping("/rooms")
    public List<RoomDto> rooms() {
        return catalogService.rooms(false);
    }

    @PostMapping("/rooms")
    public RoomDto createRoom(@Valid @RequestBody RoomRequest req) {
        return catalogService.createRoom(req);
    }

    @PutMapping("/rooms/{id}")
    public RoomDto updateRoom(@PathVariable Long id, @Valid @RequestBody RoomRequest req) {
        return catalogService.updateRoom(id, req);
    }

    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        catalogService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    // ----- Patients -----
    @GetMapping("/patients")
    public List<PatientDto> patients() {
        return catalogService.patients();
    }

    @PutMapping("/patients/{id}")
    public PatientDto updatePatient(@PathVariable Long id, @Valid @RequestBody PatientRequest req) {
        return catalogService.updatePatient(id, req);
    }

    @PatchMapping("/patients/{id}/status")
    public PatientDto updatePatientStatus(@PathVariable Long id, @RequestParam PatientStatus status) {
        return catalogService.updatePatientStatus(id, status);
    }

    @DeleteMapping("/patients/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        catalogService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }

    /** Bulk delete: DELETE /api/admin/patients?ids=2,5 */
    @DeleteMapping("/patients")
    public ResponseEntity<Void> deletePatients(@RequestParam List<Long> ids) {
        catalogService.deletePatients(ids);
        return ResponseEntity.noContent().build();
    }
}
