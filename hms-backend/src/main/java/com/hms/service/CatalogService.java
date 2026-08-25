package com.hms.service;

import com.hms.dto.*;
import com.hms.entity.Department;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.Room;
import com.hms.entity.enums.AppointmentStatus;
import com.hms.entity.enums.PatientStatus;
import com.hms.exception.BadRequestException;
import com.hms.exception.ResourceNotFoundException;
import com.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final RoomRepository roomRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final Mapper mapper;

    // ---------- Doctors ----------
    @Transactional(readOnly = true)
    public List<DoctorDto> doctors(Long departmentId, String q) {
        List<Doctor> list;
        if (q != null && !q.isBlank()) {
            list = doctorRepository.search(q.trim());
        } else if (departmentId != null) {
            list = doctorRepository.findByDepartmentIdAndActiveTrue(departmentId);
        } else {
            list = doctorRepository.findByActiveTrue();
        }
        return list.stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<DoctorDto> allDoctors() {
        return doctorRepository.findAll().stream().map(mapper::toDto).toList();
    }

    @Transactional
    public DoctorDto createDoctor(DoctorRequest req) {
        Doctor doctor = new Doctor();
        applyDoctor(doctor, req);
        return mapper.toDto(doctorRepository.save(doctor));
    }

    @Transactional
    public DoctorDto updateDoctor(Long id, DoctorRequest req) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
        applyDoctor(doctor, req);
        return mapper.toDto(doctorRepository.save(doctor));
    }

    private void applyDoctor(Doctor doctor, DoctorRequest req) {
        Department department = departmentRepository.findById(req.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department", req.departmentId()));
        if (!req.availableTo().isAfter(req.availableFrom())) {
            throw new BadRequestException("Availability end time must be after start time");
        }
        doctor.setDepartment(department);
        doctor.setFullName(req.fullName());
        doctor.setSpecialty(req.specialty());
        doctor.setQualification(req.qualification());
        doctor.setPhone(req.phone());
        doctor.setYearsExperience(req.yearsExperience());
        doctor.setConsultationFee(req.consultationFee());
        doctor.setSlotMinutes(req.slotMinutes());
        doctor.setAvailableFrom(req.availableFrom());
        doctor.setAvailableTo(req.availableTo());
        doctor.setActive(req.active());
    }

    private static final List<AppointmentStatus> LIVE = List.of(
            AppointmentStatus.PENDING, AppointmentStatus.APPROVED, AppointmentStatus.CANCEL_REQUESTED);

    @Transactional
    public void deleteDoctor(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
        if (appointmentRepository.existsByDoctorIdAndStatusInAndEndTimeAfter(id, LIVE, LocalDateTime.now())) {
            throw new BadRequestException("A patient is already linked to " + doctor.getFullName()
                    + " - this doctor cannot be deactivated until those appointments are completed or cancelled");
        }
        doctor.setActive(false);
        doctorRepository.save(doctor);
    }

    // ---------- Departments ----------
    @Transactional(readOnly = true)
    public List<DepartmentDto> departments(boolean onlyActive) {
        List<Department> list = onlyActive ? departmentRepository.findByActiveTrue() : departmentRepository.findAll();
        return list.stream()
                .map(d -> mapper.toDto(d, doctorRepository.findByDepartmentIdAndActiveTrue(d.getId()).size()))
                .toList();
    }

    @Transactional
    public DepartmentDto createDepartment(DepartmentRequest req) {
        if (departmentRepository.existsByNameIgnoreCase(req.name())) {
            throw new BadRequestException("A department with this name already exists");
        }
        Department dep = Department.builder()
                .name(req.name()).description(req.description()).active(req.active()).build();
        return mapper.toDto(departmentRepository.save(dep), 0);
    }

    @Transactional
    public DepartmentDto updateDepartment(Long id, DepartmentRequest req) {
        Department dep = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id));
        dep.setName(req.name());
        dep.setDescription(req.description());
        dep.setActive(req.active());
        return mapper.toDto(departmentRepository.save(dep),
                doctorRepository.findByDepartmentIdAndActiveTrue(id).size());
    }

    @Transactional
    public void deleteDepartment(Long id) {
        Department dep = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id));
        if (!doctorRepository.findByDepartmentIdAndActiveTrue(id).isEmpty()) {
            throw new BadRequestException("Cannot delete a department that still has active doctors");
        }
        departmentRepository.delete(dep);
    }

    // ---------- Rooms ----------
    @Transactional(readOnly = true)
    public List<RoomDto> rooms(boolean onlyActive) {
        List<Room> list = onlyActive ? roomRepository.findByActiveTrue() : roomRepository.findAll();
        return list.stream().map(mapper::toDto).toList();
    }

    @Transactional
    public RoomDto createRoom(RoomRequest req) {
        if (roomRepository.existsByRoomNumberIgnoreCase(req.roomNumber())) {
            throw new BadRequestException("Room number already exists");
        }
        Room room = Room.builder()
                .roomNumber(req.roomNumber()).roomType(req.roomType())
                .floorNo(req.floorNo()).active(req.active()).build();
        return mapper.toDto(roomRepository.save(room));
    }

    @Transactional
    public RoomDto updateRoom(Long id, RoomRequest req) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", id));
        room.setRoomNumber(req.roomNumber());
        room.setRoomType(req.roomType());
        room.setFloorNo(req.floorNo());
        room.setActive(req.active());
        return mapper.toDto(roomRepository.save(room));
    }

    @Transactional
    public void deleteRoom(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room", id));
        if (appointmentRepository.existsByRoomIdAndStatusInAndEndTimeAfter(id, LIVE, LocalDateTime.now())) {
            throw new BadRequestException("A patient is already booked into room " + room.getRoomNumber()
                    + " - this room cannot be deactivated until that appointment is completed or cancelled");
        }
        room.setActive(false);
        roomRepository.save(room);
    }

    // ---------- Patients ----------
    /**
     * Lists patients, first discharging anyone who is still marked ADMITTED but whose
     * last appointment has already finished.
     */
    @Transactional
    public List<PatientDto> patients() {
        LocalDateTime now = LocalDateTime.now();
        List<Patient> all = patientRepository.findAll();
        for (Patient p : all) {
            if (p.getStatus() == PatientStatus.ADMITTED
                    && !appointmentRepository.existsByPatientIdAndEndTimeAfter(p.getId(), now)) {
                p.setStatus(PatientStatus.DISCHARGED);
                patientRepository.save(p);
            }
        }
        return all.stream().map(mapper::toDto).toList();
    }

    @Transactional
    public PatientDto updatePatientStatus(Long id, PatientStatus status) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", id));
        if (status == PatientStatus.ADMITTED
                && !appointmentRepository.existsByPatientIdAndEndTimeAfter(patient.getId(), LocalDateTime.now())) {
            throw new BadRequestException(
                    "A patient can only be admitted against an appointment that has not finished yet");
        }
        patient.setStatus(status);
        return mapper.toDto(patientRepository.save(patient));
    }

    @Transactional
    public int deletePatients(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BadRequestException("Select at least one patient to delete");
        }
        int deleted = 0;
        for (Long id : ids) {
            Patient patient = patientRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient", id));
            patientRepository.delete(patient);
            deleted++;
        }
        return deleted;
    }

    @Transactional
    public PatientDto updatePatient(Long id, PatientRequest req) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", id));
        patient.setFullName(req.fullName());
        patient.setPhone(req.phone());
        patient.setDateOfBirth(req.dateOfBirth());
        patient.setGender(req.gender());
        patient.setBloodGroup(req.bloodGroup());
        patient.setAddress(req.address());
        return mapper.toDto(patientRepository.save(patient));
    }

    @Transactional
    public void deletePatient(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", id));
        patientRepository.delete(patient);
    }
}
