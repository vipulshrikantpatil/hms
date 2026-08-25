package com.hms.repository;

import com.hms.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    List<Doctor> findByActiveTrue();

    List<Doctor> findByDepartmentIdAndActiveTrue(Long departmentId);

    @Query("""
            select d from Doctor d
            where d.active = true and (
                  lower(d.fullName) like lower(concat('%', :q, '%'))
               or lower(d.specialty) like lower(concat('%', :q, '%'))
               or lower(d.department.name) like lower(concat('%', :q, '%')))
            """)
    List<Doctor> search(@Param("q") String q);
}
