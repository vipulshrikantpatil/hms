package com.hms.repository;

import com.hms.entity.Appointment;
import com.hms.entity.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByStatusOrderByStartTimeAsc(AppointmentStatus status);

    List<Appointment> findByPatientIdOrderByStartTimeDesc(Long patientId);

    List<Appointment> findByDoctorIdOrderByStartTimeDesc(Long doctorId);

    List<Appointment> findAllByOrderByStartTimeDesc();

    /** True while the patient still has a visit that has not finished yet. */
    boolean existsByPatientIdAndEndTimeAfter(Long patientId, LocalDateTime moment);

    /** Appointments this patient had before the given moment - 0 means a first-time visitor. */
    long countByPatientIdAndStartTimeBefore(Long patientId, LocalDateTime moment);

    List<Appointment> findByStatusInOrderByStartTimeAsc(Collection<AppointmentStatus> statuses);

    /** Live bookings still attached to a doctor - blocks deactivation. */
    boolean existsByDoctorIdAndStatusInAndEndTimeAfter(Long doctorId,
                                                       Collection<AppointmentStatus> statuses,
                                                       LocalDateTime moment);

    /** Live bookings still occupying a room - blocks deactivation. */
    boolean existsByRoomIdAndStatusInAndEndTimeAfter(Long roomId,
                                                     Collection<AppointmentStatus> statuses,
                                                     LocalDateTime moment);

    @Query("""
            select (count(a) > 0) from Appointment a
            where a.doctor.id = :doctorId
              and a.status in :statuses
              and a.id <> :excludeId
              and a.startTime < :end and a.endTime > :start
            """)
    boolean existsDoctorOverlap(@Param("doctorId") Long doctorId,
                                @Param("start") LocalDateTime start,
                                @Param("end") LocalDateTime end,
                                @Param("statuses") Collection<AppointmentStatus> statuses,
                                @Param("excludeId") Long excludeId);

    @Query("""
            select (count(a) > 0) from Appointment a
            where a.room.id = :roomId
              and a.status in :statuses
              and a.id <> :excludeId
              and a.startTime < :end and a.endTime > :start
            """)
    boolean existsRoomOverlap(@Param("roomId") Long roomId,
                              @Param("start") LocalDateTime start,
                              @Param("end") LocalDateTime end,
                              @Param("statuses") Collection<AppointmentStatus> statuses,
                              @Param("excludeId") Long excludeId);

    @Query("""
            select a from Appointment a
            where a.doctor.id = :doctorId
              and a.status in :statuses
              and a.startTime < :end and a.endTime > :start
            """)
    List<Appointment> findDoctorBookings(@Param("doctorId") Long doctorId,
                                         @Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end,
                                         @Param("statuses") Collection<AppointmentStatus> statuses);

    @Query("""
            select a.room.id from Appointment a
            where a.room is not null
              and a.status in :statuses
              and a.startTime < :end and a.endTime > :start
            """)
    List<Long> findBusyRoomIds(@Param("start") LocalDateTime start,
                               @Param("end") LocalDateTime end,
                               @Param("statuses") Collection<AppointmentStatus> statuses);
}
