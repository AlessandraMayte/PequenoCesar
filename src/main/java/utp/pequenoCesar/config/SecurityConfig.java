package utp.pequenoCesar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import utp.pequenoCesar.config.jwt.JwtAuthenticationFilter;
import utp.pequenoCesar.config.jwt.JwtTokenProvider;
import utp.pequenoCesar.entity.Role;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String ROLE_CAJERO = Role.CAJERO.getAuthority();
    private static final String ROLE_COCINA = Role.COCINA.getAuthority();
    private static final String ROLE_GERENTE = Role.GERENTE.getAuthority();

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;

    public SecurityConfig(JwtTokenProvider jwtTokenProvider, CustomUserDetailsService customUserDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.customUserDetailsService = customUserDetailsService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        var provider = new org.springframework.security.authentication.dao.DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(List.of(provider));
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/dashboard", "/inventario", "/recetas", "/pedidos", "/mis-pedidos", "/cocina-pedidos", "/ordenes", "/proveedores", "/clientes", "/reportes", "/reportes-pedidos", "/empleados", "/css/**", "/js/**", "/imagenes/**", "/favicon.ico").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/register").hasAuthority(ROLE_GERENTE)
                .requestMatchers(HttpMethod.GET, "/api/clientes/**").hasAnyAuthority(ROLE_CAJERO, ROLE_GERENTE)
                .requestMatchers(HttpMethod.POST, "/api/clientes/**").hasAnyAuthority(ROLE_CAJERO, ROLE_GERENTE)
                .requestMatchers(HttpMethod.PUT, "/api/clientes/**").hasAnyAuthority(ROLE_CAJERO, ROLE_GERENTE)
                .requestMatchers("/api/clientes/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers("/api/alertas/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers("/api/ordenes/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers("/api/reportes/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers(HttpMethod.GET, "/api/reniec/**").hasAnyAuthority(ROLE_CAJERO, ROLE_GERENTE)
                .requestMatchers(HttpMethod.GET, "/api/inventario/**").hasAnyAuthority(ROLE_GERENTE, ROLE_COCINA)
                .requestMatchers(HttpMethod.PUT, "/api/inventario/*/stock").hasAnyAuthority(ROLE_GERENTE, ROLE_COCINA)
                .requestMatchers("/api/inventario/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers(HttpMethod.GET, "/api/recetas/**").hasAnyAuthority(ROLE_CAJERO, ROLE_COCINA, ROLE_GERENTE)
                .requestMatchers("/api/recetas/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers(HttpMethod.GET, "/api/pedidos/**").hasAnyAuthority(ROLE_CAJERO, ROLE_COCINA)
                .requestMatchers(HttpMethod.PUT, "/api/pedidos/*/estado").hasAnyAuthority(ROLE_CAJERO, ROLE_COCINA)
                .requestMatchers("/api/pedidos/**").hasAuthority(ROLE_CAJERO)
                .requestMatchers("/api/proveedores/**").hasAuthority(ROLE_GERENTE)
                .requestMatchers("/api/empleados/**").hasAuthority(ROLE_GERENTE)
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
