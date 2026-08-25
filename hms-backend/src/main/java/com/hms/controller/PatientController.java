package com.hms.controller;

import com.hms.dto.*;
import com.hms.service.AppointmentService;
import com.hms.service.AuthService;
import com.hms.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
public class PatientController {

    private final AuthService authService;
    private final AppointmentService appointmentService;
    private final PaymentService paymentService;

    @GetMapping("/profile")
    public PatientDto profile(@AuthenticationPrincipal UserDetails user) {
        return authService.profile(user.getUsername());
    }

    @PutMapping("/profile")
    public PatientDto updateProfile(@AuthenticationPrincipal UserDetails user,
                                    @Valid @RequestBody PatientRequest req) {
        return authService.updateProfile(user.getUsername(), req);
    }

    @GetMapping("/appointments")
    public List<AppointmentDto> myAppointments(@AuthenticationPrincipal UserDetails user) {
        return appointmentService.myAppointments(user.getUsername());
    }

    @PostMapping("/appointments")
    public AppointmentDto book(@AuthenticationPrincipal UserDetails user,
                               @Valid @RequestBody AppointmentRequest req) {
        return appointmentService.book(user.getUsername(), req);
    }

    /** Patients raise a cancellation request with a reason; the front desk decides. */
    @PatchMapping("/appointments/{id}/cancel-request")
    public AppointmentDto requestCancellation(@AuthenticationPrincipal UserDetails user,
                                              @PathVariable Long id,
                                              @Valid @RequestBody RemarksRequest req) {
        return appointmentService.requestCancellation(id, user.getUsername(), req.remarks());
    }

    @PostMapping("/appointments/{id}/pay")
    public ReceiptDto pay(@AuthenticationPrincipal UserDetails user,
                          @PathVariable Long id,
                          @Valid @RequestBody CardPaymentRequest card) {
        return paymentService.pay(id, card, user.getUsername());
    }

    @GetMapping("/appointments/{id}/receipt")
    public ReceiptDto receipt(@PathVariable Long id) {
        return paymentService.receipt(id);
    }

    @GetMapping("/rooms/free")
    public List<RoomDto> freeRooms(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return appointmentService.freeRooms(start, end);
    }
}
