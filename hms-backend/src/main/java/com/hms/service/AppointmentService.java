package com.hms.service;

import com.hms.dto.*;
import com.hms.entity.*;
import com.hms.entity.enums.AppointmentStatus;
import com.hms.entity.enums.PaymentStatus;
import com.hms.entity.enums.RoomType;
import com.hms.exception.BadRequestException;
import com.hms.exception.ConflictException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    /** A slot stays blocked while a cancellation request is still awaiting a decision. */
    private static final Set<AppointmentStatus> BLOCKING = Set.of(
            AppointmentStatus.PENDING, AppointmentStatus.APPROVED, AppointmentStatus.CANCEL_REQUESTED);
    private static final Long NO_EXCLUSION = -1L;

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final RoomRepository roomRepository;
    private final PatientRepository patientRepository;
    private final PaymentService paymentService;
    private final Mapper mapper;

    @Transactional
    public AppointmentDto book(String patientEmail, AppointmentRequest req) {
        Patient patient = patientRepository.findByUserEmailIgnoreCase(patientEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for " + patientEmail));

        Doctor doctor = doctorRepository.findById(req.doctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", req.doctorId()));
        if (!doctor.isActive()) {
            throw new BadRequestException("Doctor is not accepting appointments");
        }

        LocalDateTime start = req.startTime();
        LocalDateTime end = start.plusMinutes(doctor.getSlotMinutes());

        validateWithinWorkingHours(doctor, start, end);

        Room room = null;
        if (req.roomId() != null) {
            room = roomRepository.findById(req.roomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Room", req.roomId()));
            if (!room.isActive()) {
                throw new BadRequestException("Room is not available for booking");
            }
        }

        checkCollisions(doctor.getId(), room, start, end, NO_EXCLUSION);

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .room(room)
                .startTime(start)
                .endTime(end)
                .status(AppointmentStatus.PENDING)
                .reason(req.reason())
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        saved.setPayment(paymentService.createPendingPayment(saved));
        return mapper.toDto(saved);
    }

    /** Core collision validation — doctor double-booking and room occupancy. */
    public void checkCollisions(Long doctorId, Room room, LocalDateTime start, LocalDateTime end, Long excludeId) {
        if (!end.isAfter(start)) {
            throw new BadRequestException("End time must be after start time");
        }
        if (appointmentRepository.existsDoctorOverlap(doctorId, start, end, BLOCKING, excludeId)) {
            throw new ConflictException("Doctor already has an appointment in this time slot");
        }
        if (room != null && appointmentRepository.existsRoomOverlap(room.getId(), start, end, BLOCKING, excludeId)) {
            throw new ConflictException("Room " + room.getRoomNumber() + " is occupied in this time slot");
        }
    }

    private void validateWithinWorkingHours(Doctor doctor, LocalDateTime start, LocalDateTime end) {
        if (start.toLocalTime().isBefore(doctor.getAvailableFrom())
                || end.toLocalTime().isAfter(doctor.getAvailableTo())) {
            throw new BadRequestException("Requested slot is outside the doctor's working hours ("
                    + doctor.getAvailableFrom() + " - " + doctor.getAvailableTo() + ")");
        }
    }

    /** Generates the doctor's slot grid for a date and marks each slot available or taken. */
    @Transactional(readOnly = true)
    public List<SlotDto> availableSlots(Long doctorId, LocalDate date) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", doctorId));

        LocalDateTime dayStart = date.atTime(doctor.getAvailableFrom());
        LocalDateTime dayEnd = date.atTime(doctor.getAvailableTo());
        List<Appointment> booked = appointmentRepository.findDoctorBookings(doctorId, dayStart, dayEnd, BLOCKING);

        List<SlotDto> slots = new ArrayList<>();
        LocalDateTime cursor = dayStart;
        while (!cursor.plusMinutes(doctor.getSlotMinutes()).isAfter(dayEnd)) {
            LocalDateTime slotEnd = cursor.plusMinutes(doctor.getSlotMinutes());
            final LocalDateTime s = cursor;
            boolean taken = booked.stream().anyMatch(a -> a.getStartTime().isBefore(slotEnd) && a.getEndTime().isAfter(s));
            boolean past = slotEnd.isBefore(LocalDateTime.now());
            slots.add(new SlotDto(cursor, slotEnd, !taken && !past));
            cursor = slotEnd;
        }
        return slots;
    }

    @Transactional(readOnly = true)
    public List<RoomDto> freeRooms(LocalDateTime start, LocalDateTime end) {
        List<Long> busy = appointmentRepository.findBusyRoomIds(start, end, BLOCKING);
        return roomRepository.findByActiveTrue().stream()
                .filter(r -> !busy.contains(r.getId()))
                .map(mapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> myAppointments(String patientEmail) {
        Patient patient = patientRepository.findByUserEmailIgnoreCase(patientEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found for " + patientEmail));
        return appointmentRepository.findByPatientIdOrderByStartTimeDesc(patient.getId())
                .stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> pendingQueue() {
        return appointmentRepository.findByStatusOrderByStartTimeAsc(AppointmentStatus.PENDING)
                .stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> all() {
        return appointmentRepository.findAllByOrderByStartTimeDesc().stream().map(mapper::toDto).toList();
    }

    @Transactional
    public AppointmentDto approve(Long id, Long roomId) {
        Appointment appointment = get(id);
        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new BadRequestException("Only pending requests can be approved");
        }
        if (roomId != null) {
            requireConsultationRoomForFirstVisit(appointment, roomId);
        }
        Room room = appointment.getRoom();
        if (roomId != null) {
            room = roomRepository.findById(roomId)
                    .orElseThrow(() -> new ResourceNotFoundException("Room", roomId));
        }
        checkCollisions(appointment.getDoctor().getId(), room,
                appointment.getStartTime(), appointment.getEndTime(), appointment.getId());
        appointment.setRoom(room);
        appointment.setStatus(AppointmentStatus.APPROVED);
        appointment.setAdminRemarks(null);
        return mapper.toDto(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentDto reject(Long id, String remarks) {
        Appointment appointment = get(id);
        if (appointment.getStatus() == AppointmentStatus.REJECTED) {
            throw new BadRequestException("Appointment is already rejected");
        }
        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setAdminRemarks(remarks);
        return mapper.toDto(appointmentRepository.save(appointment));
    }

    /**
     * A patient cannot cancel directly - they raise a request with a reason and the front
     * desk decides. The slot stays blocked until that decision is made.
     */
    @Transactional
    public AppointmentDto requestCancellation(Long id, String patientEmail, String reason) {
        Appointment appointment = get(id);
        if (!appointment.getPatient().getUser().getEmail().equalsIgnoreCase(patientEmail)) {
            throw new BadRequestException("You can only raise a request for your own appointments");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Completed appointments cannot be cancelled");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.REJECTED) {
            throw new BadRequestException("This appointment is already closed");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCEL_REQUESTED) {
            throw new BadRequestException("A cancellation request is already pending for this appointment");
        }
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("A reason is required when requesting cancellation");
        }
        appointment.setPrevStatus(appointment.getStatus());
        appointment.setStatus(AppointmentStatus.CANCEL_REQUESTED);
        appointment.setCancellationReason(reason.trim());
        appointment.setAdminRemarks("Cancellation requested by the patient - awaiting front-desk approval.");
        return mapper.toDto(appointmentRepository.save(appointment));
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> cancellationQueue() {
        return appointmentRepository
                .findByStatusInOrderByStartTimeAsc(List.of(AppointmentStatus.CANCEL_REQUESTED))
                .stream().map(mapper::toDto).toList();
    }

    /** Admin accepts the request: the appointment is cancelled and any payment refunded. */
    @Transactional
    public AppointmentDto approveCancellation(Long id) {
        Appointment appointment = get(id);
        if (appointment.getStatus() != AppointmentStatus.CANCEL_REQUESTED) {
            throw new BadRequestException("There is no pending cancellation request for this appointment");
        }
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setPrevStatus(null);
        appointment.setAdminRemarks(refundNote(appointment));
        return mapper.toDto(appointmentRepository.save(appointment));
    }

    /** Admin turns the request down: the appointment reverts to what it was. */
    @Transactional
    public AppointmentDto rejectCancellation(Long id, String remarks) {
        Appointment appointment = get(id);
        if (appointment.getStatus() != AppointmentStatus.CANCEL_REQUESTED) {
            throw new BadRequestException("There is no pending cancellation request for this appointment");
        }
        if (remarks == null || remarks.isBlank()) {
            throw new BadRequestException("Remarks are mandatory when turning down a cancellation request");
        }
        AppointmentStatus restored = appointment.getPrevStatus() != null
                ? appointment.getPrevStatus() : AppointmentStatus.PENDING;
        appointment.setStatus(restored);
        appointment.setPrevStatus(null);
        appointment.setAdminRemarks("Cancellation request declined: " + remarks.trim());
        return mapper.toDto(appointmentRepository.save(appointment));
    }

    /**
     * Cancelling a paid appointment triggers a refund, and the note explaining it is what
     * the patient sees in the remarks column.
     */
    private String refundNote(Appointment appointment) {
        Payment payment = appointment.getPayment();
        if (payment == null || payment.getStatus() != PaymentStatus.PAID) {
            return "Appointment cancelled. No payment had been collected.";
        }
        Payment refunded = paymentService.refund(appointment.getId());
        String destination = refunded.getCardLast4() != null
                ? "to the card ending " + refunded.getCardLast4()
                : "to the original payment method";
        return "Appointment cancelled. Refund of Rs " + refunded.getAmount() + " has been initiated "
                + destination + " (receipt " + refunded.getReceiptNo()
                + "). It reaches your account in 5-7 working days.";
    }

    @Transactional
    public int deleteMany(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BadRequestException("Select at least one appointment to delete");
        }
        int deleted = 0;
        for (Long id : ids) {
            appointmentRepository.delete(get(id));
            deleted++;
        }
        return deleted;
    }

    @Transactional
    public void delete(Long id) {
        appointmentRepository.delete(get(id));
    }

    /**
     * First-time visitors are seen in a consultation room; theatres, wards and ICU are for
     * patients who already have a history with the hospital.
     */
    private void requireConsultationRoomForFirstVisit(Appointment appointment, Long roomId) {
        boolean firstVisit = appointmentRepository.countByPatientIdAndStartTimeBefore(
                appointment.getPatient().getId(), appointment.getStartTime()) == 0;
        if (!firstVisit) {
            return;
        }
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room", roomId));
        if (room.getRoomType() != RoomType.CONSULTATION) {
            throw new BadRequestException(appointment.getPatient().getFullName()
                    + " is visiting for the first time - only a consultation room can be assigned");
        }
    }

    private Appointment get(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
    }
}
