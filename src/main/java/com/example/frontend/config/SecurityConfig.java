package com.example.frontend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cấu hình Spring Security cho module Frontend.
 *
 * <p>Frontend sử dụng JWT do backend cấp (lưu ở localStorage) nên không cần
 * session-based authentication tại đây. Security được bật chủ yếu để:
 * <ul>
 *   <li>Kích hoạt Thymeleaf Security Dialect ({@code sec:authorize}, {@code sec:authentication})</li>
 *   <li>Cung cấp CSRF token cho các form Thymeleaf nếu cần</li>
 *   <li>Sẵn sàng mở rộng thêm server-side access control sau này</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Cho phép tất cả request đi qua (xác thực thực sự do backend JWT xử lý)
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            )
            // Tắt form login mặc định của Spring Security
            .formLogin(form -> form.disable())
            // Tắt HTTP Basic
            .httpBasic(basic -> basic.disable())
            // Giữ CSRF bật để hỗ trợ ${_csrf} trong Thymeleaf form
            // (dùng cho các form POST nếu sau này cần)
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")
            );

        return http.build();
    }
}
