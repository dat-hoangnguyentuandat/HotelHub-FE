package com.example.frontend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class AuthController {

    @Value("${app.backend.url}")
    private String backendUrl;

    @GetMapping("/register")
    public String register(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "register";
    }

    @GetMapping("/login")
    public String login(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "login";
    }

    @GetMapping({"/", "/booking"})
    public String booking(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "booking";
    }

    @GetMapping("/rooms")
    public String rooms(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "rooms";
    }

    @GetMapping("/admin/rooms")
    public String adminRooms(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-rooms";
    }

    @GetMapping("/admin/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "dashboard";
    }

    @GetMapping("/admin/staff")
    public String staff(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-staff";
    }

    @GetMapping("/admin/bookings")
    public String adminBookings(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-bookings";
    }

    @GetMapping("/admin/special-requests")
    public String adminSpecialRequests(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-special-requests";
    }

    @GetMapping("/loyal-customers")
    public String loyalcustomers(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "loyal-customers";
    }

    @GetMapping("/admin/cancellation")
    public String adminCancellation(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-cancellation";
    }

    @GetMapping("/admin/customers")
    public String adminCustomers(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-customers";
    }

    @GetMapping("/admin/admin-services")
    public String adminservices(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-services";
    }

    @GetMapping("/admin/service-bookings")
    public String adminServiceBookings(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-service-bookings";
    }

    @GetMapping("/payment")
    public String payment(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "payment";
    }

    @GetMapping("/payment-info")
    public String paymentinfo(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "payment-info";
    }

    @GetMapping("/admin/admin-customers")
    public String admincustomers(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-customers";
    }

    @GetMapping("/services")
    public String services(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "services";
    }

    @GetMapping("/reviews")
    public String reviews(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "reviews";
    }

    @GetMapping("/admin/admin-reviews")
    public String adminreviews(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-reviews";
    }

    @GetMapping("/admin/vouchers")
    public String adminVouchers(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-vouchers";
    }

    @GetMapping("/admin/reports")
    public String adminReports(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-report";
    }

    @GetMapping("/admin/bookings/{id}")
    public String adminBookingDetail(@PathVariable Long id, Model model) {
        model.addAttribute("backendUrl", backendUrl);
        model.addAttribute("bookingId", id);
        return "admin-booking-detail";
    }

    @GetMapping("/admin/group-bookings")
    public String adminGroupBookings(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-group-bookings";
    }

    @GetMapping("/admin/group-bookings/{id}")
    public String adminGroupBookingDetail(@PathVariable Long id, Model model) {
        model.addAttribute("backendUrl", backendUrl);
        model.addAttribute("groupBookingId", id);
        return "admin-group-booking-detail";
    }
}
