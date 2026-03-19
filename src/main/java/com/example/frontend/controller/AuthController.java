package com.example.frontend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

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

    @GetMapping("/admin/admin-services")
    public String adminservices(Model model) {
        model.addAttribute("backendUrl", backendUrl);
        return "admin-services";
    }
}
