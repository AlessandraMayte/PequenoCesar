package utp.pequenoCesar.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import utp.pequenoCesar.config.jwt.JwtTokenProvider;
import utp.pequenoCesar.dto.request.LoginRequest;
import utp.pequenoCesar.dto.request.EmpleadoRequest;
import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.AuthResponse;
import utp.pequenoCesar.entity.Empleado;
import utp.pequenoCesar.repository.EmpleadoRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmpleadoRepository empleadoRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDto<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUser(), request.getContrasena())
        );

        Empleado empleado = empleadoRepository.findByUser(request.getUser())
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        String token = jwtTokenProvider.generateToken(empleado.getUser(), empleado.getRol(), empleado.getIdEmpleado());

        AuthResponse authResponse = AuthResponse.builder()
                .token(token)
                .idEmpleado(empleado.getIdEmpleado())
                .nombre(fullName(empleado))
                .user(empleado.getUser())
                .nombres(empleado.getNombres())
                .apellidos(empleado.getApellidos())
                .rol(empleado.getRol())
                .expiresInMs(jwtTokenProvider.getExpirationMillis())
                .build();

        return ResponseEntity.ok(ApiResponseDto.<AuthResponse>builder()
                .success(true)
                .message("Login exitoso")
                .data(authResponse)
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDto<AuthResponse>> register(@Valid @RequestBody EmpleadoRequest request) {
        if (empleadoRepository.existsByUser(request.getUser())) {
            return ResponseEntity.badRequest().body(ApiResponseDto.<AuthResponse>builder()
                    .success(false)
                    .message("El usuario del empleado ya existe")
                    .build());
        }

        Empleado empleado = Empleado.builder()
                .nombres(request.getNombres())
                .apellidos(request.getApellidos())
                .user(request.getUser())
                .rol(request.getRol())
                .estado("inactivo".equalsIgnoreCase(request.getEstado()) ? "Inactivo" : "Activo")
                .contrasena(passwordEncoder.encode(request.getContrasena()))
                .build();

        empleado = empleadoRepository.save(empleado);

        String token = jwtTokenProvider.generateToken(empleado.getUser(), empleado.getRol(), empleado.getIdEmpleado());

        AuthResponse authResponse = AuthResponse.builder()
                .token(token)
                .idEmpleado(empleado.getIdEmpleado())
                .nombre(fullName(empleado))
                .user(empleado.getUser())
                .nombres(empleado.getNombres())
                .apellidos(empleado.getApellidos())
                .rol(empleado.getRol())
                .expiresInMs(jwtTokenProvider.getExpirationMillis())
                .build();

        return ResponseEntity.ok(ApiResponseDto.<AuthResponse>builder()
                .success(true)
                .message("Empleado registrado exitosamente")
                .data(authResponse)
                .build());
    }

    private String fullName(Empleado empleado) {
        String nombres = empleado.getNombres() == null ? "" : empleado.getNombres();
        String apellidos = empleado.getApellidos() == null ? "" : empleado.getApellidos();
        return String.join(" ", nombres, apellidos).trim();
    }
}
