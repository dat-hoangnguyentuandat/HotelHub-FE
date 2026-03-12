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
}
